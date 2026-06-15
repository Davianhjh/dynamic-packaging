/**
 * 装箱共享契约 —— 前端 (TypeScript)
 *
 * 这是前后端唯一的几何 / 数据契约，必须与 server 端的 packing_contract.py 保持同步。
 * 任何对结构、单位、坐标系的修改都要两端一起改。
 *
 * 约定:
 *   - 单位: 毫米 (mm)，体积单位 mm³
 *   - 坐标原点: 箱体某一底角；x 沿长(length)、y 沿宽(width)、z 沿高(height, 向上)
 *   - position 表示物品轴对齐包围盒的“最小角”坐标 (min corner)
 *   - rotationType: 0..5 共 6 种轴对齐朝向
 */

/** 三维尺寸，单位 mm */
export interface Dimensions {
  length: number; // 沿 x
  width: number; // 沿 y
  height: number; // 沿 z
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 6 种轴对齐朝向；与后端枚举一一对应 */
export type RotationType = 0 | 1 | 2 | 3 | 4 | 5;

/** 箱体（内部可用尺寸） */
export interface Bin {
  id: string;
  name: string;
  dimensions: Dimensions;
}

/** 商品（装箱所需的最小信息；缩略图、库存等不参与几何计算） */
export interface Product {
  id: string;
  name: string;
  dimensions: Dimensions; // 近似长宽高
  thumbnailUrl?: string;
}

/** 一次装箱请求里要尝试放入的某种商品及数量 */
export interface PackItem {
  productId: string;
  name: string;
  dimensions: Dimensions;
  quantity: number;
}

/** 单个已摆放的物品实例 */
export interface Placement {
  instanceId: string; // 每个被放置的单件唯一
  productId: string;
  position: Vec3; // 轴对齐包围盒最小角，箱体坐标系
  rotationType: RotationType;
  footprint: Dimensions; // 旋转后的轴对齐尺寸
}

/** 装箱结果（启发式与后端求解器返回同一结构） */
export interface PackResult {
  binId: string;
  placements: Placement[];
  placedCounts: Record<string, number>; // productId -> 已放数量
  unplaced: Array<{ productId: string; quantity: number }>;
  occupiedVolume: number; // mm³
  totalVolume: number; // mm³
  remainingVolume: number; // mm³
  fillRate: number; // 0..1
  isFull: boolean; // 当前已选物品再也放不下任何一件时为 true
}

/** 发往后端 solver 的请求体 */
export interface PackRequest {
  bin: Bin;
  items: PackItem[]; // 已选全部商品 + 触发的新商品，整批
  timeLimitMs?: number; // 求解时间预算，默认由后端决定 (建议 2000~3000)
}

/** 装箱清单（用于确认与导出，仅类型 + 数量） */
export interface ManifestLine {
  productId: string;
  name: string;
  quantity: number;
}

export interface Manifest {
  binId: string;
  lines: ManifestLine[];
  fillRate: number;
}

/** 工具: 由尺寸算体积 */
export const volumeOf = (d: Dimensions): number => d.length * d.width * d.height;
