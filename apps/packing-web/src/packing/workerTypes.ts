import type { PackRequest, PackResult } from "@packing/contract";

export interface WorkerRequest {
  id: number;
  request: PackRequest;
}

export interface WorkerResponse {
  id: number;
  result: PackResult;
}
