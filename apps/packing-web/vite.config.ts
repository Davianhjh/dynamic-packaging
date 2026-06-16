import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// 共享契约以源码形式直接被各前端消费：用别名指向 packages/contract 源文件，
// 避免 node_modules 中 TS 源不被 Vite 转译的问题。
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@packing/contract": path.resolve(
        import.meta.dirname,
        "../../packages/contract/src/index.ts",
      ),
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  server: {
    port: 5173,
    // 开发期把 /api 代理到后端，拉取上架商品列表。
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
