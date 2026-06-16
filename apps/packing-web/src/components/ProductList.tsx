import { useDraggable } from "@dnd-kit/core";

import type { Product } from "@packing/contract";

import { usePackingStore } from "../store/packingStore";

function ProductCard({ product }: { product: Product }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: product.id });
  const qty = usePackingStore((s) => s.quantities[product.id] ?? 0);
  const addProduct = usePackingStore((s) => s.addProduct);
  const removeProduct = usePackingStore((s) => s.removeProduct);
  const d = product.dimensions;

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border border-slate-700 bg-slate-800 p-3 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          {...listeners}
          {...attributes}
          className="flex flex-1 cursor-grab items-center gap-3 active:cursor-grabbing"
        >
          {product.thumbnailUrl ? (
            <img src={product.thumbnailUrl} alt="" className="h-10 w-10 rounded object-cover" />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded bg-slate-700" />
          )}
          <div className="min-w-0">
            <div className="truncate font-medium">{product.name}</div>
            <div className="text-xs text-slate-400">
              {d.length}×{d.width}×{d.height} mm
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => removeProduct(product.id)}
            className="h-6 w-6 rounded bg-slate-700 text-slate-200 hover:bg-slate-600"
          >
            −
          </button>
          <span className="w-6 text-center text-sm tabular-nums">{qty}</span>
          <button
            type="button"
            onClick={() => addProduct(product.id)}
            className="h-6 w-6 rounded bg-sky-600 text-white hover:bg-sky-500"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProductList() {
  const products = usePackingStore((s) => s.products);
  const loadError = usePackingStore((s) => s.loadError);

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        商品（上架）
      </h2>
      {loadError ? (
        <div className="mb-3 rounded bg-red-950/50 p-3 text-sm text-red-300">
          加载失败：{loadError}
          <div className="mt-1 text-xs text-red-400/70">请确认后端已启动且有上架商品。</div>
        </div>
      ) : null}
      {!loadError && products.length === 0 ? (
        <div className="text-sm text-slate-500">暂无上架商品。去管理后台新增并上架。</div>
      ) : null}
      <div className="flex flex-col gap-2 overflow-y-auto pr-1">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
