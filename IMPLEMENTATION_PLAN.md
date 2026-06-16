# 实施计划

按阶段推进，每阶段结束应可独立验证。Claude Code 可逐阶段领取任务。

## Phase 0 · 基础设施与契约

- [x] 建立 monorepo 骨架（pnpm workspaces：`apps/*`、`packages/*`；`server/` 独立 Python 项目）。
- [x] 放入共享契约 `packages/contract/src/packing-contract.ts` 与 `server/app/contract/packing_contract.py`。
- [x] `docker-compose.yml` 起 postgres / redis / minio。
- [x] 后端 FastAPI 骨架（`app/main.py`、模块目录、健康检查接口）。
- [x] 前端两个 Vite 应用骨架。

## Phase 1 · 商品管理（catalog + admin-web）

- [x] catalog 数据模型：商品(含近似长宽高)、库存、上下架状态、缩略图 URL。
- [x] Alembic 迁移。
- [x] catalog REST：商品 CRUD、上下架、库存维护、**对内库存校验接口**、上架商品列表。
- [x] 缩略图上传到 MinIO。
- [x] auth：登录、JWT、管理端/装箱端角色。
- [x] admin-web：商品表格 + 录入/编辑表单 + 图片上传 + 库存与上下架管理 (Ant Design)。

## Phase 2 · 装箱前端骨架（packing-web）

- [x] R3F 场景：固定尺寸箱体、坐标轴、相机控制(OrbitControls)。
- [x] 商品列表面板：缩略图、名称、近似长宽高；从 catalog 拉上架商品。
- [x] Zustand store：已选商品、当前布局、占用率/剩余空间。
- [x] dnd-kit：从列表拖入箱体区域，drop 触发“加入商品”。
- [x] Web Worker：实现启发式装箱（支撑约束式重力 + 6 朝向旋转），输入/输出严格按契约。
- [x] 用 `<Instances>` 渲染已摆放物品；占用率与剩余空间实时显示。

## Phase 3 · 后端求解与 handoff

- [x] solver 模块：`solve(request) -> result`，时间受限多策略近优（自定义，复用支撑约束 packer）。
- [x] solver 跑进程池（`ProcessPoolExecutor`，未起池回退线程）；POST 求解接口同步等待 + 硬超时(504)。
- [x] Redis 按“商品集合 + 箱体”缓存求解结果（不可用时静默跳过）。
- [x] 前端 handoff：启发式判定放不下 → 整批请求后端 → loading 态 → 渲染返回布局。
- [x] 重排/下落过渡动画（实例化下用 useFrame 逐帧插值，效果等价 react-spring）；放不下时提示“已装满”。

## Phase 4 · 清单确认、库存校验与导出

- [x] manifest 模块：保存装箱记录；**确认时**调 catalog 做一次性库存校验（迁移 0002_manifest）。
- [x] 库存不足返回 409 冲突明细，前端允许修改后重新确认。
- [x] 确认成功后**仅记录、不扣减/预占**库存（按已确认决策）。
- [x] 前端生成并导出纯文本清单（类型 + 数量）。

## Phase 5 · 打磨

- [ ] 求解结果缓存命中率、超时与降级（超时返回当前最好启发式结果）。
- [ ] 错误处理、加载与空态、权限边界。
- [ ] 性能：实例化渲染、大量商品列表虚拟滚动。
- [ ] （可选）物品旋转交互展示、求解异步化(WebSocket 推送)。

## 已确认业务决策（2026-06-16）

- **物品旋转**：允许，6 种轴对齐朝向（`rotationType 0..5`），即长宽高任意两边可作底面。算法与渲染都要支持。
- **重力/物理堆叠**：采用「支撑约束式重力」——每件须落在地面或其他物体顶面、底面有足够支撑，落到最低支撑高度；**非**真实物理引擎。确定性、轴对齐，与共享契约 / 后端 solver / 纯文本清单兼容；前端用 react-spring 做下落与重排动画。
- **库存**：确认清单后**仅记录，不扣减/预占**。
- **箱体**：单一固定尺寸，内部可用 **600 × 400 × 400 mm**（长×宽×高；集中为一个常量，可一处修改）。
