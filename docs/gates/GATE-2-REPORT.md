# Gate 2 report: Workspace and hardened Electron shell

Date: 2026-08-30
Status: Implementation complete; pending product-owner/consultant acceptance
Gate 3: Not started

## Delivered scope

Gate 2 establishes the reproducible desktop foundation only. It adds a normalized pnpm workspace, exact toolchain pins, strict TypeScript, one ESLint/Prettier setup, a minimal Turkish React shell, separated Electron main/preload/renderer processes, a frozen typed bridge, a restricted packaged-content protocol, Electron Forge packaging, security tests, package smoke tooling, and Windows/macOS CI jobs.

No case storage, patient forms, Record Board, clinical inputs, media import, slide editing, exporter expansion, authentication, encryption, signing, updating, telemetry, or Gate 3 functionality was added.

## Architecture and bridge contract

The renderer is an unprivileged React application. The preload exposes exactly `window.vakamatik` with:

- `getAppInfo(): Promise<{ name, version, platform }>`
- `ping({ nonce }): Promise<{ nonce, status: "ok" }>`

The canonical contract is in `packages/desktop-contract` and `docs/contracts/DESKTOP_BRIDGE.md`. Zod schemas are strict, so unknown properties and malformed payloads fail. Preload validates request and response values; main validates again and checks the exact sender `WebContents`, main frame, and trusted origin before executing a handler. IPC channel constants are isolated from renderer imports.

Production loads only `vakamatik://app/index.html`. The protocol resolves allowlisted asset types inside `.vite/renderer`, rejects credentials, ports, queries, fragments, malformed encoding, encoded traversal, backslashes, and root escapes, and returns a production CSP header. Development accepts only an explicitly configured loopback HTTP origin.

## Exact pinned versions

| Component                               | Version                      |
| --------------------------------------- | ---------------------------- |
| Node.js                                 | 24.15.0                      |
| pnpm                                    | 10.17.1                      |
| Electron                                | 44.0.0                       |
| Electron Forge CLI, makers, fuse plugin | 7.11.2                       |
| `@electron/fuses`                       | 1.8.0                        |
| React / React DOM                       | 19.2.8                       |
| React Router DOM                        | 7.18.3                       |
| TypeScript                              | 6.0.3                        |
| Vite                                    | 8.2.2                        |
| React Vite plugin                       | 6.1.1                        |
| Zod                                     | 4.5.2                        |
| Vitest                                  | 4.1.11                       |
| Playwright                              | 1.62.1                       |
| ESLint                                  | 10.9.1                       |
| typescript-eslint                       | 8.68.0                       |
| Prettier                                | 3.9.6                        |
| PptxGenJS                               | 4.0.1, preserved from Gate 1 |

TypeScript 6.0.3 replaces Gate 1's prerelease TypeScript 7 pin because it is the exact stable version compatible with the selected current lint toolchain. Strict compiler options remain enabled workspace-wide.

## Security controls

- `contextIsolation: true`, `nodeIntegration: false`, Chromium `sandbox: true`, and `webSecurity: true`.
- One frozen named preload API; no renderer `ipcRenderer`, generic invoke/send, Node globals, `fs`, `path`, shell, dialog, URL, filename, or raw path capability.
- Runtime request and response validation in preload and main.
- Sender, frame, and origin validation for every IPC handler.
- Standard and secure local application protocol with path traversal and asset-type rejection.
- Production CSP denies by default and permits no unsafe script execution or remote network origin.
- Loopback-only development server.
- Unexpected navigation, webviews, popups, and new windows denied.
- Permission checks and requests denied by default.
- No external URL opener, remote renderer, analytics, telemetry, crash upload, updater, or hidden network integration.
- ASAR packaging with RunAsNode, Node options, CLI inspect, V8 snapshot loading, and extra file-protocol privileges disabled; cookie encryption, embedded ASAR integrity, and only-load-from-ASAR enabled.
- Bundled runtime output means packaged application code needs no production `node_modules` tree.

## Stable root commands

```text
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test:unit
pnpm test:electron-dev
pnpm test:electron
pnpm package
pnpm test:package-smoke
pnpm verify
```

All commands are Windows-compatible PowerShell commands and use the installed pnpm directly; Corepack is not used.

## Commands executed and local results

| Command                                 | Result                                                                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile`        | Pass; clean hoisted install with the exact lockfile.                                                                                                               |
| `pnpm typecheck`                        | Pass.                                                                                                                                                              |
| `pnpm lint`                             | Pass.                                                                                                                                                              |
| `pnpm format:check`                     | Pass after formatting Gate 2-owned files.                                                                                                                          |
| `pnpm build`                            | Pass for all workspace packages and all three Electron targets.                                                                                                    |
| `pnpm test` with temp .NET build output | Pass: 8 files, 31 tests, including Gate 1 and Windows PowerPoint persistence.                                                                                      |
| `pnpm test:electron-dev`                | Pass: loopback Vite development server and Electron shell launched and exited cleanly.                                                                             |
| `pnpm test:electron`                    | Pass: 1 focused real-Electron security smoke. The first attempt timed out only while Playwright downloaded its Electron binary; the completed rerun passed.        |
| `pnpm package`                          | Pass: unsigned Windows x64 package.                                                                                                                                |
| `pnpm test:package-smoke`               | ASAR and fuse inspection pass; final unsigned launch is blocked by local Smart App Control policy.                                                                 |
| `pnpm verify`                           | Formatting, lint, typecheck, 31 tests, build, dev smoke, Electron security smoke, package, ASAR, and fuses passed; final local unsigned launch was policy-blocked. |

The first local Gate 1 validator invocation was blocked by Windows Application Control because the generated .NET assembly lived under OneDrive. Publishing or directing the identical build output to `%LOCALAPPDATA%\\Temp` passed the unchanged validator and full suite. This is an environment-specific local execution constraint, not a weakened assertion.

## Test totals and structural evidence

- Vitest: 31 passing tests across 8 test files; 18 tests are Gate 2-specific.
- Playwright Electron: 1 passing security/launch test.
- Fresh UI finish review: `ship` after Turkish copy consistency and metadata-error-state fixes.
- TypeScript: all five buildable workspace projects pass strict typecheck.
- Gate 1 Open XML validation: unchanged and passing.
- Windows PowerPoint Gate 1 persistence regression: unchanged and passing.
- Packaged runtime: all eight fuses understood by `@electron/fuses` 1.8.0 are asserted from the binary before launch.

## CI and packaging evidence

Local Windows packaging, ASAR inspection, and binary fuse inspection pass. The final unsigned executable cannot launch under this workstation's Smart App Control enterprise-signing policy. `.github/workflows/gate-2.yml` contains the Windows and Intel macOS verification pipeline.

- Initial GitHub Actions run `33276389997`: failed during static verification. Windows exposed LF/CRLF checkout inconsistency; macOS exposed workspace type declarations that depended on unbuilt `dist` output.
- Commit `9bd23de` adds checkout-stable LF attributes and source-backed type declarations while retaining compiled runtime exports. The local CI-equivalent command then passed with 28 tests.
- Replacement GitHub Actions run `33276632291`: started for Windows and macOS, but its completion was not awaited.
- Windows GitHub Actions acceptance: deferred by the product owner on 2026-08-30; not claimed as passed.
- macOS GitHub Actions acceptance: deferred by the product owner on 2026-08-30; not claimed as passed.

This exception closes the implementation task without converting missing platform evidence into a pass. Cross-platform packaged launch remains an unverified residual risk. No claim of local or CI macOS success is made.

## Repository structure and files changed

- Root workspace/tooling: `.node-version`, `.nvmrc`, `.npmrc`, pnpm workspace/lockfile, root scripts, ESLint, Prettier, Vitest, and product context.
- `packages/desktop-contract`: frozen public bridge types, strict schemas, and internal channel map.
- `apps/desktop`: Forge configuration, Vite builds, TypeScript projects, main, preload, and renderer shell.
- `tests/gate-2`: bridge, protocol, source-security, and Electron launch/security coverage.
- `tools/electron`: cross-platform packaged launch and fuse smoke.
- `.github/workflows/gate-2.yml`: Windows/macOS automated verification and packaging.
- Documentation: bridge contract, ADR-002, decisions index, test matrix, Gate 2 report, and updated project context.

Gate 1 source, artifacts, tests, exporter selection, and clinical/reference exclusions are preserved. No file under `resources/` is tracked or included in package inputs.

## Remaining risks and limitations

- Windows and macOS Gate 2 CI acceptance was deferred by the product owner; cross-platform build, Electron smoke, packaging, and packaged-launch results remain unverified residual risks.
- Packages are intentionally unsigned development artifacts. Signing, notarization, release distribution, and operating-system reputation prompts belong to a later gate.
- The CSP permits inline styles, but never inline scripts, because the minimal React shell currently uses a static stylesheet and Electron/Vite development behavior. Gate 3 should keep script policy unchanged and reassess style policy if CSS architecture changes.
- `@electron/fuses` 1.8.0 recognizes eight Electron v1 fuse positions; the package smoke asserts every recognized position. Dependency review should revisit this when Forge accepts a newer fuse package.
- Windows Application Control blocks locally generated .NET assemblies in the OneDrive tree; the automated Gate 1 test now places only its build output in the user temp directory without changing validation.
- Smart App Control blocks the final unsigned Windows executable under policy ID `{0283ac0f-fff1-49ae-ada1-8a933130cad6}`. This is consistent with Gate 2's unsigned non-goal; a future Windows CI or suitable test host should still prove that the package itself launches.
- The Gate 1 macOS PowerPoint compatibility exception remains an unrelated residual risk.

## Gate 3 prerequisites

1. Product owner or consultant reviews and accepts this Gate 2 report.
2. The product owner accepts the explicitly deferred Windows/macOS CI evidence as residual risk, or requests a future successful rerun before Gate 3.
3. The frozen bridge remains narrow; any Gate 3 filesystem capability begins with a new named contract and runtime schemas.
4. Gate 3 scope and acceptance criteria are explicitly authorized.

## Recommendation

Gate 2 implementation is complete and ready for product-owner/consultant review under the explicit cross-platform CI exception. Gate 3 has not started and must not start without explicit acceptance.
