"""FastAPI 应用入口 (模块化单体)。

各业务模块以独立 APIRouter 挂载，求解重计算不在请求线程内同步执行 (见 solver)。
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.catalog.router import router as catalog_router
from app.config import settings
from app.manifest.router import router as manifest_router
from app.solver.router import router as solver_router

app = FastAPI(title="物品动态装箱后端", version="0.0.0")

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
