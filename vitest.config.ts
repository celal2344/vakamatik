import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@vakamatik/export-contract": resolve(import.meta.dirname, "packages/export-contract/src/index.ts"),
      "@vakamatik/test-fixtures": resolve(import.meta.dirname, "packages/test-fixtures/src/index.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/gate-2/electron/**", "**/node_modules/**", "**/dist/**", "**/.vite/**", "**/out/**"],
  },
});
