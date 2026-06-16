"""solver: 整批求最优 (近优) 布局。POST 求解 = Redis 缓存 + 进程池 + 硬超时。"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.contract.packing_contract import PackRequest, PackResult
from app.solver import cache
from app.solver.pool import run_solve

router = APIRouter(prefix="/api/solver", tags=["solver"])


@router.post("/solve", response_model=PackResult)
async def solve_endpoint(request: PackRequest) -> PackResult:
    key = cache.cache_key(request)
    cached = cache.get_cached(key)
    if cached is not None:
        return cached
    try:
        result = await run_solve(request)
    except TimeoutError as exc:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="求解超时"
        ) from exc
    cache.set_cached(key, result)
    return result
