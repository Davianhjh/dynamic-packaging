# 实施计划

按阶段推进，每阶段结束应可独立验证。Claude Code 可逐阶段领取任务。

## Phase 0 · 基础设施与契约

- [x] 建立 monorepo 骨架（pnpm workspaces：`apps/*`、`packages/*`；`server/` 独立 Python 项目）。
- [x] 放入共享契约 `packages/contract/src/packing-contract.ts` 与 `server/app/contract/packing_contract.py`。
- [x] `docker-compose.yml` 起 postgres / redis / minio。
- [x] 后端 FastAPI 骨架（`app/main.py`、模块目录、健康检查接口）。
- [x] 前端两个 Vite 应用骨架。

## Phase 1 · 商品管理（catalog + admin-web）

- [ ] catalog 数据模型：商品(含近似长宽高)、库存、上下架状态、缩略图 URL。
- [ ] Alembic 迁移。
- [ ] catalog REST：商品 CRUD、上下架、库存维护、**对内库存校验接口**、上架商品列表。
- [ ] 缩略图上传到 MinIO。
- [ ] auth：登录、JWT、管理端/装箱端角色。
- [ ] admin-web：商品表格 + 录入/编辑表单 + 图片上传 + 库存与上下架管理 (Ant Design)。

## Phase 2 · 装箱前端骨架（packing-web）

- [ ] R3F 场景：固定尺寸箱体、坐标轴、相机控制(OrbitControls)。
- [ ] 商品列表面板：缩略图、名称、近似长宽高；从 catalog 拉上架商品。
- [ ] Zustand store：已选商品、当前布局、占用率/剩余空间。
- [ ] dnd-kit：从列表拖入箱体区域，drop 触发“加入商品”。
- [ ] Web Worker：实现启发式装箱，输入/输出严格按契约。
- [ ] 用 `<Instances>` 渲染已摆放物品；占用率与剩余空间实时显示。

## Phase 3 · 后端求解与 handoff

- [ ] solver 模块：`solve(request) -> result`，时间受限近优（py3dbp 或自定义）。
- [ ] solver 跑进程池 / Celery worker；POST 求解接口同步等待 + 硬超时。
- [ ] Redis 按“商品集合 + 箱体”缓存求解结果。
- [ ] 前端 handoff：启发式判定放不下 → 整批请求后端 → loading 态 → 渲染返回布局。
- [ ] react-spring 重排过渡动画；放不下时提示“已装满”。

## Phase 4 · 清单确认、库存校验与导出

- [ ] manifest 模块：保存装箱记录；**确认时**调 catalog 做一次性库存校验。
- [ ] 库存不足返回冲突明细，前端允许修改后重新确认。
- [ ] 确认成功后是否扣减/预占库存（业务开关，默认仅记录）。
- [ ] 前端生成并导出纯文本清单（类型 + 数量）。

## Phase 5 · 打磨

- [ ] 求解结果缓存命中率、超时与降级（超时返回当前最好启发式结果）。
- [ ] 错误处理、加载与空态、权限边界。
- [ ] 性能：实例化渲染、大量商品列表虚拟滚动。
- [ ] （可选）物品旋转交互展示、求解异步化(WebSocket 推送)。

## 待业务确认

- 是否允许物品旋转（影响算法与 UI 复杂度）。
- 是否需要重力/物理堆叠（默认不做）。
- 确认清单后是否扣减/预占库存（默认仅记录）。
- 箱体尺寸是单一固定还是可选多规格。
