import { builtinModules } from "node:module";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, "src/preload/index.ts"),
      formats: ["cjs"],
      fileName: () => "preload.cjs",
    },
    outDir: resolve(import.meta.dirname, ".vite/build"),
    rollupOptions: {
      external: ["electron", ...builtinModules, ...builtinModules.map((name) => `node:${name}`)],
    },
    sourcemap: true,
    target: "node24",
  },
});
