"""FastAPI 应用入口 (模块化单体)。

各业务模块以独立 APIRouter 挂载，求解重计算不在请求线程内同步执行 (见 solver)。
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.catalog.router import router as catalog_router
from app.config import settings
from app.manifest.router import router as manifest_router
from app.solver.router import router as solver_router

logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # 启动初始化尽力而为：数据库未就绪时不阻断应用启动。
    try:
        from app.auth.service import seed_admin
        from app.db import SessionLocal

        with SessionLocal() as db:
            seed_admin(db)
    except Exception as exc:  # noqa: BLE001
        logger.warning("管理员播种跳过 (数据库未迁移?): %s", exc)
    try:
        from app.solver.pool import init_pool

        init_pool()
    except Exception as exc:  # noqa: BLE001
        logger.warning("solver 进程池初始化失败，回退线程执行: %s", exc)
    yield
    from app.solver.pool import shutdown_pool

    shutdown_pool()


app = FastAPI(title="物品动态装箱后端", version="0.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    """健康检查。"""
    return {"status": "ok"}


@app.get("/", tags=["system"])
def root() -> dict[str, str]:
    return {"service": "packing-server", "docs": "/docs"}


app.include_router(auth_router)
app.include_router(catalog_router)
app.include_router(solver_router)
app.include_router(manifest_router)
