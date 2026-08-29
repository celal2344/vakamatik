const { MakerSquirrel } = require("@electron-forge/maker-squirrel");
const { MakerZIP } = require("@electron-forge/maker-zip");
const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");
const { cpSync, mkdirSync, rmSync } = require("node:fs");
const path = require("node:path");

const runtimeStage = path.join(__dirname, ".runtime");
const workspaceNodeModules = path.resolve(__dirname, "..", "..", "node_modules");

function stageSharpRuntime() {
  rmSync(runtimeStage, { force: true, recursive: true });
  const destination = path.join(runtimeStage, "node_modules");
  mkdirSync(destination, { recursive: true });
  for (const dependency of ["sharp", "detect-libc", "semver", "@img"]) {
    cpSync(path.join(workspaceNodeModules, dependency), path.join(destination, dependency), {
      recursive: true,
    });
  }
}

function clearSharpRuntime() {
  rmSync(runtimeStage, { force: true, recursive: true });
}

module.exports = {
  packagerConfig: {
    asar: true,
    extraResource: [runtimeStage],
    executableName: "Vakamatik",
    ignore: [
      /^\/node_modules(?:\/|$)/,
      /^\/\.runtime(?:\/|$)/,
      /^\/src(?:\/|$)/,
      /^\/forge\.config\.cjs$/,
      /^\/tsconfig\..*\.json$/,
      /^\/vite\..*\.ts$/,
    ],
    name: "Vakamatik",
    prune: false,
  },
  rebuildConfig: {},
  hooks: {
    generateAssets: async () => stageSharpRuntime(),
    postPackage: async () => clearSharpRuntime(),
  },
  makers: [new MakerSquirrel({ name: "vakamatik" }), new MakerZIP({}, ["darwin"])],
  plugins: [
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
      [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
      [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
    }),
  ],
};
