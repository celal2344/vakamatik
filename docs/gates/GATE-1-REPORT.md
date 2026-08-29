# Gate 1 Report: PowerPoint fidelity spike and exporter decision

Status: **Accepted with a product-owner platform-testing exception**  
Date: 2026-08-29  
Exporter decision: **PptxGenJS 4.0.1**  
Gate recommendation: **Accept Gate 1. Gate 2 is the next gate, but it was not started by this task.**

## Scope completed

Gate 1 implemented only the requested PowerPoint fidelity spike. It creates these four semantic slides from synthetic, non-clinical fixtures:

1. `dental_frontal_comparison`
2. `ceph_profile_overlay`
3. `ceph_vertical`
4. `problem_goal_plan`

No Electron shell, Record Board, forms, case storage, clinical import, alignment UI, or non-spike slides were started.

The generated canvas is exactly 10 × 7.5 inches, 720 × 540 points, and 9,144,000 × 6,858,000 EMU. `resources/VAKA TEMPLATE kopyası.pptx` was inspected read-only as the primary geometry/style source. Supplied patient presentations were used only as read-only placement/crop evidence; no patient pixels, text, measurements, names, paths, or notes were copied into owned fixtures or outputs.

## Repository structure created

```text
packages/
  export-contract/       library-independent presentation model
  pptx-exporter/         PptxGenJS adapter and four spike definitions
  test-fixtures/         deterministic synthetic raster generation
  validation/            validation boundary documentation
tests/gate-1/            contract, overflow, privacy, structure, and render tests
tools/
  pptx-validator/        .NET 8/Open XML package validator
  powerpoint/            Windows PowerPoint render and persistence harnesses
docs/
  decisions/             exporter ADR
  gates/                 gate report and cross-platform checklist
artifacts/gate-1/
  gate-1-spike.pptx
  render-current/        inspected 1440 × 1080 renders
  goldens/               approved same-environment visual baselines
  synthetic-fixtures/    generated non-clinical assets
  validation/            machine-readable evidence
```

## Files changed

- Workspace: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.base.json`, `.gitignore`.
- Contract: `packages/export-contract/package.json`, `README.md`, `tsconfig.json`, and `src/index.ts`.
- Fixtures: `packages/test-fixtures/package.json`, `tsconfig.json`, `src/generate.ts`, `src/index.ts`, and six generated raster assets.
- Exporter: `packages/pptx-exporter/package.json`, `tsconfig.json`, and all files under `src/`.
- Validation: `tools/pptx-validator/*`, `tools/powerpoint/*`, `packages/validation/README.md`, and `tests/gate-1/*`.
- Evidence: the PPTX, four current renders, four goldens, synthetic fixture copies, structural report, render report, visual report, and Windows acceptance copy/report under `artifacts/gate-1/`.
- Documentation: this report, `POWERPOINT-ACCEPTANCE-CHECKLIST.md`, `ADR-001-exporter.md`, and `PROJECT_CONTEXT.md`.

Supplied PowerPoint files were not modified.

## Frozen exporter contract

`packages/export-contract` defines a library-independent `SlideDocument`. The contract contains:

- semantic slide IDs and point-based slide dimensions;
- native text, native editable tables, images, and lines;
- `contain`, `cover`, and explicit normalized crop placement;
- translation in points, uniform scale, fractional-degree rotation, opacity, and z-index;
- speaker notes;
- deterministic structured overflow results with semantic slide ID, element, row, column, reason, and message;
- an `Exporter` interface with separate `validate` and `export` operations.

No PptxGenJS type or object appears in the input model. The adapter converts the frozen model to PptxGenJS only inside `packages/pptx-exporter`.

## Exact dependency and environment versions

| Component | Version |
| --- | --- |
| Node.js | 24.15.0 |
| pnpm | 10.17.1 |
| TypeScript | 7.0.2 |
| PptxGenJS | 4.0.1 |
| Vitest | 4.1.11 |
| Sharp | 0.34.4 |
| `@types/node` | 24.10.1 |
| Validator target | .NET 8.0 |
| Runtime used on this machine | .NET 10.0.11 via `RollForward=Major` |
| Windows | Windows 11 Home Single Language 10.0.26200, 64-bit |
| PowerPoint | 16.0.20326.20100 |

All JavaScript dependencies are exact-pinned in the workspace lockfile. This Windows machine lacks the .NET 8 runtime, so the net8.0 validator used its declared major-version roll-forward on .NET 10. A machine with .NET 8 will run the same target on .NET 8.

## Commands run

```powershell
corepack pnpm@10.17.1 install --frozen-lockfile=false
corepack pnpm@10.17.1 build
corepack pnpm@10.17.1 generate:gate1
dotnet run --project tools/pptx-validator/PptxValidator.csproj -- artifacts/gate-1/gate-1-spike.pptx artifacts/gate-1/validation/structure-report.json
powershell -File tools/powerpoint/Render-Pptx.ps1 ...
powershell -File tools/powerpoint/Compare-RenderedSlides.ps1 ... -UpdateGoldens
powershell -File tools/powerpoint/Invoke-PowerPointAcceptance.ps1 ...
corepack pnpm@10.17.1 gate1
corepack pnpm@10.17.1 typecheck
```

The final `gate1` command rebuilds fixtures and code, regenerates the presentation, validates its package, rerenders all slides, compares them with inspected goldens, performs the Windows PowerPoint persistence exercise, and runs all Vitest assertions.

## Automated test results

- Build: passed for all three packages.
- Strict TypeScript typecheck: passed for all three packages.
- Vitest: **7 files passed, 25 tests passed, 0 failed**.
- Short and medium slide 32 fixtures: fit.
- Intentionally excessive slide 32 fixture: rejected before export with deterministic location `problem_goal_plan` / `problem-goal-plan-table` / row 1 / column 1 / `text-exceeds-cell-height`.
- Repeated slide 9 fields: verified to originate from one canonical measurements object.
- Coordinate conversions: 720 × 540 points, EMU conversion, and 1440 × 1080 reference pixel = 0.5 point all passed.
- Privacy scan: passed; no configured patient-data canary or source-path marker appeared in owned QA sources/evidence.

## Structural validation results

The independent .NET/Open XML validator passed every error-level check:

- valid OPC content types, root relationships, presentation part, and presentation relationships;
- all internal relationship targets resolve;
- exact 9,144,000 × 6,858,000 EMU canvas;
- exactly four slides in the expected semantic order;
- all measurable objects inside the slide canvas;
- native text and native DrawingML tables present where required;
- speaker notes attached to `ceph_vertical` only;
- DrawingML crop values present and valid;
- fractional rotation represented (`0.75°` and `-4.3°` fixture transforms);
- opacity represented (`62%` and `78%` alpha);
- picture document order available as deterministic z-order evidence;
- no prohibited data markers.

Final artifact SHA-256 at the last structural-validation run: `51071211500bf69d52b190b93d22470390a6ce7e6b9aaac3cb1726299981bcb9`. PptxGenJS package metadata is time-sensitive, so binary PPTX equality is deliberately not the main deterministic assertion.

## Visual regression results

All four slides were rendered by desktop Windows PowerPoint 16.0 at 1440 × 1080 and inspected at original resolution. The approved render makes aspect-ratio, crop, translation, scale, rotation, opacity, center-line, table-wrap, and clipping errors visually obvious.

Same-environment comparison passed for all four slides with:

- maximum changed-pixel ratio: `0.001`;
- maximum mean channel difference: `0.15`;
- observed changed pixels in the final run: `0` on all four slides.

The visual baselines are intentionally scoped to the same PowerPoint version, OS, fonts, and render size. They are not a cross-platform pixel-equality promise.

## Windows PowerPoint result

**Passed on PowerPoint 16.0.20326.20100.**

- PowerPoint opened the generated four-slide presentation and rendered every slide without a repair/recovery interruption.
- All four 1440 × 1080 renders were visually inspected.
- A controlled copy was edited: native slide text, a native table cell, and an overlay image moved by 0.5 point.
- The copy was saved, closed, and reopened.
- Text, table edit, image move, rotation, opacity, and `ceph_vertical` speaker notes persisted.
- The generated original remained byte-for-byte unchanged during the exercise.

Machine-readable evidence is in `artifacts/gate-1/validation/windows-powerpoint-acceptance.json` and `windows-render.json`.

## macOS PowerPoint result

**Deferred by the product owner. Not tested and not claimed.** This environment is Windows-only and no macOS device is available. On 2026-08-29, the product owner waived macOS PowerPoint validation as a Gate 1 acceptance blocker.

This is an explicit platform-testing exception. macOS compatibility remains an unverified residual risk, not a test failure. The preserved artifact and checklist remain available for future validation:

- `artifacts/gate-1/gate-1-spike.pptx`
- `docs/gates/POWERPOINT-ACCEPTANCE-CHECKLIST.md`

If testing becomes possible, the Mac tester should use desktop Microsoft PowerPoint, make the prescribed platform-specific copy, inspect all four slides, edit native text/tables and an image, save, close, reopen, and confirm notes, crops, opacity, fractional rotation, z-order, and alignment. LibreOffice or automated rendering is not a substitute.

## Exporter selected and evidence

PptxGenJS 4.0.1 is accepted in `docs/decisions/ADR-001-exporter.md`. It met every measured hard requirement in the structural, rendering, overflow, and Windows PowerPoint tests. Therefore the specified trigger for a fallback exporter was not reached, and no .NET/Open XML exporter proof was built. Open XML remains an independent validator and the conditional fallback if future compatibility evidence exposes a hard PptxGenJS failure.

## Known limitations

- macOS PowerPoint behavior is unverified because validation was deferred by the product owner; compatibility remains a residual risk.
- The deterministic overflow preflight is a conservative fixed-font character/line estimate because Node does not expose PowerPoint's line-breaking engine. It rejects excessive content rather than shrinking below 10 pt or silently clipping.
- Visual regression is stable only within the pinned environment described above.
- The spike proves four difficult canonical slide patterns, not the remaining 31 semantic slides or the application UI.
- The current validation host uses .NET 10 runtime roll-forward for a net8.0 utility; native .NET 8 runtime execution was not available on this machine.

## Remaining blockers and residual risks

Gate 1 has no remaining blockers. The product owner accepted the platform-testing exception and deferred macOS PowerPoint validation. macOS compatibility remains unverified; if future testing reveals a hard PptxGenJS failure, record the exact feature failure, build only the smallest .NET 8/Open XML proof for that feature, compare evidence, and revisit ADR-001.

## Recommendation

**Accept Gate 1 with PptxGenJS 4.0.1 as the exporter and the documented macOS platform-testing exception. Gate 2 is now the next gate; it was not begun in this task.**
