# CLAUDE.md

供 Claude Code 阅读的项目指南。开工前请先读 `ARCHITECTURE.md` 与 `技术选型说明.md`。

## 项目简介

物品动态装箱展示系统。用户把商品从列表拖入固定尺寸箱子，实时看到 3D 码放、占用与剩余空间；
装箱用前后端混合算法；最终生成可确认/导出的纯文本清单。另含一个商品管理后台。

## 目录结构（建议 monorepo）

```
/
├─ apps/
│  ├─ packing-web/        # 装箱应用: React + react-three-fiber
│  └─ admin-web/          # 管理后台: React + Ant Design
├─ packages/
│  └─ contract/           # 前端共享契约 (packing-contract.ts)
├─ server/                # 后端: FastAPI 模块化单体
│  └─ app/
│     ├─ auth/            # JWT / 角色
│     ├─ catalog/         # 商品 / 库存 / 上下架 (含库存校验接口)
│     ├─ solver/          # 3D 装箱最优求解 (进程池, 时间受限)
│     ├─ manifest/        # 清单保存 / 确认 / 导出
│     └─ contract/        # 后端共享契约 (packing_contract.py)
├─ docker-compose.yml     # postgres / redis / minio
├─ ARCHITECTURE.md
├─ 技术选型说明.md
├─ IMPLEMENTATION_PLAN.md
└─ CLAUDE.md
```

前端用 pnpm workspaces 管理 `apps/*` 与 `packages/*`；后端 `server/` 为独立 Python 项目。

## 核心约定（最重要，违反会导致前后端布局错位）

1. **共享契约**：`packages/contract/packing-contract.ts` 与 `server/app/contract/packing_contract.py`
   是同一份摆放 schema 的两端实现，**必须保持同步**。改其一必改其二。
2. **单位**：所有尺寸用毫米 (mm)，体积 mm³。
3. **坐标系**：原点在箱体某一底角；x 沿长、y 沿宽、z 沿高(向上)。
   `position` 是物品轴对齐包围盒的最小角坐标。
4. **旋转**：物品最多 6 种轴对齐朝向，用 `rotationType / rotation_type` 0..5 表示。

## 关键设计决策（写代码时遵守）

- **3D 渲染**：react-three-fiber + drei；同类商品用 `<Instances>` 实例化；
  布局变更用 react-spring 做位置过渡动画。
- **拖拽**：dnd-kit 只在 DOM 层完成；drop 仅触发“加入商品”动作，摆放位置一律由算法决定，
  不要尝试在 WebGL 画布内直接拖动物品。
- **混合算法**：
  - 余量充足 → Web Worker 内的启发式即时摆放（不阻塞 UI）。
  - 启发式判断放不下 → 把“已选全部商品 + 新商品”整批发后端 solver 求最优。
  - 后端 solver 是**重排整批**，不是只摆一件。
  - “最优”= 时间受限 (默认 2~3s) 内的近优解；NP-hard，不追求真正最优。
  - solver 跑在进程池 / Celery worker，**绝不**在 API 请求线程内同步计算。
  - 结果按“商品集合 + 箱体”为 key 缓存到 Redis。
- **库存**：装箱过程**不**做实时库存判断（纯几何）。
  **仅**在 manifest 确认清单时，由 manifest 向 catalog 做一次性库存校验。
  确认成功后是否扣减/预占库存为待定业务开关，默认仅记录不扣减。
- **导出**：仅商品类型 + 数量的纯文本清单，前端生成即可。
- **缩略图**：存对象存储 (S3/MinIO)，不入 PostgreSQL。

## 技术栈速查

| 层 | 选型 |
| --- | --- |
| 装箱前端 | React + TS + Vite + react-three-fiber/drei + react-spring + dnd-kit + Zustand + Tailwind |
| 管理后台 | React + Ant Design |
| 后端 | FastAPI + SQLAlchemy + Alembic + pydantic v2 |
| 求解 | py3dbp 或自定义 EP/元启发式，进程池 / Celery |
| 数据 | PostgreSQL + Redis + 对象存储(S3/MinIO) |
| 部署 | Docker / docker-compose |

## 常用命令（脚手架搭好后按实际调整）

```bash
# 前端
pnpm install
pnpm --filter packing-web dev
pnpm --filter admin-web dev

# 后端
cd server
uv sync                 # 或 pip install -e .
alembic upgrade head    # 数据库迁移
uvicorn app.main:app --reload

# 基础设施
docker compose up -d    # postgres / redis / minio
```

## 编码规范

- 前端 TypeScript 全量类型，ESLint + Prettier。
- 后端 pydantic v2 模型做边界校验，类型注解齐全，ruff + mypy。
- 求解器对外只暴露一个纯函数式接口 `solve(request: PackRequest) -> PackResult`，
  内部实现可替换；便于将来抽成独立微服务。
- API 无状态；计算结果走 Redis 缓存而非进程内状态。

## 易错点

- 改了一端契约忘了同步另一端 → 布局错位。
- 把求解放进 API 请求线程 → 高负载时接口被堵死。
- 在 3D 画布里直接拖物品 → DOM↔WebGL 坐标同步泥潭；正确做法是 DOM 拖拽 + 算法摆放。
- 误把库存判断塞进装箱过程 → 违反“仅确认时校验”的决策。
