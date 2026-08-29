---
status: accepted
date: 2026-08-29
---

# ADR-002: Bundled Electron shell with a narrow validated bridge

Vakamatik will use a three-process Electron boundary: a sandboxed renderer, an isolated preload, and a privileged main process. The renderer receives only the named `getAppInfo` and `ping` operations frozen in `@vakamatik/desktop-contract`; Zod validates both sides of every call and the main process rejects any sender that is not the expected main frame at the configured application origin. No generic IPC, Node global, path, filename, URL, dialog, shell, or filesystem capability crosses this boundary.

Packaged renderer assets are served from the standard, secure `vakamatik://app` origin through a traversal-protected allowlist protocol. Main, preload, React, and validation code are bundled before packaging, so the application ASAR contains no production `node_modules`; Electron Forge packages the self-contained output and applies restrictive Electron fuses. Development may use only an explicitly configured loopback HTTP origin.

This was selected over `file://` loading or a broad preload because a normal secure origin, explicit capabilities, and runtime validation give later gates a boundary that can be extended operation by operation without exposing ambient filesystem authority. Signing, notarization, updates, telemetry, and remote crash reporting remain outside Gate 2.
