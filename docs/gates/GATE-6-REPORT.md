# Gate 6 — Final Release and Pilot Readiness

Status: Implementation complete; Windows pilot-ready with documented limitations
Date: 2026-08-31
Release: `0.1.0`

## Delivered

- Completed release verification without adding clinical or presentation features.
- Added hash-verified recovery for a missing managed image. The replacement must have the exact original content; mismatched files are rejected.
- Hardened the shared transition guard so failed or unexpected save errors block tab/session/navigation/close transitions.
- Added a full 35-slide synthetic release workflow covering case creation, managed imports, clinical data, alignment, save/reopen, session restoration, preview, warning acknowledgement, PPTX export, and independent Open XML validation.
- Added Windows pilot/operator guidance and a short first-user checklist.
- Updated the application/package version from the stale Gate 4 identifier to `0.1.0`.

## Verification results

| Check                                     | Result                                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile --force`  | Passed with pnpm 10.17.1; lockfile unchanged.                                                                            |
| Format, ESLint, strict TypeScript         | Passed.                                                                                                                  |
| Unit/integration suite                    | 59/59 passed across 12 files.                                                                                            |
| Gate 6 release tests                      | 5/5 passed.                                                                                                              |
| Electron development launch/security test | 1/1 passed.                                                                                                              |
| Production builds                         | Passed for all packages and Electron main/preload/renderer.                                                              |
| Full synthetic presentation               | 35 previews and 35-slide PPTX generated successfully.                                                                    |
| Independent `.NET 8`/Open XML validation  | Passed all package, relationship, geometry, bounds, native-object, crop, rotation, opacity, z-order, and privacy checks. |
| Unsigned Windows packaging                | Passed.                                                                                                                  |
| Packaged ASAR and Electron fuses          | ASAR present; all 8 expected fuses passed.                                                                               |
| Packaged Windows launch/exit              | Passed without disabling or bypassing Smart App Control.                                                                 |

The first Electron verification attempt found a stale Vakamatik Vite process occupying loopback port 5173. Only that exact process was stopped; the second attempt passed. This was an environmental conflict, not an application defect.

## Workflow and recovery evidence

- The synthetic workflow imported every optional asset group and intentionally left one required image missing. The exact warning set was acknowledged before export.
- All optional slides 16, 18, 21, 34, and 35 appeared in canonical order.
- Case and slide-specific notes were attached to the intended slides. HN values remained identical on repeated slides.
- Shared ceph transforms propagated across slides 23 and 25–28; the independent slide 22 overlay retained its translation, fractional rotation, and opacity.
- Saved clinical data, alignment, warning acknowledgement, and workspace position survived fresh reads/restart simulation.
- Corrupt `case.json` and an unwritable export destination were rejected.
- A removed managed derivative blocked case opening, a wrong replacement was rejected by content hash, and the exact original restored the case.
- Failed and thrown save operations returned a blocked transition result.
- A moved complete case folder reopened and its recent-session root was relinked successfully.

## Package and repository hygiene

Unsigned Windows package:

```text
apps/desktop/out/Vakamatik-win32-x64/
```

The package, local test results, synthetic generated decks, and temporary case folders are ignored and were not committed. `resources/` remains ignored and untracked. No patient data or local clinical/reference material was read, staged, copied into the package, or committed.

## Known limitations and manual checks

- This is an unsigned small-clinic Windows pilot build, not a signed installer or public release.
- macOS application build, packaging, launch, and workflow remain deferred and unverified. No new cross-platform CI evidence is claimed.
- macOS PowerPoint remains untested under the existing product-owner waiver.
- The first pilot user must complete `docs/PILOT-CHECKLIST.md`, including a real Windows PowerPoint open/edit/save/reopen review of an approved synthetic or training export.
- The application does not provide signing, notarization, auto-update, cloud sync, authentication, encryption, backups, telemetry, Dolphin import, automatic diagnosis, or PDF export.

Gate 6 implementation is complete. No subsequent gate or optional module was started.
