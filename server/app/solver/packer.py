"""支撑约束式装箱核心（与前端 heuristic.ts 同一套语义，保证布局可互换）。

- 6 种轴对齐朝向 (rotationType 0..5)。
- 重力 = 支撑约束：每件落在地面或其他物体顶面，底面支撑率达阈值；落到最低支撑高度。
- 给定一个“单件顺序”，做 Deepest-Bottom-Left(下落) 贪心，返回符合契约的 PackResult。
"""

from __future__ import annotations

from dataclasses import dataclass

from app.contract.packing_contract import (
    Bin,
    Dimensions,
    PackResult,
    Placement,
    RotationType,
    Unplaced,
    Vec3,
)

EPS = 1e-6
SUPPORT_RATIO = 0.6
ALL_ROTATIONS: tuple[RotationType, ...] = tuple(RotationType)


def footprint_for(d: Dimensions, r: RotationType) -> Dimensions:
    """旋转后的轴对齐尺寸（length->x, width->y, height->z）。须与前端一致。"""
    dl, dw, dh = d.length, d.width, d.height
    table: dict[int, tuple[float, float, float]] = {
        0: (dl, dw, dh),
        1: (dw, dl, dh),
        2: (dh, dl, dw),
        3: (dh, dw, dl),
        4: (dl, dh, dw),
        5: (dw, dh, dl),
    }
    fl, fw, fh = table[int(r)]
    return Dimensions(length=fl, width=fw, height=fh)


@dataclass
class _Placed:
    x: float
    y: float
    z: float
    fl: float
    fw: float
    fh: float


def _ov1(a_min: float, a_len: float, b_min: float, b_len: float) -> float:
    return max(0.0, min(a_min + a_len, b_min + b_len) - max(a_min, b_min))


def _fp_overlap(x: float, y: float, fl: float, fw: float, b: _Placed) -> float:
    return _ov1(x, fl, b.x, b.fl) * _ov1(y, fw, b.y, b.fw)


def _settle(
    x: float, y: float, fp: Dimensions, placed: list[_Placed], bin_dims: Dimensions
) -> tuple[float, bool] | None:
    """在 (x,y) 放置 footprint 后的落点 z 与支撑是否达标；越界返回 None。"""
    if x + fp.length > bin_dims.length + EPS:
        return None
    if y + fp.width > bin_dims.width + EPS:
        return None
    z = 0.0
    for b in placed:
        if _fp_overlap(x, y, fp.length, fp.width, b) > EPS:
            z = max(z, b.z + b.fh)
    if z + fp.height > bin_dims.height + EPS:
        return None
    if z <= EPS:
        return (z, True)
    support = 0.0
    for b in placed:
        if abs(b.z + b.fh - z) < EPS:
            support += _fp_overlap(x, y, fp.length, fp.width, b)
    return (z, support + EPS >= SUPPORT_RATIO * fp.length * fp.width)


def _anchors(placed: list[_Placed], bin_dims: Dimensions) -> tuple[list[float], list[float]]:
    xs = {0.0}
    ys = {0.0}
    for b in placed:
        if b.x + b.fl < bin_dims.length - EPS:
            xs.add(b.x + b.fl)
        if b.y + b.fw < bin_dims.width - EPS:
            ys.add(b.y + b.fw)
    return sorted(xs), sorted(ys)


def _best(
    base: Dimensions, placed: list[_Placed], bin_dims: Dimensions
) -> tuple[float, float, float, RotationType, Dimensions] | None:
    xs, ys = _anchors(placed, bin_dims)
    best: tuple[float, float, float, RotationType, Dimensions] | None = None
    seen: set[tuple[float, float, float]] = set()
    for r in ALL_ROTATIONS:
        fp = footprint_for(base, r)
        key = (fp.length, fp.width, fp.height)
        if key in seen:
            continue
        seen.add(key)
        for x in xs:
            for y in ys:
                s = _settle(x, y, fp, placed, bin_dims)
                if s is None or not s[1]:
                    continue
                z = s[0]
                if best is None or (z, y, x) < (best[0], best[1], best[2]):
                    best = (z, y, x, r, fp)
    return best


def pack_units(units: list[tuple[str, Dimensions]], bin: Bin) -> PackResult:
    """按给定单件顺序贪心装箱。"""
    placed: list[_Placed] = []
    placements: list[Placement] = []
    placed_counts: dict[str, int] = {}
    unplaced_counts: dict[str, int] = {}
    seq: dict[str, int] = {}

    for product_id, dims in units:
        spot = _best(dims, placed, bin.dimensions)
        if spot is None:
            unplaced_counts[product_id] = unplaced_counts.get(product_id, 0) + 1
            continue
        z, y, x, rotation, fp = spot
        placed.append(_Placed(x=x, y=y, z=z, fl=fp.length, fw=fp.width, fh=fp.height))
        n = seq[product_id] = seq.get(product_id, 0) + 1
        placements.append(
            Placement(
                instance_id=f"{product_id}#{n}",
                product_id=product_id,
                position=Vec3(x=x, y=y, z=z),
                rotation_type=rotation,
                footprint=fp,
            )
        )
        placed_counts[product_id] = placed_counts.get(product_id, 0) + 1

    total = bin.dimensions.volume
    occupied = sum(p.footprint.volume for p in placements)
    unplaced = [Unplaced(product_id=k, quantity=v) for k, v in unplaced_counts.items()]
    return PackResult(
        bin_id=bin.id,
        placements=placements,
        placed_counts=placed_counts,
        unplaced=unplaced,
        occupied_volume=occupied,
        total_volume=total,
        remaining_volume=total - occupied,
        fill_rate=(occupied / total if total > 0 else 0.0),
        is_full=len(unplaced) > 0,
    )
