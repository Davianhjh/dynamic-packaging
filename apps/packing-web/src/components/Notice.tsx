import { usePackingStore } from "../store/packingStore";

/** 居中浮层提示（如“当前无法再装入”），由 store 控制、3 秒后自动消失。 */
export function Notice() {
  const notice = usePackingStore((s) => s.notice);
  if (!notice) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div className="rounded-lg bg-slate-900/90 px-6 py-4 text-base font-medium text-amber-300 shadow-2xl ring-1 ring-amber-400/40 backdrop-blur">
        {notice}
      </div>
    </div>
  );
}
