import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/gate-2/electron/**", "**/node_modules/**", "**/dist/**", "**/.vite/**", "**/out/**"],
  },
});
