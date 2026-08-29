# Gate 3 report — Core cases

Date: 2026-08-30
Status: Implementation complete; pending product-owner acceptance
Gate 4: Not started

## Delivered

- Added `packages/domain`, `packages/media`, and `packages/case-store`.
- Added a strict versioned case schema with UUID case IDs, SHA-256 asset IDs, semantic record-slot IDs, revision checks, and assignment integrity validation.
- Added managed case folders with atomic `case.json` writes, immutable original copies, orientation-normalized PNGs, WebP thumbnails, content deduplication, and relocation-safe relative paths.
- Extended the hardened bridge with five named validated operations: create, open, save, close, and import one image into one record slot. Renderer responses contain no raw filesystem paths.
- Replaced the placeholder start page with a minimal Turkish Record Board covering 22 required/usual v1 record slots, filters, completion status, expected-shape diagrams, thumbnails, metadata, and manual choose/replace actions.
- Kept slide layouts, presentation preview/export expansion, alignment, clinical measurements, diagnosis, and treatment planning out of scope.

## Evidence

- `pnpm format:check`: pass.
- `pnpm lint`: pass.
- `pnpm typecheck`: pass across eight buildable workspace projects.
- `pnpm test`: 36 tests passed across 9 files, including all Gate 1/2 regressions and 5 Gate 3 case-workflow tests.
- `pnpm test:electron`: development launch passed; 1 Playwright Electron security test passed with the expanded named bridge and malformed case-payload rejection.
- `pnpm build`: pass.
- `pnpm package`: unsigned Windows x64 packaging passed.
- Packaged Sharp runtime loaded successfully and read the synthetic 2400 × 1350 PNG fixture.
- UI detector: no mechanical findings; the empty workspace render was inspected directly. The installed skill's fallback reviewer file was unavailable, so no separate automated design-review claim is made.

## Limitations and blockers

- No genuine Gate 3 blocker remains.
- Record assignment is intentionally one local file picker at a time; folder suggestions, drag/drop mapping, swap/remove, and slide preview are later work.
- The local Windows Smart App Control restriction still prevents claiming packaged executable launch success. Cross-platform CI remains deferred under the accepted Gate 2 limitation.
- Gate 4 has not started.
