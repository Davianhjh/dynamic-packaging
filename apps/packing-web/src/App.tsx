import { DEFAULT_BIN, volumeOf } from "@packing/contract";

// 占位骨架 (Phase 0)。Phase 2 接入 R3F 场景、dnd-kit 商品列表与 Zustand store。
// 固定箱体取自共享契约常量 DEFAULT_BIN（业务决策：单一固定箱体，可配置）。
export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">动态装箱 · packing-web</h1>
      <p className="text-slate-400">Phase 0 骨架已就绪。下一步 (Phase 2)：R3F 3D 场景 + dnd-kit 拖拽 + Zustand。</p>
      <div className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-4 text-sm">
        <div className="font-medium">{DEFAULT_BIN.name}</div>
        <div className="text-slate-400">
          可用体积 {volumeOf(DEFAULT_BIN.dimensions).toLocaleString()} mm³（共享契约 @packing/contract 已连通）
        </div>
      </div>
    </div>
  );
}
