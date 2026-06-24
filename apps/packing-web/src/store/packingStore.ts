import { create } from "zustand";

import { DEFAULT_BIN } from "@packing/contract";
import type { Bin, PackItem, PackResult, Product } from "@packing/contract";

import { getOnShelf } from "../api/catalog";
import { solveOptimal } from "../api/solver";
import { solveAsync } from "../packing/workerClient";

interface PackingState {
  bin: Bin;
  products: Product[];
  quantities: Record<string, number>;
  result: PackResult | null;
  computing: boolean; // 前端启发式即时计算中
  solving: boolean; // 后端求最优中 (handoff)
  loadError: string | null;
  selectedInstanceId: string | null; // 3D 中被点选的物品
  loadProducts: () => Promise<void>;
  addProduct: (productId: string) => void;
  removeProduct: (productId: string) => void;
  clearAll: () => void;
  selectInstance: (instanceId: string | null) => void;
}

// 仅采用最新一次的结果，避免快速增删时乱序回写。
let computeSeq = 0;

export const usePackingStore = create<PackingState>((set, get) => {
  function buildItems(): PackItem[] {
    const { products, quantities } = get();
    return products
      .filter((p) => (quantities[p.id] ?? 0) > 0)
      .map((p) => ({
        productId: p.id,
        name: p.name,
        dimensions: p.dimensions,
        quantity: quantities[p.id] ?? 0,
      }));
  }

  async function recompute(): Promise<void> {
    const items = buildItems();
    const { bin } = get();
    if (items.length === 0) {
      set({ result: null, computing: false, solving: false, selectedInstanceId: null });
      return;
    }
    const mine = ++computeSeq;

    // 即时层：Web Worker 启发式
    set({ computing: true });
    const heuristic = await solveAsync({ bin, items, timeLimitMs: 2500 });
    if (mine !== computeSeq) return;
    set({ result: heuristic, computing: false });

    // handoff：启发式判定放不下 → 整批交后端求最优
    if (!heuristic.isFull) {
      set({ solving: false });
      return;
    }
    set({ solving: true });
    try {
      const optimal = await solveOptimal({ bin, items, timeLimitMs: 2500 });
      if (mine === computeSeq) set({ result: optimal, solving: false });
    } catch {
      if (mine === computeSeq) set({ solving: false }); // 后端不可用/超时：保留启发式结果
    }
  }

  return {
    bin: DEFAULT_BIN,
    products: [],
    quantities: {},
    result: null,
    computing: false,
    solving: false,
    loadError: null,
    selectedInstanceId: null,
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
    clearAll: () =>
      set({
        quantities: {},
        result: null,
        solving: false,
        computing: false,
        selectedInstanceId: null,
      }),
    selectInstance: (instanceId) => set({ selectedInstanceId: instanceId }),
  };
});
