import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const allowedTextExtensions = new Set([".ts", ".cs", ".ps1", ".json", ".md", ".xml", ".rels"]);
const phiCanary = ["PHI_CANARY_DO_NOT_EMIT_47F2", "resources/", "resources\\"];

function textFiles(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((name) => {
    if (["bin", "obj", "node_modules"].includes(name)) return [];
    const child = join(path, name);
    return statSync(child).isDirectory() ? textFiles(child) : allowedTextExtensions.has(extname(child).toLowerCase()) ? [child] : [];
  });
}

describe("synthetic-only Gate 1 evidence", () => {
  test("owned QA source and evidence contain no PHI canary or patient-source path", () => {
    const roots = [
      resolve(root, "tools/pptx-validator"),
      resolve(root, "tools/powerpoint"),
      resolve(root, "tests/gate-1"),
      resolve(root, "artifacts/gate-1/validation"),
    ].filter((path) => {
      try { return statSync(path).isDirectory(); } catch { return false; }
    });
    const hits: string[] = [];
    for (const file of roots.flatMap(textFiles)) {
      const text = readFileSync(file, "utf8");
      for (const marker of phiCanary) {
        if (text.includes(marker) && !file.endsWith("privacy.test.ts") && !file.endsWith("Program.cs")) hits.push(`${file}: ${marker}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
