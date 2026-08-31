import { access, readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import electronFuses from "@electron/fuses";

const { FuseV1Options, getCurrentFuseWire } = electronFuses;
const FUSE_DISABLED = 48;
const FUSE_ENABLED = 49;
const inspectOnly = process.argv.includes("--inspect-only");

const root = process.cwd();
const outputRoot = path.join(root, "apps", "desktop", "out");
const platformToken = process.platform === "win32" ? "win32" : process.platform;
const packageDirectory = (await readdir(outputRoot)).find((entry) =>
  entry.startsWith(`Vakamatik-${platformToken}-`),
);
if (packageDirectory === undefined)
  throw new Error(`No packaged Vakamatik application found for ${process.platform}.`);
const packagePath = path.join(outputRoot, packageDirectory);

const executable =
  process.platform === "win32"
    ? path.join(packagePath, "Vakamatik.exe")
    : process.platform === "darwin"
      ? path.join(packagePath, "Vakamatik.app", "Contents", "MacOS", "Vakamatik")
      : path.join(packagePath, "Vakamatik");

const asarPath =
  process.platform === "darwin"
    ? path.join(packagePath, "Vakamatik.app", "Contents", "Resources", "app.asar")
    : path.join(packagePath, "resources", "app.asar");

await access(executable);
await access(asarPath);

const fuseWire = await getCurrentFuseWire(executable);
const expectedFuses = new Map([
  [FuseV1Options.RunAsNode, FUSE_DISABLED],
  [FuseV1Options.EnableCookieEncryption, FUSE_ENABLED],
  [FuseV1Options.EnableNodeOptionsEnvironmentVariable, FUSE_DISABLED],
  [FuseV1Options.EnableNodeCliInspectArguments, FUSE_DISABLED],
  [FuseV1Options.EnableEmbeddedAsarIntegrityValidation, FUSE_ENABLED],
  [FuseV1Options.OnlyLoadAppFromAsar, FUSE_ENABLED],
  [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot, FUSE_DISABLED],
  [FuseV1Options.GrantFileProtocolExtraPrivileges, FUSE_DISABLED],
]);
for (const [fuse, expected] of expectedFuses) {
  if (fuseWire[fuse] !== expected) {
    throw new Error(
      `Packaged Electron fuse ${String(FuseV1Options[fuse])} has unexpected state ${String(fuseWire[fuse])}.`,
    );
  }
}

process.stdout.write(`Packaged ASAR and all ${String(expectedFuses.size)} expected Electron fuses passed.\n`);
if (inspectOnly) process.exit(0);

let child;
try {
  child = spawn(executable, [], {
    env: { ...process.env, VAKAMATIK_SMOKE_TEST: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (error) {
  throw new Error(
    "The packaged executable could not start. Inspect the operating system Code Integrity or Gatekeeper logs before changing the package.",
    { cause: error },
  );
}

let output = "";
child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  output += chunk;
});
child.stderr.on("data", (chunk) => {
  output += chunk;
});

const timeout = setTimeout(() => child.kill(), 30_000);
const exitCode = await new Promise((resolve) => child.once("exit", resolve));
clearTimeout(timeout);

if (exitCode !== 0 || !output.includes("VAKAMATIK_SMOKE_READY")) {
  throw new Error(`Packaged Vakamatik smoke failed (exit ${String(exitCode)}).\n${output}`);
}

process.stdout.write(`Packaged Vakamatik launched and exited cleanly: ${executable}\n`);
