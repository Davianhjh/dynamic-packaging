import { useEffect, useMemo, useState } from "react";

import type { ManifestLine, Product } from "@packing/contract";

import { confirmManifest, StockConflictError, type StockConflict } from "../api/manifest";
import { usePackingStore } from "../store/packingStore";

function buildLines(placedCounts: Record<string, number>, products: Product[]): ManifestLine[] {
  return Object.entries(placedCounts).map(([productId, quantity]) => ({
    productId,
    name: products.find((p) => p.id === productId)?.name ?? productId,
    quantity,
  }));
}

function toText(binName: string, fillRate: number, lines: ManifestLine[]): string {
  const totalItems = lines.reduce((sum, l) => sum + l.quantity, 0);
  const rule = "-".repeat(28);
  const head = `装箱清单\n箱体：${binName}\n占用率：${(fillRate * 100).toFixed(1)}%\n${rule}`;
  const body = lines.map((l) => `${l.name}\t× ${l.quantity}`).join("\n");
  const foot = `${rule}\n合计：${totalItems} 件 / ${lines.length} 种\n生成：${new Date().toLocaleString()}`;
  return `${head}\n${body}\n${foot}\n`;
}

function download(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type Status = "idle" | "confirming" | "confirmed";

export function ManifestPanel() {
  const result = usePackingStore((s) => s.result);
  const products = usePackingStore((s) => s.products);
  const bin = usePackingStore((s) => s.bin);

  const [status, setStatus] = useState<Status>("idle");
  const [conflicts, setConflicts] = useState<StockConflict[]>([]);
  const [error, setError] = useState<string | null>(null);

  const lines = useMemo(
    () => (result ? buildLines(result.placedCounts, products) : []),
    [result, products],
  );
  const canConfirm = lines.length > 0;
  const nameOf = (id: string): string => products.find((p) => p.id === id)?.name ?? id;

  // 装箱内容变化 → 之前的确认作废
  useEffect(() => {
    setStatus("idle");
    setConflicts([]);
    setError(null);
  }, [lines]);

  const onConfirm = async () => {
    if (!result || !canConfirm) return;
    setStatus("confirming");
    setConflicts([]);
    setError(null);
    try {
      await confirmManifest({ binId: bin.id, lines, fillRate: result.fillRate });
      setStatus("confirmed");
    } catch (err) {
      setStatus("idle");
      if (err instanceof StockConflictError) setConflicts(err.conflicts);
      else setError(err instanceof Error ? err.message : "确认失败");
    }
  };

  const onExport = () => {
    if (!result) return;
    download("packing-manifest.txt", toText(bin.name, result.fillRate, lines));
  };

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-slate-800 pt-3">
      <h3 className="text-xs font-semibold uppercase text-slate-500">清单</h3>

      {conflicts.length > 0 ? (
        <div className="rounded bg-red-950/50 p-2 text-xs text-red-300">
          库存不足，调整后重试：
          <ul className="mt-1 flex flex-col gap-0.5">
            {conflicts.map((c) => (
              <li key={c.productId}>
                {nameOf(c.productId)}：需 {c.requested} / 余 {c.available}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {error ? <div className="rounded bg-red-950/50 p-2 text-xs text-red-300">{error}</div> : null}
      {status === "confirmed" ? (
        <div className="rounded bg-emerald-950/50 p-2 text-xs text-emerald-300">
          已确认 ✓ 可导出清单
        </div>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!canConfirm || status === "confirming"}
          onClick={onConfirm}
          className="flex-1 rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-40"
        >
          {status === "confirming" ? "确认中…" : "确认清单"}
        </button>
        <button
          type="button"
          disabled={status !== "confirmed"}
          onClick={onExport}
          className="flex-1 rounded bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600 disabled:opacity-40"
        >
          导出
        </button>
      </div>
    </div>
  );
}
