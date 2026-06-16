/**
 * 支撑约束式启发装箱（前端即时层，跑在 Web Worker）。
 *
 * 业务决策:
 *   - 允许 6 种轴对齐朝向 (rotationType 0..5)。
 *   - 重力 = 支撑约束: 每件落在地面或其他物体顶面，底面支撑率须达阈值；落到最低支撑高度。
 *
 * 算法: 体积降序 + Deepest-Bottom-Left(下落) 贪心。输入/输出严格遵循共享契约。
 * 这是“放不下就整批交后端 solver”里的即时层；不追求最优。
 */

import type {
  Bin,
  Dimensions,
  PackRequest,
  PackResult,
  Placement,
  RotationType,
} from "@packing/contract";

const EPS = 1e-6;
/** 底面最小支撑率（被下方物体覆盖的比例）。 */
const SUPPORT_RATIO = 0.6;
/** 安全上限，避免病态输入卡死 Worker。 */
const MAX_UNITS = 600;

const ALL_ROTATIONS: readonly RotationType[] = [0, 1, 2, 3, 4, 5];

/** 旋转后的轴对齐尺寸（length->x, width->y, height->z）。须与后端枚举一致。 */
export function footprintFor(d: Dimensions, r: RotationType): Dimensions {
  const { length: l, width: w, height: h } = d;
  switch (r) {
    case 0:
      return { length: l, width: w, height: h };
    case 1:
      return { length: w, width: l, height: h };
    case 2:
      return { length: h, width: l, height: w };
    case 3:
      return { length: h, width: w, height: l };
    case 4:
      return { length: l, width: h, height: w };
    case 5:
      return { length: w, width: h, height: l };
  }
}

const volumeOf = (d: Dimensions): number => d.length * d.width * d.height;

interface Placed {
  x: number;
  y: number;
  z: number;
  fl: number; // x 向尺寸
  fw: number; // y 向尺寸
  fh: number; // z 向尺寸
}

const overlap1D = (aMin: number, aLen: number, bMin: number, bLen: number): number =>
  Math.max(0, Math.min(aMin + aLen, bMin + bLen) - Math.max(aMin, bMin));

const footprintOverlap = (
  ax: number,
  ay: number,
  al: number,
  aw: number,
  b: Placed,
): number => overlap1D(ax, al, b.x, b.fl) * overlap1D(ay, aw, b.y, b.fw);

interface Candidate {
  x: number;
  y: number;
  z: number;
  rotation: RotationType;
  fp: Dimensions;
}

/** 在 (x,y) 放置 footprint 后，按重力下落得到的落点 z 与支撑是否达标。 */
function settle(
  x: number,
  y: number,
  fp: Dimensions,
  placed: Placed[],
  bin: Bin,
): { z: number; supported: boolean } | null {
  if (x + fp.length > bin.dimensions.length + EPS) return null;
  if (y + fp.width > bin.dimensions.width + EPS) return null;

  let z = 0;
  for (const b of placed) {
    if (footprintOverlap(x, y, fp.length, fp.width, b) > EPS) z = Math.max(z, b.z + b.fh);
  }
  if (z + fp.height > bin.dimensions.height + EPS) return null;

  if (z <= EPS) return { z, supported: true }; // 落在箱底

  let support = 0;
  for (const b of placed) {
    if (Math.abs(b.z + b.fh - z) < EPS) support += footprintOverlap(x, y, fp.length, fp.width, b);
  }
  const supported = support + EPS >= SUPPORT_RATIO * fp.length * fp.width;
  return { z, supported };
}

/** 候选锚点：箱底角 + 已放物体的右/后界。 */
function anchors(placed: Placed[], bin: Bin): { xs: number[]; ys: number[] } {
  const xs = new Set<number>([0]);
  const ys = new Set<number>([0]);
  for (const b of placed) {
    if (b.x + b.fl < bin.dimensions.length - EPS) xs.add(b.x + b.fl);
    if (b.y + b.fw < bin.dimensions.width - EPS) ys.add(b.y + b.fw);
  }
  return { xs: [...xs].sort((a, b) => a - b), ys: [...ys].sort((a, b) => a - b) };
}

/** 为一件物品挑最优落点：最低 z，其次 y、x（Deepest-Bottom-Left）。 */
function bestPlacement(base: Dimensions, placed: Placed[], bin: Bin): Candidate | null {
  const { xs, ys } = anchors(placed, bin);
  let best: Candidate | null = null;
  const seen = new Set<string>();

  for (const r of ALL_ROTATIONS) {
    const fp = footprintFor(base, r);
    const key = `${fp.length}x${fp.width}x${fp.height}`;
    if (seen.has(key)) continue; // 等价朝向去重
    seen.add(key);

    for (const x of xs) {
      for (const y of ys) {
        const s = settle(x, y, fp, placed, bin);
        if (!s || !s.supported) continue;
        if (
          best === null ||
          s.z < best.z - EPS ||
          (Math.abs(s.z - best.z) < EPS && y < best.y - EPS) ||
          (Math.abs(s.z - best.z) < EPS && Math.abs(y - best.y) < EPS && x < best.x - EPS)
        ) {
          best = { x, y, z: s.z, rotation: r, fp };
        }
      }
    }
  }
  return best;
}

export function packHeuristic(request: PackRequest): PackResult {
  const { bin, items } = request;

  // 展开为单件并按体积降序（大件先放，布局更紧凑、确定性）。
  const units = items
    .flatMap((it) =>
      Array.from({ length: Math.max(0, Math.min(it.quantity, MAX_UNITS)) }, () => it),
    )
    .map((it, i) => ({ it, i }))
    .sort((a, b) => volumeOf(b.it.dimensions) - volumeOf(a.it.dimensions) || a.i - b.i)
    .slice(0, MAX_UNITS);

  const placed: Placed[] = [];
  const placements: Placement[] = [];
  const placedCounts: Record<string, number> = {};
  const unplacedCounts: Record<string, number> = {};
  const seq: Record<string, number> = {};

  for (const { it } of units) {
    const spot = bestPlacement(it.dimensions, placed, bin);
    if (spot === null) {
      unplacedCounts[it.productId] = (unplacedCounts[it.productId] ?? 0) + 1;
      continue;
    }
    placed.push({
      x: spot.x,
      y: spot.y,
      z: spot.z,
      fl: spot.fp.length,
      fw: spot.fp.width,
      fh: spot.fp.height,
    });
    const n = (seq[it.productId] = (seq[it.productId] ?? 0) + 1);
    placements.push({
      instanceId: `${it.productId}#${n}`,
      productId: it.productId,
      position: { x: spot.x, y: spot.y, z: spot.z },
      rotationType: spot.rotation,
      footprint: spot.fp,
    });
    placedCounts[it.productId] = (placedCounts[it.productId] ?? 0) + 1;
  }

  const totalVolume = volumeOf(bin.dimensions);
  const occupiedVolume = placements.reduce((sum, p) => sum + volumeOf(p.footprint), 0);
  const unplaced = Object.entries(unplacedCounts).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));

  return {
    binId: bin.id,
    placements,
    placedCounts,
    unplaced,
    occupiedVolume,
    totalVolume,
    remainingVolume: totalVolume - occupiedVolume,
    fillRate: totalVolume > 0 ? occupiedVolume / totalVolume : 0,
    isFull: unplaced.length > 0,
  };
}
