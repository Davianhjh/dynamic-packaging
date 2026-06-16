"""solver 进程池：重计算绝不在 API 请求线程内同步执行。

未起池时 (测试 / 降级) ``run_solve`` 回退到默认线程执行器——仍不阻塞事件循环。
"""

from __future__ import annotations

import asyncio
from concurrent.futures import ProcessPoolExecutor

from app.config import settings
from app.contract.packing_contract import PackRequest, PackResult
from app.solver.service import solve

_executor: ProcessPoolExecutor | None = None


def init_pool() -> None:
    global _executor
    if settings.solver_use_pool and _executor is None:
        _executor = ProcessPoolExecutor(max_workers=settings.solver_pool_workers)


def shutdown_pool() -> None:
    global _executor
    if _executor is not None:
        _executor.shutdown(wait=False, cancel_futures=True)
        _executor = None


async def run_solve(request: PackRequest) -> PackResult:
    """提交求解并带硬超时；_executor 为 None 时走默认线程执行器。"""
    loop = asyncio.get_running_loop()
    timeout = (request.time_limit_ms or 2500) / 1000.0 + 1.5
    future = loop.run_in_executor(_executor, solve, request)
    return await asyncio.wait_for(future, timeout=timeout)
