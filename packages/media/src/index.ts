import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { existsSync } from "node:fs";
import { access, copyFile, mkdir, readFile, realpath, rename, rm, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import type sharpType from "sharp";
import { caseAssetSchema, type CaseAsset } from "@vakamatik/domain";

const MAX_INPUT_PIXELS = 64_000_000;
const electronResourcesPath = (process as NodeJS.Process & { readonly resourcesPath?: string }).resourcesPath;
const packagedRuntimeRoot =
  electronResourcesPath === undefined ? undefined : path.join(electronResourcesPath, ".runtime");
const requireBase =
  packagedRuntimeRoot !== undefined && existsSync(path.join(packagedRuntimeRoot, "node_modules", "sharp"))
    ? path.join(packagedRuntimeRoot, "entry.cjs")
    : path.join(process.cwd(), "vakamatik-runtime.cjs");
const sharp = createRequire(requireBase)("sharp") as typeof sharpType;

export async function resolveManagedRelativePath(
  caseRoot: string,
  relativePath: string,
  options: { mustExist: boolean },
): Promise<string> {
  if (
    relativePath.length === 0 ||
    path.isAbsolute(relativePath) ||
    relativePath.includes("\\") ||
    relativePath.split("/").includes("..")
  ) {
    throw new Error("Managed path traversal was rejected.");
  }

  const root = await realpath(caseRoot);
  const candidate = path.resolve(root, relativePath);
  assertInsideRoot(root, candidate);

  if (options.mustExist) {
    const resolved = await realpath(candidate);
    assertInsideRoot(root, resolved);
    return resolved;
  }

  const parent = await realpath(path.dirname(candidate));
  assertInsideRoot(root, parent);
  return candidate;
}

export async function importManagedImage(caseRoot: string, sourcePath: string): Promise<CaseAsset> {
  const source = await realpath(sourcePath);
  const sourceStat = await stat(source);
  if (!sourceStat.isFile()) throw new Error("Selected image is not a regular file.");

  const metadata = await sharp(source, {
    failOn: "error",
    limitInputPixels: MAX_INPUT_PIXELS,
  }).metadata();
  const imageFormat = metadata.format;
  if (imageFormat !== "jpeg" && imageFormat !== "png") {
    throw new Error("Only JPEG and PNG images are supported.");
  }

  const hash = await sha256File(source);
  const assetId = `sha256:${hash}`;
  const originalExtension = imageFormat === "jpeg" ? "jpg" : "png";
  const originalRelativePath = `assets/original/${hash}.${originalExtension}`;
  const normalizedRelativePath = `assets/normalized/${hash}.png`;
  const thumbnailRelativePath = `assets/thumbnails/${hash}.webp`;

  await ensureAssetDirectories(caseRoot);
  const originalPath = await resolveManagedRelativePath(caseRoot, originalRelativePath, { mustExist: false });
  const normalizedPath = await resolveManagedRelativePath(caseRoot, normalizedRelativePath, {
    mustExist: false,
  });
  const thumbnailPath = await resolveManagedRelativePath(caseRoot, thumbnailRelativePath, {
    mustExist: false,
  });

  await copyIfMissing(source, originalPath);
  if (!(await exists(normalizedPath))) {
    await writeDerivativeAtomically(
      normalizedPath,
      sharp(source, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS })
        .rotate()
        .png({ compressionLevel: 9 }),
    );
  }
  if (!(await exists(thumbnailPath))) {
    await writeDerivativeAtomically(
      thumbnailPath,
      sharp(normalizedPath, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS })
        .resize({ width: 360, height: 260, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 }),
    );
  }

  const normalizedMetadata = await sharp(normalizedPath).metadata();
  if (normalizedMetadata.width === undefined || normalizedMetadata.height === undefined) {
    throw new Error("Normalized image dimensions could not be read.");
  }

  return caseAssetSchema.parse({
    assetId,
    displayName: path.basename(source).slice(0, 180),
    mimeType: imageFormat === "jpeg" ? "image/jpeg" : "image/png",
    width: normalizedMetadata.width,
    height: normalizedMetadata.height,
    originalRelativePath,
    normalizedRelativePath,
    thumbnailRelativePath,
  });
}

export async function readThumbnailDataUrl(caseRoot: string, asset: CaseAsset): Promise<string> {
  const thumbnailPath = await resolveManagedRelativePath(caseRoot, asset.thumbnailRelativePath, {
    mustExist: true,
  });
  return `data:image/webp;base64,${(await readFile(thumbnailPath)).toString("base64")}`;
}

function assertInsideRoot(root: string, candidate: string): void {
  const relative = path.relative(root, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Managed path escaped the case folder.");
  }
}

async function ensureAssetDirectories(caseRoot: string): Promise<void> {
  await Promise.all(
    ["assets/original", "assets/normalized", "assets/thumbnails"].map((relativePath) =>
      mkdir(path.join(caseRoot, relativePath), { recursive: true }),
    ),
  );
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

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function copyIfMissing(source: string, destination: string): Promise<void> {
  if (await exists(destination)) return;
  const temporaryPath = `${destination}.tmp-${randomUUID()}`;
  try {
    await copyFile(source, temporaryPath);
    await rename(temporaryPath, destination);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

async function writeDerivativeAtomically(
  destination: string,
  pipeline: ReturnType<typeof sharp>,
): Promise<void> {
  const temporaryPath = `${destination}.tmp-${randomUUID()}`;
  try {
    await pipeline.toFile(temporaryPath);
    await rename(temporaryPath, destination);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}
