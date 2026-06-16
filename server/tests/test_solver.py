"""solver 单测：布局合法 + 旋转 + 超容；不依赖 DB/进程池。"""

from __future__ import annotations

from app.contract.packing_contract import (
    Bin,
    Dimensions,
    PackItem,
    PackRequest,
    Placement,
    RotationType,
)
from app.solver.packer import footprint_for
from app.solver.service import solve

BIN = Bin(id="bin-default", name="t", dimensions=Dimensions(length=600, width=400, height=400))


def _ov(a_min: float, a_len: float, b_min: float, b_len: float) -> bool:
    return min(a_min + a_len, b_min + b_len) - max(a_min, b_min) > 1e-6


def _overlap(a: Placement, b: Placement) -> bool:
    return (
        _ov(a.position.x, a.footprint.length, b.position.x, b.footprint.length)
        and _ov(a.position.y, a.footprint.width, b.position.y, b.footprint.width)
        and _ov(a.position.z, a.footprint.height, b.position.z, b.footprint.height)
    )


def _assert_valid(placements: list[Placement], bin: Bin) -> None:
    for p in placements:
        assert p.position.x >= -1e-6 and p.position.y >= -1e-6 and p.position.z >= -1e-6
        assert p.position.x + p.footprint.length <= bin.dimensions.length + 1e-6
        assert p.position.y + p.footprint.width <= bin.dimensions.width + 1e-6
        assert p.position.z + p.footprint.height <= bin.dimensions.height + 1e-6
    for i in range(len(placements)):
        for j in range(i + 1, len(placements)):
            assert not _overlap(placements[i], placements[j])
    for p in placements:
        if p.position.z <= 1e-6:
            continue
        support = 0.0
        for q in placements:
            if q is p or abs(q.position.z + q.footprint.height - p.position.z) >= 1e-6:
                continue
            ox = max(
                0.0,
                min(p.position.x + p.footprint.length, q.position.x + q.footprint.length)
                - max(p.position.x, q.position.x),
            )
            oy = max(
                0.0,
                min(p.position.y + p.footprint.width, q.position.y + q.footprint.width)
                - max(p.position.y, q.position.y),
            )
            support += ox * oy
        assert support + 1e-6 >= 0.6 * p.footprint.length * p.footprint.width


def test_footprint_six_orientations() -> None:
    d = Dimensions(length=3, width=5, height=7)
    foots = [footprint_for(d, RotationType(r)) for r in range(6)]
    keys = {(f.length, f.width, f.height) for f in foots}
    assert len(keys) == 6
    for f in foots:
        assert sorted((f.length, f.width, f.height)) == [3, 5, 7]


def test_solve_places_feasible() -> None:
    result = solve(
        PackRequest(
            bin=BIN,
            items=[
                PackItem(
                    product_id="a",
                    name="A",
                    dimensions=Dimensions(length=200, width=200, height=200),
                    quantity=6,
                )
            ],
        )
    )
    assert sum(result.placed_counts.values()) == 6
    _assert_valid(result.placements, BIN)
    assert abs(result.occupied_volume + result.remaining_volume - result.total_volume) < 1e-3


def test_solve_rotation() -> None:
    result = solve(
        PackRequest(
            bin=BIN,
            items=[
                PackItem(
                    product_id="r",
                    name="R",
                    dimensions=Dimensions(length=350, width=450, height=100),
                    quantity=1,
                )
            ],
        )
    )
    assert len(result.placements) == 1
    assert result.placements[0].footprint.width <= 400 + 1e-6
    _assert_valid(result.placements, BIN)


def test_solve_overflow() -> None:
    result = solve(
        PackRequest(
            bin=BIN,
            items=[
                PackItem(
                    product_id="big",
                    name="B",
                    dimensions=Dimensions(length=600, width=400, height=400),
                    quantity=3,
                )
            ],
        )
    )
    assert result.placed_counts["big"] == 1
    assert result.is_full
    assert any(u.product_id == "big" and u.quantity == 2 for u in result.unplaced)
