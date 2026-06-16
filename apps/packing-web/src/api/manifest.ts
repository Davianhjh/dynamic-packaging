import type { Manifest, ManifestLine } from "@packing/contract";

export interface StockConflict {
  productId: string;
  requested: number;
  available: number;
}

export interface ManifestRecord {
  id: string;
  binId: string;
  lines: ManifestLine[];
  fillRate: number;
  createdAt: string;
}

/** 库存不足：确认被拒，附冲突明细，前端据此提示修改。 */
export class StockConflictError extends Error {
  constructor(public conflicts: StockConflict[]) {
    super("库存不足");
    this.name = "StockConflictError";
  }
}

/** 确认清单：后端在此（且仅此时）做一次性库存校验。 */
export async function confirmManifest(manifest: Manifest): Promise<ManifestRecord> {
  const res = await fetch("/api/manifest/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(manifest),
  });
  if (res.status === 409) {
    const body = await res.json();
    throw new StockConflictError(body?.detail?.conflicts ?? []);
  }
  if (!res.ok) throw new Error(`confirm ${res.status}`);
  return (await res.json()) as ManifestRecord;
}
