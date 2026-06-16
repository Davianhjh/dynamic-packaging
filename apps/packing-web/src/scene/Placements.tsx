import { Instance, Instances } from "@react-three/drei";

import type { Placement } from "@packing/contract";

import { instanceTransform } from "./coords";

const PALETTE = [
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#eab308",
  "#ec4899",
  "#14b8a6",
  "#a855f7",
  "#ef4444",
];

function colorFor(productId: string): string {
  let h = 0;
  for (let i = 0; i < productId.length; i++) h = (h * 31 + productId.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** 用 <Instances> 实例化渲染已摆放物品（同几何合批，单件设颜色/位置/缩放）。 */
export function Placements({ placements }: { placements: Placement[] }) {
  if (placements.length === 0) return null;
  return (
    <Instances limit={600} range={placements.length}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.65} metalness={0.05} />
      {placements.map((p) => {
        const t = instanceTransform(p.position, p.footprint);
        return (
          <Instance
            key={p.instanceId}
            position={t.position}
            scale={t.scale}
            color={colorFor(p.productId)}
          />
        );
      })}
    </Instances>
  );
}
