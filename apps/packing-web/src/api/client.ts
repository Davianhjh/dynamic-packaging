// 装箱端只读取上架商品，无需鉴权。开发期 /api 由 Vite 代理到后端。
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`请求失败 (${res.status})`);
  return (await res.json()) as T;
}
