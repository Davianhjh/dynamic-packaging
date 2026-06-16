import { create } from "zustand";

import { DEFAULT_BIN } from "@packing/contract";
import type { Bin, PackItem, PackResult, Product } from "@packing/contract";

import { getOnShelf } from "../api/catalog";
import { solveAsync } from "../packing/workerClient";

interface PackingState {
  bin: Bin;
  products: Product[];
  quantities: Record<string, number>;
  result: PackResult | null;
  computing: boolean;
  loadError: string | null;
  loadProducts: () => Promise<void>;
  addProduct: (productId: string) => void;
  removeProduct: (productId: string) => void;
  clearAll: () => void;
}

// 仅采用最新一次求解结果，避免快速增删时的乱序回写。
let computeSeq = 0;

export const usePackingStore = create<PackingState>((set, get) => {
  async function recompute(): Promise<void> {
    const { bin, products, quantities } = get();
    const items: PackItem[] = products
      .filter((p) => (quantities[p.id] ?? 0) > 0)
      .map((p) => ({
        productId: p.id,
        name: p.name,
        dimensions: p.dimensions,
        quantity: quantities[p.id] ?? 0,
      }));
    if (items.length === 0) {
      set({ result: null, computing: false });
      return;
    }
    const mine = ++computeSeq;
    set({ computing: true });
    const result = await solveAsync({ bin, items, timeLimitMs: 2500 });
    if (mine === computeSeq) set({ result, computing: false });
  }

  return {
    bin: DEFAULT_BIN,
    products: [],
    quantities: {},
    result: null,
    computing: false,
    loadError: null,
    loadProducts: async () => {
      try {
        set({ products: await getOnShelf(), loadError: null });
      } catch (err) {
        set({ products: [], loadError: err instanceof Error ? err.message : "加载商品失败" });
      }
    },
    addProduct: (productId) => {
      set((s) => ({
        quantities: { ...s.quantities, [productId]: (s.quantities[productId] ?? 0) + 1 },
      }));
      void recompute();
    },
    removeProduct: (productId) => {
      set((s) => {
        const next = { ...s.quantities };
        const n = (next[productId] ?? 0) - 1;
        if (n <= 0) delete next[productId];
        else next[productId] = n;
        return { quantities: next };
      });
      void recompute();
    },
    clearAll: () => set({ quantities: {}, result: null }),
  };
});
