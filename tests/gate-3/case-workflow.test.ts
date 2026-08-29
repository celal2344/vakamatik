import { copyFile, mkdir, mkdtemp, readFile, readdir, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
  assignImportedImage,
  createManagedCase,
  openManagedCase,
  updateManagedCaseTitle,
} from "../../packages/case-store/src/index.js";
import { resolveManagedRelativePath } from "../../packages/media/src/index.js";

const temporaryRoots: string[] = [];
const syntheticFixture = path.resolve("packages/test-fixtures/assets/dental-intraoral.png");

async function createWorkspace(): Promise<{ root: string; cases: string; sources: string }> {
  const root = await mkdtemp(path.join(tmpdir(), "vakamatik-gate3-"));
  temporaryRoots.push(root);
  const cases = path.join(root, "cases");
  const sources = path.join(root, "sources");
  await Promise.all([mkdir(cases), mkdir(sources)]);
  return { root, cases, sources };
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

describe("managed case workflow", () => {
  test("creates, atomically saves, closes, and reopens a versioned case", async () => {
    const workspace = await createWorkspace();
    const created = await createManagedCase(workspace.cases, "Synthetic Case");
    const saved = await updateManagedCaseTitle(created, 0, "Synthetic Case — Updated");

    const reopened = await openManagedCase(saved.root);
    expect(reopened.document).toMatchObject({
      schemaVersion: 1,
      caseId: created.document.caseId,
      revision: 1,
      title: "Synthetic Case — Updated",
    });
    expect(await readdir(saved.root)).not.toContain(expect.stringContaining(".tmp-"));
    expect(JSON.parse(await readFile(path.join(saved.root, "case.json"), "utf8"))).toEqual(reopened.document);
  });

  test("copies an imported image while leaving the source bytes unchanged", async () => {
    const workspace = await createWorkspace();
    const source = path.join(workspace.sources, "synthetic-source.png");
    await copyFile(syntheticFixture, source);
    const before = await readFile(source);
    const created = await createManagedCase(workspace.cases, "Synthetic Import");

    const assigned = await assignImportedImage(created, 0, "intraoral_front", source);

    expect(await readFile(source)).toEqual(before);
    const assetId = assigned.document.assignments.intraoral_front;
    expect(assetId).toMatch(/^sha256:/u);
    const asset = assetId === undefined ? undefined : assigned.document.assets[assetId];
    expect(asset?.normalizedRelativePath).toMatch(/\.png$/u);
    expect(asset?.thumbnailRelativePath).toMatch(/\.webp$/u);
  });

  test("reuses one managed asset for duplicate image content", async () => {
    const workspace = await createWorkspace();
    const firstSource = path.join(workspace.sources, "first.png");
    const secondSource = path.join(workspace.sources, "second.png");
    await Promise.all([copyFile(syntheticFixture, firstSource), copyFile(syntheticFixture, secondSource)]);
    const created = await createManagedCase(workspace.cases, "Synthetic Deduplication");

    const first = await assignImportedImage(created, 0, "intraoral_front", firstSource);
    const second = await assignImportedImage(first, 1, "model_front", secondSource);

    expect(second.document.assignments.intraoral_front).toBe(second.document.assignments.model_front);
    expect(Object.keys(second.document.assets)).toHaveLength(1);
    expect(await readdir(path.join(second.root, "assets", "original"))).toHaveLength(1);
  });

  test("rejects traversal and absolute access outside the managed case root", async () => {
    const workspace = await createWorkspace();
    const created = await createManagedCase(workspace.cases, "Synthetic Boundary");

    await expect(
      resolveManagedRelativePath(created.root, "../outside.png", { mustExist: false }),
    ).rejects.toThrow(/traversal/u);
    await expect(
      resolveManagedRelativePath(created.root, path.join(workspace.root, "outside.png"), {
        mustExist: false,
      }),
    ).rejects.toThrow(/traversal/u);
  });

  test("reopens with intact assignments after the complete case folder moves", async () => {
    const workspace = await createWorkspace();
    const destinationParent = path.join(workspace.root, "moved-cases");
    await mkdir(destinationParent);
    const source = path.join(workspace.sources, "portable.png");
    await copyFile(syntheticFixture, source);
    const created = await createManagedCase(workspace.cases, "Synthetic Portable Case");
    const assigned = await assignImportedImage(created, 0, "intraoral_front", source);
    const movedRoot = path.join(destinationParent, path.basename(assigned.root));

    await rename(assigned.root, movedRoot);
    const reopened = await openManagedCase(movedRoot);

    expect(reopened.document.assignments).toEqual(assigned.document.assignments);
    const assetId = reopened.document.assignments.intraoral_front;
    const asset = assetId === undefined ? undefined : reopened.document.assets[assetId];
    expect(asset).toBeDefined();
    if (asset !== undefined) {
      await expect(
        resolveManagedRelativePath(reopened.root, asset.thumbnailRelativePath, { mustExist: true }),
      ).resolves.toMatch(/assets[\\/]thumbnails/u);
    }
  });
});
