const { MakerSquirrel } = require("@electron-forge/maker-squirrel");
const { MakerZIP } = require("@electron-forge/maker-zip");
const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");

module.exports = {
  packagerConfig: {
    asar: true,
    executableName: "Vakamatik",
    ignore: [
      /^\/node_modules(?:\/|$)/,
      /^\/src(?:\/|$)/,
      /^\/forge\.config\.cjs$/,
      /^\/tsconfig\..*\.json$/,
      /^\/vite\..*\.ts$/,
    ],
    name: "Vakamatik",
    prune: false,
  },
  rebuildConfig: {},
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
