import type { Dimensions } from "@packing/contract";

export type ProductStatus = "online" | "offline";

export interface AdminProduct {
  id: string;
  name: string;
  dimensions: Dimensions;
  stock: number;
  status: ProductStatus;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserOut {
  id: string;
  username: string;
  role: "admin" | "packer";
}
