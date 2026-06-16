import { describe, expect, it } from "vitest";

import type { Bin, PackRequest, Placement } from "@packing/contract";

import { footprintFor, packHeuristic } from "./heuristic";

const BIN: Bin = {
  id: "bin-default",
  name: "test",
  dimensions: { length: 600, width: 400, height: 400 },
};

const req = (items: PackRequest["items"]): PackRequest => ({ bin: BIN, items });

const overlaps1D = (aMin: number, aLen: number, bMin: number, bLen: number): boolean =>
  Math.min(aMin + aLen, bMin + bLen) - Math.max(aMin, bMin) > 1e-6;

function boxesOverlap(a: Placement, b: Placement): boolean {
  return (
    overlaps1D(a.position.x, a.footprint.length, b.position.x, b.footprint.length) &&
    overlaps1D(a.position.y, a.footprint.width, b.position.y, b.footprint.width) &&
    overlaps1D(a.position.z, a.footprint.height, b.position.z, b.footprint.height)
  );
}

/** 校验布局合法：在箱内、两两不重叠、每件落地或被支撑。 */
function assertLayoutValid(placements: Placement[], bin: Bin) {
  for (const p of placements) {
    expect(p.position.x).toBeGreaterThanOrEqual(-1e-6);
    expect(p.position.y).toBeGreaterThanOrEqual(-1e-6);
    expect(p.position.z).toBeGreaterThanOrEqual(-1e-6);
    expect(p.position.x + p.footprint.length).toBeLessThanOrEqual(bin.dimensions.length + 1e-6);
    expect(p.position.y + p.footprint.width).toBeLessThanOrEqual(bin.dimensions.width + 1e-6);
    expect(p.position.z + p.footprint.height).toBeLessThanOrEqual(bin.dimensions.height + 1e-6);
  }
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      expect(boxesOverlap(placements[i], placements[j])).toBe(false);
    }
  }
  // 重力：z>0 的件须有下方支撑（被顶面恰好齐平的物体覆盖 >= 60%）。
  for (const p of placements) {
    if (p.position.z <= 1e-6) continue;
    let support = 0;
    for (const q of placements) {
      if (q === p) continue;
      if (Math.abs(q.position.z + q.footprint.height - p.position.z) < 1e-6) {
        const ox = Math.max(
          0,
          Math.min(p.position.x + p.footprint.length, q.position.x + q.footprint.length) -
            Math.max(p.position.x, q.position.x),
        );
        const oy = Math.max(
          0,
          Math.min(p.position.y + p.footprint.width, q.position.y + q.footprint.width) -
            Math.max(p.position.y, q.position.y),
        );
        support += ox * oy;
      }
    }
    expect(support + 1e-6).toBeGreaterThanOrEqual(0.6 * p.footprint.length * p.footprint.width);
  }
}

describe("footprintFor", () => {
  it("覆盖 6 种朝向且均为 (l,w,h) 的排列", () => {
    const d = { length: 3, width: 5, height: 7 };
    const got = ([0, 1, 2, 3, 4, 5] as const).map((r) => {
      const f = footprintFor(d, r);
      return `${f.length},${f.width},${f.height}`;
    });
    expect(new Set(got).size).toBe(6);
    for (const f of got) {
      expect(f.split(",").map(Number).sort()).toEqual([3, 5, 7]);
    }
  });
});

describe("packHeuristic", () => {
  it("把若干件放进箱内且布局合法", () => {
    const result = packHeuristic(
      req([
        { productId: "a", name: "A", dimensions: { length: 200, width: 200, height: 200 }, quantity: 6 },
        { productId: "b", name: "B", dimensions: { length: 100, width: 100, height: 100 }, quantity: 10 },
      ]),
    );
    assertLayoutValid(result.placements, BIN);
    expect(result.placedCounts.a).toBeGreaterThan(0);
    expect(result.fillRate).toBeGreaterThan(0);
    expect(result.fillRate).toBeLessThanOrEqual(1);
    expect(result.occupiedVolume + result.remainingVolume).toBeCloseTo(result.totalVolume);
  });

  it("仅靠旋转才放得下的件会被旋转放入", () => {
    // 350×450×100：原朝向 y=450>400 放不下，旋转到 WLH (x450,y350) 才行。
    const result = packHeuristic(
      req([{ productId: "r", name: "R", dimensions: { length: 350, width: 450, height: 100 }, quantity: 1 }]),
    );
    expect(result.placements).toHaveLength(1);
    const p = result.placements[0];
    expect(p.footprint.width).toBeLessThanOrEqual(400 + 1e-6);
    expect(p.footprint.length).toBeLessThanOrEqual(600 + 1e-6);
    assertLayoutValid(result.placements, BIN);
  });

  it("装不下时标记 isFull 并给出 unplaced", () => {
    const result = packHeuristic(
      req([{ productId: "big", name: "Big", dimensions: { length: 600, width: 400, height: 400 }, quantity: 3 }]),
    );
    expect(result.placedCounts.big).toBe(1); // 一件就占满整箱
    expect(result.isFull).toBe(true);
    expect(result.unplaced).toEqual([{ productId: "big", quantity: 2 }]);
    assertLayoutValid(result.placements, BIN);
  });
});
