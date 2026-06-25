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
  notice: string | null; // 居中浮层提示 (自动消失)
  confirmed: boolean; // 清单已确认 → 锁定编辑
  loadProducts: () => Promise<void>;
  addProduct: (productId: string) => void;
  removeProduct: (productId: string) => void;
  clearAll: () => void;
  selectInstance: (instanceId: string | null) => void;
  setConfirmed: (value: boolean) => void;
}

let computeSeq = 0;
let noticeSeq = 0;

export const usePackingStore = create<PackingState>((set, get) => {
  function itemsFor(quantities: Record<string, number>): PackItem[] {
    return get()
      .products.filter((p) => (quantities[p.id] ?? 0) > 0)
      .map((p) => ({
        productId: p.id,
        name: p.name,
        dimensions: p.dimensions,
        quantity: quantities[p.id] ?? 0,
      }));
  }

  /**
   * 为给定数量求解（即时层 + 必要时 handoff 后端）。
   * 只更新 computing/solving 指示，**不改 quantities/result**——由调用方决定是否提交，
   * 这样“放不下”时显示的布局保持不变，绝不动已装好的箱子。
   */
  async function solveFor(quantities: Record<string, number>): Promise<PackResult | null> {
    const items = itemsFor(quantities);
    if (items.length === 0) {
      set({ computing: false, solving: false });
      return null;
    }
    const { bin } = get();
    const mine = ++computeSeq;

    set({ computing: true });
    const heuristic = await solveAsync({ bin, items, timeLimitMs: 2500 });
    if (mine !== computeSeq) return null;

    if (!heuristic.isFull) {
      set({ computing: false, solving: false });
      return heuristic;
    }
    // 启发式放不下 → 整批交后端求最优
    set({ computing: false, solving: true });
    try {
      const optimal = await solveOptimal({ bin, items, timeLimitMs: 2500 });
      if (mine !== computeSeq) return null;
      set({ solving: false });
      return optimal;
    } catch {
      if (mine === computeSeq) set({ solving: false });
      return heuristic; // 后端不可用：以启发式结论为准
    }
  }

  function notify(message: string): void {
    const id = ++noticeSeq;
    set({ notice: message });
    setTimeout(() => {
      if (noticeSeq === id) set({ notice: null });
    }, 3000);
  }

  // 串行化增删，避免并发求解互相覆盖、数量越界。
  let opChain: Promise<void> = Promise.resolve();
  function enqueue(task: () => Promise<void>): void {
    opChain = opChain.then(task).catch(() => undefined);
  }

  async function doAdd(productId: string): Promise<void> {
    const current = get().quantities;
    const tentative = { ...current, [productId]: (current[productId] ?? 0) + 1 };
    const next = await solveFor(tentative);
    if (next === null) return; // 被更晚的操作顶替
    if (next.isFull) {
      // 放不下：不提交这次加入，保持现状（其他箱子原样不动）
      notify("当前无法再装入");
      return;
    }
    set({ quantities: tentative, result: next });
  }

  async function doRemove(productId: string): Promise<void> {
    const next = { ...get().quantities };
    const n = (next[productId] ?? 0) - 1;
    if (n <= 0) delete next[productId];
    else next[productId] = n;
    const result = await solveFor(next);
    set({ quantities: next, result }); // 移除不会越界，直接提交
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
    notice: null,
    confirmed: false,
    loadProducts: async () => {
      try {
        set({ products: await getOnShelf(), loadError: null });
      } catch (err) {
        set({ products: [], loadError: err instanceof Error ? err.message : "加载商品失败" });
      }
    },
    addProduct: (productId) => {
      if (get().confirmed) return; // 已确认锁定，禁止增改
      enqueue(() => doAdd(productId));
    },
    removeProduct: (productId) => {
      if (get().confirmed) return;
      enqueue(() => doRemove(productId));
    },
    clearAll: () =>
      set({
        quantities: {},
        result: null,
        solving: false,
        computing: false,
        selectedInstanceId: null,
        notice: null,
        confirmed: false,
      }),
    selectInstance: (instanceId) => set({ selectedInstanceId: instanceId }),
    setConfirmed: (value) => set({ confirmed: value }),
  };
});
