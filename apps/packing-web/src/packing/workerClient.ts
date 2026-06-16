import type { PackRequest, PackResult } from "@packing/contract";

import type { WorkerRequest, WorkerResponse } from "./workerTypes";

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (result: PackResult) => void>();

function getWorker(): Worker {
  if (worker === null) {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent) => {
      const { id, result } = e.data as WorkerResponse;
      const resolve = pending.get(id);
      if (resolve) {
        pending.delete(id);
        resolve(result);
      }
    };
  }
  return worker;
}

/** 把整批请求发给 Worker 求启发式布局。 */
export function solveAsync(request: PackRequest): Promise<PackResult> {
  return new Promise<PackResult>((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    const message: WorkerRequest = { id, request };
    getWorker().postMessage(message);
  });
}
