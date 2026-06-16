import type { Dimensions, Vec3 } from "@packing/contract";

/**
 * 契约坐标 (z 向上、原点底角、position=最小角) → three.js (y 向上)。
 * 整个装箱组用 <group scale={SCENE_SCALE}> 把 mm 缩到场景单位。
 */
export const SCENE_SCALE = 0.01;

/** 单件实例：返回盒中心位置与缩放（配合 1×1×1 单位 BoxGeometry）。 */
export function instanceTransform(
  pos: Vec3,
  fp: Dimensions,
): { position: [number, number, number]; scale: [number, number, number] } {
  return {
    position: [pos.x + fp.length / 2, pos.z + fp.height / 2, pos.y + fp.width / 2],
    scale: [fp.length, fp.height, fp.width],
  };
}

/** 箱体线框：中心与尺寸（mm）。 */
export function binTransform(d: Dimensions): {
  center: [number, number, number];
  size: [number, number, number];
} {
  return {
    center: [d.length / 2, d.height / 2, d.width / 2],
    size: [d.length, d.height, d.width],
  };
}
