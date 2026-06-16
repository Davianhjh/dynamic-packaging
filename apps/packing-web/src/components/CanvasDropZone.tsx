import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

/** 把 3D 画布包成 dnd-kit 放置区；drop 仅触发“加入商品”，摆放交算法。 */
export function CanvasDropZone({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "bin-canvas" });
  return (
    <div ref={setNodeRef} className="relative h-full w-full">
      {children}
      {isOver ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-sky-500/10 ring-2 ring-inset ring-sky-400">
          <span className="rounded bg-sky-500/90 px-3 py-1 text-sm font-medium text-white">
            松开以加入箱体
          </span>
        </div>
      ) : null}
    </div>
  );
}
