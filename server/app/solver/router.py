"""solver: 整批求最优 (近优) 布局。POST 求解 = Redis 缓存 + 进程池 + 硬超时 + 降级。"""

from __future__ import annotations

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.contract.packing_contract import PackRequest, PackResult
from app.solver import cache
from app.solver.pool import run_solve
from app.solver.service import fallback_solve

router = APIRouter(prefix="/api/solver", tags=["solver"])
logger = logging.getLogger("app.solver")


async def solve_or_cached(request: PackRequest) -> PackResult:
    """缓存命中直接返回；否则进程池求解；超时则降级返回单趟启发式结果。"""
    key = cache.cache_key(request)
    cached = cache.get_cached(key)
    if cached is not None:
        logger.info("solver 缓存命中")
        return cached
    logger.info("solver 缓存未命中，开始求解")
    try:
        result = await run_solve(request)
    except TimeoutError:
        logger.warning("solver 超时，降级返回单趟启发式结果")
        return fallback_solve(request)  # 降级结果不写缓存，下次仍尝试最优
    cache.set_cached(key, result)
    return result


@router.post("/solve", response_model=PackResult)
async def solve_endpoint(request: PackRequest) -> PackResult:
    return await solve_or_cached(request)


@router.websocket("/ws")
async def solve_ws(websocket: WebSocket) -> None:
    """求解异步化：一条连接上收请求、求解完成后推结果（可多次往返）。"""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            request = PackRequest.model_validate(data)
            result = await solve_or_cached(request)
            await websocket.send_json(result.model_dump(by_alias=True))
    except WebSocketDisconnect:
        return

