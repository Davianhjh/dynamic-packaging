import type { Dimensions } from "@packing/contract";

import { api } from "./client";
import type { AdminProduct, ProductStatus } from "./types";

export interface ProductInput {
  name: string;
  dimensions: Dimensions;
  stock: number;
  status: ProductStatus;
}

export const listProducts = (): Promise<AdminProduct[]> =>
  api.get<AdminProduct[]>("/catalog/products");

export const createProduct = (data: ProductInput): Promise<AdminProduct> =>
  api.post<AdminProduct>("/catalog/products", data);

export const updateProduct = (id: string, data: Partial<ProductInput>): Promise<AdminProduct> =>
  api.patch<AdminProduct>(`/catalog/products/${id}`, data);

export const deleteProduct = (id: string): Promise<void> =>
  api.del<void>(`/catalog/products/${id}`);

export const setStatus = (id: string, status: ProductStatus): Promise<AdminProduct> =>
  api.patch<AdminProduct>(`/catalog/products/${id}/status`, { status });

export const setStock = (id: string, stock: number): Promise<AdminProduct> =>
  api.patch<AdminProduct>(`/catalog/products/${id}/stock`, { stock });

export const uploadThumbnail = (id: string, file: File): Promise<AdminProduct> => {
  const fd = new FormData();
  fd.append("file", file);
  return api.postForm<AdminProduct>(`/catalog/products/${id}/thumbnail`, fd);
};
