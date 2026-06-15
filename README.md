# 物品动态装箱展示系统 (dynamic-packaging)

用户把商品从列表拖入固定尺寸箱子，实时看到 3D 码放、占用与剩余空间；装箱用前后端混合算法，
最终生成可确认/导出的纯文本清单。另含一个商品管理后台。

> 设计文档：[ARCHITECTURE.md](ARCHITECTURE.md) · [技术选型说明.md](技术选型说明.md) ·
> [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) · 面向 Claude Code 的指南 [CLAUDE.md](CLAUDE.md)

## 目录结构

```
/
├─ apps/
│  ├─ packing-web/   # 装箱应用: React + Vite + react-three-fiber (Phase 2+)
│  └─ admin-web/     # 管理后台: React + Vite + Ant Design (Phase 1+)
├─ packages/
│  └─ contract/      # 前端共享契约 @packing/contract (packing-contract.ts)
├─ server/           # 后端: FastAPI 模块化单体 (auth/catalog/solver/manifest)
│  └─ app/contract/  # 后端共享契约 packing_contract.py (须与前端契约同步)
└─ docker-compose.yml
```

前端用 pnpm workspaces 管理 `apps/*` 与 `packages/*`；后端 `server/` 为独立 Python 项目 (uv)。

## 快速开始

```bash
# 1) 基础设施 (postgres / redis / minio)
docker compose up -d

# 2) 前端 (仓库根目录)
pnpm install
pnpm dev:packing      # 装箱应用 → http://localhost:5173
pnpm dev:admin        # 管理后台 → http://localhost:5174

# 3) 后端
cd server
uv sync
uv run uvicorn app.main:app --reload   # → http://localhost:8000/docs
```

根目录常用脚本：`pnpm build`（全量构建）、`pnpm typecheck`、`pnpm format`。

## 共享契约（最重要）

`packages/contract/src/packing-contract.ts` 与 `server/app/contract/packing_contract.py`
是同一份摆放 schema 的两端实现，**必须保持同步**（单位 mm、坐标系原点在箱底角、rotationType 0..5）。
前端各 app 通过别名 `@packing/contract` 以源码形式直接消费该契约。

## 进度

Phase 0（基础设施与契约）已完成：monorepo 骨架、契约落位、FastAPI 健康检查、两个 Vite 应用骨架。
后续阶段见 [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)。
