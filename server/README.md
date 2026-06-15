# packing-server

物品动态装箱后端：FastAPI 模块化单体（`auth` / `catalog` / `solver` / `manifest`）。

## 本地起步

```bash
cd server
uv sync                              # 安装依赖 (含 dev 组) 并建立 .venv
cp .env.example .env                 # 按需修改
uv run uvicorn app.main:app --reload # 启动，文档见 http://localhost:8000/docs
```

健康检查：`GET /health` → `{"status": "ok"}`。

## 模块

| 模块 | 前缀 | 职责 |
| --- | --- | --- |
| auth | `/api/auth` | 登录 / JWT / 角色 (Phase 1) |
| catalog | `/api/catalog` | 商品 / 库存 / 上下架 / 库存校验 (Phase 1) |
| solver | `/api/solver` | 时间受限 3D 装箱近优求解，进程池 (Phase 3) |
| manifest | `/api/manifest` | 清单保存 / 确认时库存校验 / 导出 (Phase 4) |

求解器对外只暴露纯函数接口 `app.solver.service.solve(request) -> PackResult`，便于将来抽成独立微服务。

## 依赖分组

按阶段引入额外依赖，避免骨架过重：

```bash
uv sync --extra auth      # pyjwt / passlib / python-multipart (Phase 1)
uv sync --extra storage   # boto3, MinIO/S3 缩略图 (Phase 1)
uv sync --extra solver    # py3dbp (Phase 3)
```
