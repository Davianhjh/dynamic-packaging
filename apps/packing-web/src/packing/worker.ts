// Web Worker：在工作线程跑启发式装箱，不阻塞 UI。
import { packHeuristic } from "./heuristic";
import type { WorkerRequest, WorkerResponse } from "./workerTypes";

self.onmessage = (e: MessageEvent) => {
  const { id, request } = e.data as WorkerRequest;
  const response: WorkerResponse = { id, result: packHeuristic(request) };
  (self as unknown as { postMessage(message: WorkerResponse): void }).postMessage(response);
};
