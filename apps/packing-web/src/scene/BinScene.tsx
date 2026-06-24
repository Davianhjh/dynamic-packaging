import { Edges, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

import type { Bin, PackResult } from "@packing/contract";

import { usePackingStore } from "../store/packingStore";
import { SCENE_SCALE, binTransform } from "./coords";
import { Placements } from "./Placements";

export function BinScene({ bin, result }: { bin: Bin; result: PackResult | null }) {
  const { center, size } = binTransform(bin.dimensions);
  const selectInstance = usePackingStore((s) => s.selectInstance);
  const target: [number, number, number] = [
    center[0] * SCENE_SCALE,
    center[1] * SCENE_SCALE,
    center[2] * SCENE_SCALE,
  ];

  return (
    <Canvas
      camera={{ position: [9, 7, 11], fov: 50 }}
      dpr={[1, 2]}
      onPointerMissed={() => selectInstance(null)}
    >
      <color attach="background" args={["#0b1120"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[8, 14, 6]} intensity={1.3} />
      <gridHelper args={[40, 40, "#1e293b", "#1e293b"]} />
      <axesHelper args={[1.5]} />
      <group scale={SCENE_SCALE}>
        <mesh position={center}>
          <boxGeometry args={size} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.05} />
          <Edges color="#38bdf8" />
        </mesh>
        {result ? <Placements placements={result.placements} /> : null}
      </group>
      <OrbitControls makeDefault target={target} />
    </Canvas>
  );
}
