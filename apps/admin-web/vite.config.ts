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
  },
});
