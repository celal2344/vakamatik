import path from "node:path";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: path.resolve(import.meta.dirname, "electron"),
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: "line",
  use: { trace: "retain-on-failure" },
  outputDir: path.resolve(import.meta.dirname, "../../test-results/electron"),
});
