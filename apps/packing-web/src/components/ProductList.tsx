import { useDraggable } from "@dnd-kit/core";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

import type { Product } from "@packing/contract";

import { usePackingStore } from "../store/packingStore";

function ProductCard({ product }: { product: Product }) {
  const confirmed = usePackingStore((s) => s.confirmed);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: product.id,
    disabled: confirmed,
  });
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
            disabled={confirmed}
            onClick={() => removeProduct(product.id)}
            className="h-6 w-6 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>
          <span className="w-6 text-center text-sm tabular-nums">{qty}</span>
          <button
            type="button"
            disabled={confirmed}
            onClick={() => addProduct(product.id)}
            className="h-6 w-6 rounded bg-sky-600 text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
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

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 76,
    overscan: 6,
  });

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
      {/* 虚拟滚动：仅渲染可见区，大量商品时不掉帧 */}
      <div ref={parentRef} className="flex-1 overflow-y-auto pr-1">
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((vi) => (
            <div
              key={products[vi.index].id}
              ref={virtualizer.measureElement}
              data-index={vi.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vi.start}px)`,
                paddingBottom: 8,
              }}
            >
              <ProductCard product={products[vi.index]} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
