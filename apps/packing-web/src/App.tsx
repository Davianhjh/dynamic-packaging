import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useEffect, useState } from "react";

import { CanvasDropZone } from "./components/CanvasDropZone";
import { ManifestPanel } from "./components/ManifestPanel";
import { ProductList } from "./components/ProductList";
import { SelectionInfo } from "./components/SelectionInfo";
import { StatsPanel } from "./components/StatsPanel";
import { BinScene } from "./scene/BinScene";
import { usePackingStore } from "./store/packingStore";

export default function App() {
  const loadProducts = usePackingStore((s) => s.loadProducts);
  const addProduct = usePackingStore((s) => s.addProduct);
  const products = usePackingStore((s) => s.products);
  const bin = usePackingStore((s) => s.bin);
  const result = usePackingStore((s) => s.result);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (e.over?.id === "bin-canvas") addProduct(String(e.active.id));
  };

  const activeProduct = products.find((p) => p.id === activeId);

  return (
    <DndContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
        <aside className="w-72 shrink-0 overflow-hidden border-r border-slate-800 p-4">
          <ProductList />
        </aside>
        <main className="relative flex-1">
          <CanvasDropZone>
            <BinScene bin={bin} result={result} />
          </CanvasDropZone>
          <SelectionInfo />
        </main>
        <aside className="flex w-72 shrink-0 flex-col border-l border-slate-800 p-4">
          <div className="min-h-0 flex-1">
            <StatsPanel />
          </div>
          <ManifestPanel />
        </aside>
      </div>
      <DragOverlay>
        {activeProduct ? (
          <div className="rounded-lg border border-sky-400 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-lg">
            {activeProduct.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
