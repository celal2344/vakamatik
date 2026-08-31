import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, open, readFile, realpath, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import {
  caseDocumentSchema,
  alignmentStateSchema,
  clinicalDataSchema,
  createCaseDocument,
  presentationSettingsSchema,
  recordSlotIdSchema,
  type AlignmentState,
  type CaseDocument,
  type ClinicalData,
  type PresentationSettings,
  type RecordSlotId,
} from "@vakamatik/domain";
import { importManagedImage, resolveManagedRelativePath } from "@vakamatik/media";

const CASE_FILE_NAME = "case.json";

export interface OpenManagedCase {
  readonly root: string;
  readonly document: CaseDocument;
}

export interface ManagedAssetRepairResult extends OpenManagedCase {
  readonly remainingMissingAssetIds: readonly string[];
}

export async function createManagedCase(parentDirectory: string, title: string): Promise<OpenManagedCase> {
  const parent = await realpath(parentDirectory);
  if (!(await stat(parent)).isDirectory()) throw new Error("Cases location is not a directory.");

  const caseId = randomUUID();
  const caseRoot = path.join(parent, `vakamatik-${caseId}`);
  await mkdir(caseRoot, { recursive: false });
  await Promise.all(
    ["assets/original", "assets/normalized", "assets/thumbnails"].map((relativePath) =>
      mkdir(path.join(caseRoot, relativePath), { recursive: true }),
    ),
  );
  const now = new Date().toISOString();
  const document = createCaseDocument(caseId, title, now);
  await saveManagedCase(caseRoot, document);
  return { root: await realpath(caseRoot), document };
}

export async function openManagedCase(caseDirectory: string): Promise<OpenManagedCase> {
  const { root, document } = await readManagedCaseDocument(caseDirectory);

  for (const asset of Object.values(document.assets)) {
    await Promise.all([
      resolveManagedRelativePath(root, asset.originalRelativePath, { mustExist: true }),
      resolveManagedRelativePath(root, asset.normalizedRelativePath, { mustExist: true }),
      resolveManagedRelativePath(root, asset.thumbnailRelativePath, { mustExist: true }),
    ]);
  }
  return { root, document };
}

export async function relinkMissingManagedAsset(
  caseDirectory: string,
  sourcePath: string,
): Promise<ManagedAssetRepairResult> {
  const opened = await readManagedCaseDocument(caseDirectory);
  const source = await realpath(sourcePath);
  if (!(await stat(source)).isFile()) throw new Error("Selected replacement is not a regular file.");
  const assetId = `sha256:${await sha256File(source)}`;
  if (opened.document.assets[assetId] === undefined) {
    throw new Error("Selected file does not match an asset in this case.");
  }
  const missingBefore = await missingManagedAssetIds(opened);
  if (!missingBefore.includes(assetId)) {
    throw new Error("Selected file does not match a missing asset.");
  }

  const imported = await importManagedImage(opened.root, source);
  if (imported.assetId !== assetId) throw new Error("Replacement asset identity changed during import.");
  return { ...opened, remainingMissingAssetIds: await missingManagedAssetIds(opened) };
}

export async function saveManagedCase(caseRoot: string, document: CaseDocument): Promise<void> {
  const root = await realpath(caseRoot);
  const parsed = caseDocumentSchema.parse(document);
  const destination = path.join(root, CASE_FILE_NAME);
  const temporaryPath = path.join(root, `.case.json.tmp-${randomUUID()}`);
  const handle = await open(temporaryPath, "wx");
  try {
    await handle.writeFile(`${JSON.stringify(parsed, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temporaryPath, destination);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export async function updateManagedCaseTitle(
  opened: OpenManagedCase,
  expectedRevision: number,
  title: string,
): Promise<OpenManagedCase> {
  assertRevision(opened.document, expectedRevision);
  const updated = caseDocumentSchema.parse({
    ...opened.document,
    title,
    revision: opened.document.revision + 1,
    updatedAt: new Date().toISOString(),
  });
  await saveManagedCase(opened.root, updated);
  return { ...opened, document: updated };
}

export async function assignImportedImage(
  opened: OpenManagedCase,
  expectedRevision: number,
  slotId: RecordSlotId,
  sourcePath: string,
): Promise<OpenManagedCase> {
  assertRevision(opened.document, expectedRevision);
  const parsedSlotId = recordSlotIdSchema.parse(slotId);
  const importedAsset = await importManagedImage(opened.root, sourcePath);
  const asset = opened.document.assets[importedAsset.assetId] ?? importedAsset;
  const updated = caseDocumentSchema.parse({
    ...opened.document,
    revision: opened.document.revision + 1,
    updatedAt: new Date().toISOString(),
    assets: { ...opened.document.assets, [asset.assetId]: asset },
    assignments: { ...opened.document.assignments, [parsedSlotId]: asset.assetId },
  });
  await saveManagedCase(opened.root, updated);
  return { ...opened, document: updated };
}

export async function updateManagedCaseClinical(
  opened: OpenManagedCase,
  expectedRevision: number,
  clinical: ClinicalData,
  presentation: PresentationSettings,
): Promise<OpenManagedCase> {
  assertRevision(opened.document, expectedRevision);
  const updated = caseDocumentSchema.parse({
    ...opened.document,
    clinical: clinicalDataSchema.parse(clinical),
    presentation: {
      ...presentationSettingsSchema.parse(presentation),
      acknowledgedWarningKeys: [],
    },
    revision: opened.document.revision + 1,
    updatedAt: new Date().toISOString(),
  });
  await saveManagedCase(opened.root, updated);
  return { ...opened, document: updated };
}

export async function updateManagedCaseAlignment(
  opened: OpenManagedCase,
  expectedRevision: number,
  alignment: AlignmentState,
): Promise<OpenManagedCase> {
  assertRevision(opened.document, expectedRevision);
  const updated = caseDocumentSchema.parse({
    ...opened.document,
    alignment: alignmentStateSchema.parse(alignment),
    revision: opened.document.revision + 1,
    updatedAt: new Date().toISOString(),
  });
  await saveManagedCase(opened.root, updated);
  return { ...opened, document: updated };
}

export async function acknowledgeManagedCaseWarnings(
  opened: OpenManagedCase,
  expectedRevision: number,
  warningKeys: readonly string[],
): Promise<OpenManagedCase> {
  assertRevision(opened.document, expectedRevision);
  const updated = caseDocumentSchema.parse({
    ...opened.document,
    presentation: {
      ...opened.document.presentation,
      acknowledgedWarningKeys: [...new Set(warningKeys)].sort(),
    },
    revision: opened.document.revision + 1,
    updatedAt: new Date().toISOString(),
  });
  await saveManagedCase(opened.root, updated);
  return { ...opened, document: updated };
}

function assertRevision(document: CaseDocument, expectedRevision: number): void {
  if (document.revision !== expectedRevision) {
    throw new Error("Case revision is stale. Reopen the case and retry.");
  }
}

async function readManagedCaseDocument(caseDirectory: string): Promise<OpenManagedCase> {
  const root = await realpath(caseDirectory);
  if (!(await stat(root)).isDirectory()) throw new Error("Selected case is not a directory.");
  const raw = await readFile(path.join(root, CASE_FILE_NAME), "utf8");
  const document = caseDocumentSchema.parse(JSON.parse(raw) as unknown);
  return { root, document };
}

async function missingManagedAssetIds(opened: OpenManagedCase): Promise<readonly string[]> {
  const missing: string[] = [];
  for (const asset of Object.values(opened.document.assets)) {
    try {
      await Promise.all([
        resolveManagedRelativePath(opened.root, asset.originalRelativePath, { mustExist: true }),
        resolveManagedRelativePath(opened.root, asset.normalizedRelativePath, { mustExist: true }),
        resolveManagedRelativePath(opened.root, asset.thumbnailRelativePath, { mustExist: true }),
      ]);
    } catch {
      missing.push(asset.assetId);
    }
  }
  return missing;
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.once("error", reject);
    stream.once("end", resolve);
  });
  return hash.digest("hex");
}
