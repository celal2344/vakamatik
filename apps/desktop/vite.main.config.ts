import { builtinModules } from "node:module";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: resolve(import.meta.dirname, "src/main/index.ts"),
      formats: ["cjs"],
      fileName: () => "main.cjs",
    },
    outDir: resolve(import.meta.dirname, ".vite/build"),
    rollupOptions: {
      external: ["electron", ...builtinModules, ...builtinModules.map((name) => `node:${name}`)],
    },
    sourcemap: true,
    target: "node24",
  },
});
