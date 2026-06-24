import { Edges, Instance, Instances } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import type { Placement } from "@packing/contract";

import { usePackingStore } from "../store/packingStore";
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

// 新件从箱顶上方落入的起始高度 (mm)；重排时已存在的件平滑滑向新位。
const DROP_FROM_Y = 620;

interface Target {
  pos: THREE.Vector3;
  scale: THREE.Vector3;
}

/**
 * <Instances> 实例化渲染 + 过渡动画 + 点选高亮：
 *  - 新件在箱顶上方初始化、逐帧 lerp 下落（支撑约束重力的“下落”观感）；
 *  - 后端返回新布局时相同 instanceId 平滑滑向新位（“重新码放”）；
 *  - 点击某件 → 选中并描白边，配合信息卡展示其朝向。
 */
export function Placements({ placements }: { placements: Placement[] }) {
  const refs = useRef<Map<string, THREE.Object3D>>(new Map());
  const seen = useRef<Set<string>>(new Set());
  const selectInstance = usePackingStore((s) => s.selectInstance);
  const selectedId = usePackingStore((s) => s.selectedInstanceId);

  const targets = useMemo(() => {
    const map = new Map<string, Target>();
    for (const p of placements) {
      const t = instanceTransform(p.position, p.footprint);
      map.set(p.instanceId, {
        pos: new THREE.Vector3(t.position[0], t.position[1], t.position[2]),
        scale: new THREE.Vector3(t.scale[0], t.scale[1], t.scale[2]),
      });
    }
    return map;
  }, [placements]);

  useFrame(() => {
    targets.forEach((t, id) => {
      const obj = refs.current.get(id);
      if (!obj) return;
      obj.position.lerp(t.pos, 0.18);
      obj.scale.lerp(t.scale, 0.2);
    });
    seen.current.forEach((id) => {
      if (!targets.has(id)) seen.current.delete(id);
    });
  });

  if (placements.length === 0) {
    seen.current.clear();
    return null;
  }

  const selected = selectedId ? placements.find((p) => p.instanceId === selectedId) : undefined;
  const highlight = selected ? instanceTransform(selected.position, selected.footprint) : null;

  return (
    <>
      <Instances limit={600} range={placements.length}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.65} metalness={0.05} />
        {placements.map((p) => (
          <Instance
            key={p.instanceId}
            color={colorFor(p.productId)}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              selectInstance(p.instanceId);
            }}
            ref={(o: THREE.Object3D | null) => {
              if (!o) {
                refs.current.delete(p.instanceId);
                return;
              }
              refs.current.set(p.instanceId, o);
              if (!seen.current.has(p.instanceId)) {
                const t = instanceTransform(p.position, p.footprint);
                o.position.set(t.position[0], DROP_FROM_Y, t.position[2]);
                o.scale.set(t.scale[0], t.scale[1], t.scale[2]);
                seen.current.add(p.instanceId);
              }
            }}
          />
        ))}
      </Instances>
      {highlight ? (
        <mesh
          position={highlight.position}
          scale={[highlight.scale[0] + 4, highlight.scale[1] + 4, highlight.scale[2] + 4]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial transparent opacity={0} />
          <Edges color="#ffffff" />
        </mesh>
      ) : null}
    </>
  );
}
