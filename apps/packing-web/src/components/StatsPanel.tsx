import { usePackingStore } from "../store/packingStore";

/** mm³ → 升 (1 L = 1,000,000 mm³)。 */
const liters = (mm3: number): string => (mm3 / 1_000_000).toFixed(2);

export function StatsPanel() {
  const bin = usePackingStore((s) => s.bin);
  const result = usePackingStore((s) => s.result);
  const computing = usePackingStore((s) => s.computing);
  const solving = usePackingStore((s) => s.solving);
  const products = usePackingStore((s) => s.products);
  const clearAll = usePackingStore((s) => s.clearAll);

  const d = bin.dimensions;
  const fillPct = result ? Math.round(result.fillRate * 1000) / 10 : 0;
  const nameOf = (id: string): string => products.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{bin.name}</h2>
        <div className="text-xs text-slate-500">
          {d.length}×{d.width}×{d.height} mm · {liters(d.length * d.width * d.height)} L
        </div>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
        <div className="flex items-end justify-between">
          <span className="text-sm text-slate-400">占用率</span>
          <span className="text-2xl font-semibold tabular-nums">{fillPct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded bg-slate-700">
          <div
            className="h-full bg-sky-400 transition-all"
            style={{ width: `${Math.min(100, fillPct)}%` }}
          />
        </div>
        {result ? (
          <div className="mt-2 text-xs text-slate-500">
            已用 {liters(result.occupiedVolume)} L · 剩余 {liters(result.remainingVolume)} L
          </div>
        ) : null}
      </div>

      {computing ? <div className="text-xs text-sky-400">即时计算中…</div> : null}
      {solving ? <div className="text-xs text-amber-300">后端求最优中…</div> : null}
      {result?.isFull && !solving ? (
        <div className="rounded bg-amber-950/50 p-2 text-sm text-amber-300">
          已装满：连最优解也放不下了。
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto pr-1">
        <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">已放入</h3>
        {result && Object.keys(result.placedCounts).length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm">
            {Object.entries(result.placedCounts).map(([id, n]) => (
              <li key={id} className="flex justify-between">
                <span className="truncate">{nameOf(id)}</span>
                <span className="text-slate-400 tabular-nums">×{n}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-slate-500">把左侧商品拖入箱体即可装箱。</div>
        )}
        {result && result.unplaced.length > 0 ? (
          <div className="mt-3">
            <h3 className="mb-1 text-xs font-semibold uppercase text-amber-500/80">放不下</h3>
            <ul className="flex flex-col gap-1 text-sm text-amber-300/80">
              {result.unplaced.map((u) => (
                <li key={u.productId} className="flex justify-between">
                  <span className="truncate">{nameOf(u.productId)}</span>
                  <span className="tabular-nums">×{u.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={clearAll}
        className="rounded bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600"
      >
        清空
      </button>
    </div>
  );
}
