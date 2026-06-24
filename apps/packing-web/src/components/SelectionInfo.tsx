import { usePackingStore } from "../store/packingStore";

/** 点选某件物品后的浮层信息卡：展示算法为其选定的朝向与落点。 */
export function SelectionInfo() {
  const selectedId = usePackingStore((s) => s.selectedInstanceId);
  const result = usePackingStore((s) => s.result);
  const products = usePackingStore((s) => s.products);
  const selectInstance = usePackingStore((s) => s.selectInstance);

  if (!selectedId || !result) return null;
  const p = result.placements.find((x) => x.instanceId === selectedId);
  if (!p) return null;

  const name = products.find((pr) => pr.id === p.productId)?.name ?? p.productId;
  const f = p.footprint;

  return (
    <div className="absolute bottom-4 left-4 rounded-lg border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between gap-6">
        <span className="font-medium">{name}</span>
        <button
          type="button"
          onClick={() => selectInstance(null)}
          className="text-slate-400 hover:text-slate-200"
        >
          ✕
        </button>
      </div>
      <div className="mt-1 text-xs text-slate-400">
        摆放尺寸 {f.length}×{f.width}×{f.height} mm · 朝向 #{p.rotationType}
      </div>
      <div className="text-xs text-slate-500">
        落点 ({p.position.x.toFixed(0)}, {p.position.y.toFixed(0)}, {p.position.z.toFixed(0)})
      </div>
    </div>
  );
}
