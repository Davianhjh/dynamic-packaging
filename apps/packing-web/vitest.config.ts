import path from "node:path";

import { defineConfig } from "vitest/config";

// 独立的 vitest 配置：只需契约别名 + node 环境，跑纯函数装箱算法测试。
export default defineConfig({
  resolve: {
    alias: {
      "@packing/contract": path.resolve(
        import.meta.dirname,
        "../../packages/contract/src/index.ts",
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
