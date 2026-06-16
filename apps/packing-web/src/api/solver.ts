import type { PackRequest, PackResult } from "@packing/contract";

/** 整批交后端求最优 (近优) 布局。请求/响应均为契约 camelCase。 */
export async function solveBackend(request: PackRequest): Promise<PackResult> {
  const res = await fetch("/api/solver/solve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`solver ${res.status}`);
  return (await res.json()) as PackResult;
}
