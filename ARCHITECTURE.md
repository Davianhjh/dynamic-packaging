# 系统架构说明

## 1. 整体架构

```mermaid
flowchart TB
    subgraph Browser["浏览器端"]
        subgraph PackApp["装箱应用 (React + react-three-fiber)"]
            UI3D["3D 装箱场景<br/>R3F + drei + react-spring"]
            ProdList["商品列表 + dnd-kit 拖拽"]
            Worker["Web Worker<br/>启发式装箱 (TS)"]
            ProdList -->|加入商品| Worker
            Worker -->|即时布局| UI3D
            UI3D -.->|共享状态 Zustand| ProdList
        end
        AdminApp["管理后台 (React + Ant Design)<br/>商品录入 / 库存 / 上下架"]
    end

    subgraph Backend["后端 FastAPI 模块化单体"]
        Auth["auth<br/>JWT / 角色"]
        Catalog["catalog<br/>商品 / 库存 / 上下架"]
        Solver["solver<br/>3D 装箱最优求解<br/>进程池, 时间受限"]
        Manifest["manifest<br/>清单保存 / 确认 / 导出<br/>★ 确认时做库存校验"]
    end

    subgraph Data["数据与基础设施"]
        PG[("PostgreSQL<br/>商品 / 库存 / 装箱记录")]
        Redis[("Redis<br/>求解缓存 / 队列")]
        OSS[("对象存储 S3 / MinIO<br/>商品缩略图")]
    end

    AdminApp -->|CRUD| Catalog
    PackApp -->|加载上架商品| Catalog
    Worker -.->|装不下时整批请求最优解| Solver
    Solver -->|返回最优布局| UI3D
    PackApp -->|确认清单| Manifest

    Catalog --> PG
    Catalog --> OSS
    Solver --> Redis
    Manifest --> PG
    Manifest -->|确认时校验库存| Catalog
    Auth --- Catalog
    Auth --- Manifest
```

## 2. 组件职责

| 组件 | 职责 |
| --- | --- |
| 装箱应用 (packing-web) | 3D 展示箱体与物品码放、商品列表拖拽、即时占用率/剩余空间、调用后端求最优解、生成并导出清单 |
| 管理后台 (admin-web) | 商品录入与编辑、缩略图上传、库存维护、上下架状态管理 |
| Web Worker | 在浏览器内运行启发式装箱，余量充足时即时给出摆放位置，不阻塞 UI 线程 |
| auth | 登录鉴权、JWT 签发、装箱端与管理端的角色区分 |
| catalog | 商品 CRUD、库存、上下架；对外提供"上架商品列表"与"库存校验" |
| solver | 时间受限的 3D 装箱最优（近优）求解，跑在进程池/Celery worker，结果写 Redis 缓存 |
| manifest | 保存装箱清单、确认时做库存校验、导出纯文本清单 |
| PostgreSQL | 商品、库存、保存的装箱记录 |
| Redis | 求解结果缓存（按"商品集合+箱体"为 key）、可选作为任务队列 broker |
| 对象存储 | 商品缩略图（不入库），配 CDN 加速 |

## 3. 混合装箱算法：handoff 时序

余量充足时由前端启发式即时摆放；当启发式判断"放不下"时，把**已选的全部商品 + 这件新商品整批**发给后端重新求最优布局——能全部放下就返回新布局并触发重排，连最优解都放不下才算真正"装满"。

```mermaid
sequenceDiagram
    participant U as 用户
    participant FE as 装箱前端
    participant W as Web Worker (启发式)
    participant BE as 后端 solver
    participant R as Redis 缓存

    U->>FE: 拖入商品 A
    FE->>W: 加入 A, 请求摆放
    W-->>FE: 即时布局 + 占用率
    FE-->>U: 3D 渲染 + 剩余空间

    Note over U,W: 余量充足时循环以上步骤

    U->>FE: 拖入商品 N
    FE->>W: 加入 N, 请求摆放
    W-->>FE: 启发式判断: 放不下
    FE->>BE: 整批(已选商品 + N)请求最优解
    BE->>R: 查缓存
    alt 命中缓存
        R-->>BE: 返回布局
    else 未命中
        BE->>BE: 时间受限求解 (2~3s)
        BE->>R: 写入缓存
    end
    BE-->>FE: 最优布局 + 能否全部放下
    alt 可以放下
        FE-->>U: 重排动画 + 更新清单
    else 仍放不下
        FE-->>U: 提示"已装满"
    end
```

**要点：**
- 后端求解是"重排整批"而非"只摆这一件"——启发式的"放不下"只是局部贪心结论，换排布可能就放下了。
- "最优解"实际是**时间受限内的近优解**（设 2~3s 上限）。装箱属 NP-hard，真正最优只在极小规模可解；触发点在"快满时"，规模被箱体容量天然限制，时间受限求解足够。
- 求解**不要跑在 API 请求线程里**，放进程池/Celery worker，避免堵塞接口。
- 后端返回的最优布局可能与前端启发式布局不同，物品会移动；前端用 react-spring 做位置过渡动画，平滑展示"重新码放"。

## 4. 确认装箱清单流程（库存只在此校验）

```mermaid
sequenceDiagram
    participant U as 用户
    participant FE as 装箱前端
    participant M as manifest 模块
    participant C as catalog 模块

    U->>FE: 点击"确认清单"
    FE->>M: 提交清单 (商品类型 + 数量)
    M->>C: 校验各商品当前库存是否充足
    alt 库存充足
        C-->>M: 通过
        M->>M: 保存装箱记录
        M-->>FE: 确认成功
        FE-->>U: 可导出纯文本清单
    else 库存不足
        C-->>M: 返回不足的商品
        M-->>FE: 校验失败 + 冲突明细
        FE-->>U: 提示并允许修改后重新确认
    end
```

装箱过程中**不做实时库存判断**，纯几何计算；只有在最终确认时由 manifest 向 catalog 做一次性校验。是否在确认成功后扣减/预占库存，是一个待定的业务开关（默认仅记录、不扣减）。

## 5. 贯穿前后端的共享契约

整个混合算法能不出错的地基，是一份前后端共用的"摆放契约"：统一坐标系、单位、placement 数据结构和箱体尺寸定义。前端 TS 启发式与后端 Python 求解器实现同一份 schema，使两端布局可互换。

- 单位：毫米 (mm)，体积单位 mm³
- 坐标原点：箱体某一底角；x 沿长、y 沿宽、z 沿高(向上)
- `position` 表示物品轴对齐包围盒的最小角坐标
- 旋转：最多 6 种轴对齐朝向，用 `rotationType: 0..5` 表示

具体定义见 `packing-contract.ts`（前端）与 `packing_contract.py`（后端），两份必须保持同步。
