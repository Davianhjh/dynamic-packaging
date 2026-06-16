import type { Dimensions, Product } from "@packing/contract";

import { apiGet } from "./client";

interface ProductOut {
  id: string;
  name: string;
  dimensions: Dimensions;
  thumbnailUrl: string | null;
}

/** 拉取上架商品，映射为契约 Product（装箱只需几何信息）。 */
export async function getOnShelf(): Promise<Product[]> {
  const rows = await apiGet<ProductOut[]>("/catalog/products/on-shelf");
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    dimensions: r.dimensions,
    thumbnailUrl: r.thumbnailUrl ?? undefined,
  }));
}
