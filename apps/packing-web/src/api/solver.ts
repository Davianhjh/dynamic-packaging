import type { PackRequest, PackResult } from "@packing/contract";

/** HTTP 求解：整批交后端求最优 (近优) 布局。请求/响应均为契约 camelCase。 */
export async function solveBackend(request: PackRequest): Promise<PackResult> {
  const res = await fetch("/api/solver/solve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`solver ${res.status}`);
  return (await res.json()) as PackResult;
}

/** WebSocket 求解：异步化，求解完成后由后端推送，不长占 HTTP 连接。 */
export function solveViaWs(request: PackRequest): Promise<PackResult> {
  return new Promise<PackResult>((resolve, reject) => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/api/solver/ws`);
    let settled = false;
    ws.onopen = () => ws.send(JSON.stringify(request));
    ws.onmessage = (e) => {
      settled = true;
      resolve(JSON.parse(e.data) as PackResult);
      ws.close();
    };
    ws.onerror = () => {
      if (!settled) reject(new Error("solver ws error"));
    };
    ws.onclose = () => {
      if (!settled) reject(new Error("solver ws closed"));
    };
  });
}

/** 优先 WebSocket，失败退回 HTTP。 */
export async function solveOptimal(request: PackRequest): Promise<PackResult> {
  try {
    return await solveViaWs(request);
  } catch {
    return await solveBackend(request);
  }
}
