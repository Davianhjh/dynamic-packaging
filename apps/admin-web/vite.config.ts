import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
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
    port: 5174,
    // 开发期把 /api 代理到后端，避免 CORS；缩略图 URL 指向 MinIO，不走代理。
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          antd: ["antd", "@ant-design/icons"],
        },
      },
    },
  },
});
