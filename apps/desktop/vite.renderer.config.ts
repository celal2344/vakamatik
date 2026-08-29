import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react()],
  root: resolve(import.meta.dirname, "src/renderer"),
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  build: {
    emptyOutDir: true,
    outDir: resolve(import.meta.dirname, ".vite/renderer"),
    target: "chrome142",
  },
});
