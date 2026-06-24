"""求解器对外的唯一接口。

设计约定 (见 ARCHITECTURE.md / 技术选型说明.md):
    - 纯函数式接口 ``solve(request) -> PackResult``，内部实现可替换。
    - 时间受限近优 (默认 2~3s)：尝试多种单件顺序构造，取最优；NP-hard，不追求真正最优。
    - **绝不**在 API 请求线程内同步计算；由进程池执行 (见 pool.py)。
    - 结果按 "商品集合 + 箱体" 缓存到 Redis (见 cache.py)。
"""

from __future__ import annotations

import time
from collections.abc import Iterator

from app.contract.packing_contract import Dimensions, PackRequest, PackResult
from app.solver.packer import pack_units

MAX_UNITS = 1000

Unit = tuple[str, Dimensions]


def _expand(request: PackRequest) -> list[Unit]:
    units: list[Unit] = []
    for item in request.items:
        for _ in range(item.quantity):
            units.append((item.product_id, item.dimensions))
            if len(units) >= MAX_UNITS:
                return units
    return units


def _vol(d: Dimensions) -> float:
    return d.length * d.width * d.height


def _maxdim(d: Dimensions) -> float:
    return max(d.length, d.width, d.height)


def _orderings(units: list[Unit]) -> Iterator[list[Unit]]:
    """多策略：不同排序各构造一遍，取最优。"""
    yield sorted(units, key=lambda u: -_vol(u[1]))
    yield sorted(units, key=lambda u: (-_maxdim(u[1]), -_vol(u[1])))
    yield sorted(units, key=lambda u: (-(u[1].length * u[1].width), -u[1].height))
    yield sorted(units, key=lambda u: (-u[1].height, -_vol(u[1])))
    yield list(units)


def _score(result: PackResult) -> tuple[int, float]:
    return (sum(result.placed_counts.values()), result.fill_rate)


def solve(request: PackRequest) -> PackResult:
    """时间受限多策略近优；返回放入最多、占用最高的布局。"""
    units = _expand(request)
    if not units:
        return pack_units([], request.bin)

    budget = (request.time_limit_ms or 2500) / 1000.0
    start = time.monotonic()
    best: PackResult | None = None
    for order in _orderings(units):
        result = pack_units(order, request.bin)
        if best is None or _score(result) > _score(best):
            best = result
        if time.monotonic() - start > budget:
            break
    assert best is not None
    return best


def fallback_solve(request: PackRequest) -> PackResult:
    """降级：单趟体积降序快速构造，用于求解超时/不可用时兜底。"""
    units = _expand(request)
    order = sorted(units, key=lambda u: -_vol(u[1]))
    return pack_units(order, request.bin)
