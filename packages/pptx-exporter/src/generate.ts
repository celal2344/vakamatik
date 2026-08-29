import { fileURLToPath } from "node:url";
import { copyFile, mkdir } from "node:fs/promises";
import {
  gate1DentalInput,
  gate1OverlayInput,
  gate1VerticalInput,
  mediumProblemGoalPlanInput,
  fixtureAssetPaths,
} from "@vakamatik/test-fixtures";
import { createGate1Document } from "./document.js";
import { PptxGenJsExporter } from "./pptxgenjs-exporter.js";

const outputPath = fileURLToPath(new URL("../../../artifacts/gate-1/gate-1-spike.pptx", import.meta.url));
const artifactFixtureDirectory = fileURLToPath(new URL("../../../artifacts/gate-1/synthetic-fixtures/", import.meta.url));
const document = createGate1Document({
  dental: gate1DentalInput,
  overlay: gate1OverlayInput,
  vertical: gate1VerticalInput,
  plan: mediumProblemGoalPlanInput,
});
const exporter = new PptxGenJsExporter();
await mkdir(artifactFixtureDirectory, { recursive: true });
for (const sourcePath of Object.values(fixtureAssetPaths)) {
  const fileName = sourcePath.split(/[\\/]/u).at(-1);
  if (fileName === undefined) throw new Error(`Cannot determine fixture filename for ${sourcePath}`);
  await copyFile(sourcePath, fileURLToPath(new URL(fileName, `file:///${artifactFixtureDirectory.replaceAll("\\", "/")}/`)));
}
const result = await exporter.export(document, outputPath);

if (!result.validation.ok) {
  throw new Error(`Gate 1 export validation failed: ${JSON.stringify(result.validation.overflow, null, 2)}`);
}

process.stdout.write(`${result.outputPath}\n`);
