# Orthodontic Case Presentation Builder — Project Context

Status: Gate 5 accepted and closure-verified; presentation workspace UX refinement complete
Version: 2.1
Date: 2026-08-31
Current gate: Gate 5 accepted; Gate 6 is not started

## 1. Purpose of this file

This is the lead developer agent's current-truth handoff. Read it before each gate, update it at the end of each accepted gate, and keep it short enough to reread completely.

Document precedence:

1. `ORTHODONTIC_CASE_PRESENTATION_TOOL_SPEC.md` is authoritative for clinical fields, image slots, measurements, slide contents, geometry, semantic slide IDs, notes, and alignment behavior.
2. `ORTHODONTIC_CASE_BUILDER_IMPLEMENTATION_PLAN.md` is authoritative for architecture, gate order, subagent scopes, tests, and acceptance.
3. This context file records the currently accepted state, decisions, risks, and next action.

## 2. Product summary

The product is a local desktop tool that helps an orthodontist assemble a standardized orthodontic case-presentation PowerPoint from patient photographs, model renders, radiographs, manually entered measurements, clinician-authored findings, and treatment-plan text.

It is a presentation-production tool, not a diagnostic system. The software may format values and reuse data across slides, but diagnoses, interpretations, problem lists, goals, plans, and case decisions remain clinician-authored or explicitly clinician-approved.

Expected users: approximately three or four people using their own local computers.

## 3. Confirmed operating decisions

- Desktop application: Electron + React + TypeScript.
- Supported operating systems: macOS and Windows.
- Normal usage will be mostly macOS; development and a large part of testing will occur on Windows.
- No server, cloud database, sync service, app accounts, login, RBAC, or application-managed encryption in v1.
- The app operates offline and stores ordinary local files.
- Patient media is never sent to an external AI/image service.
- Developer logs, committed fixtures, issue reports, and CI artifacts must not contain patient names, paths, measurements, or pixels.
- UI and visible presentation text default to Turkish in v1.
- JPEG and PNG are the initial supported media formats. HEIC, TIFF, DICOM, and embedded video are deferred unless later required.

## 4. Source presentation evidence

Available reference files:

- Three patient presentations with 35 slides each.
- One empty `VAKA TEMPLATE` presentation with 34 slides.
- The detailed source-analysis/presentation specification.

Verified structure:

- Canvas: `9144000 × 6858000` EMU, equivalent to `10 × 7.5 in`, 4:3, or 720 × 540 PowerPoint points.
- Every inspected deck uses one slide master and 11 layouts.
- Many slide and shape identities align, confirming that the patient decks were derived from the same template family.
- The empty template omits canonical slide 35, the HN/Bolton worksheet image.
- The empty template retains off-slide/scaffolding content on slides 21–24.
- Patient decks contain additional off-canvas objects and manual inconsistencies on varying slides.

Reference-use rule:

- The empty template is the primary source for native styles, tables, guide labels, and geometry.
- Patient decks show real placement/crop behavior and recurring content, but their images and identifying data must not become repository fixtures or CI artifacts.
- None of the supplied decks is a production-ready runtime template without cleanup.

## 5. Core v1 workflow

1. Create a case and enter patient/case metadata.
2. Assign local records through the Record Board, one slot at a time or through reviewed folder suggestions.
3. Copy assigned records into the app-managed local case folder without modifying the clinician's originals.
4. Enter extraoral, dental/occlusal, radiographic, and TMJ findings.
5. Enter final Hayes Nance and Bolton results manually.
6. Enter every T0 cephalometric measurement manually.
7. Enter or approve interpretations, problem/goal/plan rows, and the case decision.
8. Preview slides from the same computed slide document used by PowerPoint export.
9. Adjust crops, translation, scale, rotation, opacity, and linked transforms.
10. Review content errors and technical errors.
11. Acknowledge any non-blocking content errors and export an editable `.pptx`.

## 6. Case folders

A case folder is the app's self-managed local workspace for one presentation. The user selects a main `Vakalar/Cases` location once; the app creates case subfolders.

Conceptual structure:

```text
CASE-2026-001/
  case.json
  assets/
    original/
    normalized/
    thumbnails/
  autosave/
  exports/
```

Rules:

- Original imported bytes are retained unchanged.
- Orientation-normalized derivatives are used for deterministic preview/export.
- Crops and transforms are metadata, not destructive edits.
- Moving the entire case folder must preserve the case.
- The app never moves, renames, overwrites, edits, or deletes the clinician's original source files.

## 7. Presentation and data rules

- Canonical content model: 35 semantic slides as defined in the presentation/clinical specification.
- Optional slides are omitted when unused; semantic IDs never depend on exported slide numbers.
- Slides, notes, transforms, and navigation use semantic IDs.
- A repeated measurement/finding binds to one canonical field everywhere it appears.
- Preview and export consume one shared `SlideDocument` and one point/EMU layout calculation.
- Text, tables, diagnoses, findings, and plan content remain editable PowerPoint objects.
- Slide 24 uses one precomposited traced-ceph image in v1.
- Slide 35 uses an assigned worksheet image when enabled.
- HN/Bolton use clinician-entered final results in v1; tooth-level calculators are deferred.
- Cephalometric reference values are versioned clinic/template configuration, never patient input.
- Narrative clinical conclusions require clinician authorship or explicit approval.

## 8. Optional/default slide behavior

Current defaults until the clinic changes them:

- Slide 8 is part of the ordinary record workflow but may become configurable.
- Slide 16 inferior comparison is optional.
- Slide 18 uses a poster frame/still if enabled; embedded video is deferred.
- Slide 21 accepts a questionnaire/form image rather than a native renderer.
- Slide 34 remains disabled until ICON component labels are confirmed.
- Slide 35 accepts an assigned worksheet image and is omitted when absent.
- Empty optional slides are omitted, not exported blank or hidden.

## 9. Export validation behavior

Technical errors block export:

- invalid/corrupt case data;
- unreadable managed asset;
- impossible transform;
- broken PPTX package;
- exporter failure.

Content errors do not block export but require explicit acknowledgement:

- missing required-looking image, measurement, finding, or text;
- unapproved interpretation;
- detected text overflow.

The review screen must list the affected semantic slide and link back to the missing field/slot. There is no separate draft mode and no automatic watermark in v1.

## 10. Architecture baseline

Recommended workspace:

```text
apps/desktop
packages/domain
packages/case-store
packages/media
packages/record-mapper
packages/slide-model
packages/layout-engine
packages/preview
packages/pptx-exporter
packages/validation
packages/test-fixtures
tools/pptx-validator
docs/gates
```

Key technology decisions:

- pnpm workspace, Node.js 24 LTS tooling, strict TypeScript.
- Electron main/preload/renderer boundaries with context isolation, no renderer Node integration, sandboxing, narrow validated IPC, and no remote content.
- Zod for persistence and IPC runtime validation.
- Sharp for bounded decoding, metadata, orientation normalization, thumbnails, and deterministic derivatives.
- PptxGenJS 4.0.1 is the selected production exporter per `docs/decisions/ADR-001-exporter.md`.
- .NET 8/Open XML remains the fallback exporter only if future evidence exposes a hard PptxGenJS failure; Open XML is used independently for package validation.
- Use one production exporter, not two.

## 11. Gate 1 status

Gate 1 is accepted and proves the exporter on the available Windows environment before the UI is built broadly.

Spike slides:

- Slide 9: multi-image frontal comparison and shared fields.
- Slide 22: profile/ceph overlay with crop, opacity, z-order, scale, translation, and rotation.
- Slide 25: ceph image plus dense native measurement table.
- Slide 32: native problem/goal/plan table and overflow behavior.

Gate 1 must create its own synthetic, non-patient fixtures. Use obvious labeled grids, gradients, alignment crosses, and crop markers so transformation errors are easy to detect. The user does not have anonymized test assets; this is not a blocker and must not be pushed back to them.

Completed evidence:

- Synthetic four-slide PPTX generated at the exact 4:3 canvas.
- Independent package, relationships, geometry, object, transform, notes, bounds, and privacy validation passed.
- Native editable text and tables, aspect-preserving crops, uniform scaling, fractional rotation, opacity, translation, and z-order were represented correctly.
- Short and medium slide 32 content fit; excessive content returned a deterministic structured overflow result.
- Same-environment Windows PowerPoint visual regression was established for all four slides.
- Windows PowerPoint open/edit/save/reopen persistence passed and all four renders were inspected.
- PptxGenJS 4.0.1 was selected as the single production exporter.

Platform-testing exception:

- Windows PowerPoint validation passed.
- The product owner waived the Gate 1 macOS PowerPoint acceptance requirement because no macOS device is available.
- macOS PowerPoint was not tested. Compatibility remains an unverified residual risk, not a Gate 1 failure.
- When a macOS device becomes available, run `docs/gates/POWERPOINT-ACCEPTANCE-CHECKLIST.md`; any hard compatibility failure must reopen the exporter decision.

Gate 1 remains accepted. Its macOS PowerPoint platform-testing exception remains an explicit residual risk.

## 12. Gate 2 status

Gate 2 is accepted by the product owner with the documented platform limitations. Gate 3 is authorized.

Delivered foundation:

- Exact-pinned Node.js 24.15.0 and pnpm 10.17.1 workspace using direct pnpm commands and a frozen lockfile.
- Electron 44.0.0, Electron Forge 7.11.2, React 19.2.8, strict TypeScript 6.0.3, Vite, Vitest, Playwright, ESLint, and Prettier.
- Separate main, preload, renderer, and shared contract packages.
- Frozen `window.vakamatik` shell bridge with only `getAppInfo` and `ping`; strict runtime validation and sender/frame/origin checks.
- Sandboxed renderer, context isolation, no Node integration, restrictive CSP, denied navigation/windows/webviews/permissions, and no external URL or telemetry path.
- Restricted `vakamatik://app` protocol with traversal protection and an asset-type allowlist.
- Unsigned Windows package, ASAR check, and fuse inspection passing locally; final unsigned launch is blocked by workstation Smart App Control.
- Windows and macOS GitHub Actions jobs for frozen install, verification, Electron smoke, unsigned packaging, fuse inspection, and packaged launch.
- Cross-platform Gate 2 CI acceptance was deferred by the product owner on 2026-08-30 to close the implementation without waiting for the platform jobs. This is an unverified residual risk, not a claimed pass.

Gate 2 evidence is recorded in `docs/gates/GATE-2-REPORT.md`, `docs/TEST_MATRIX.md`, and `docs/decisions/ADR-002-electron-shell-boundary.md`.

Accepted limitations:

- Packaged Windows launch was blocked by Smart App Control and is not claimed as passed.
- Cross-platform CI acceptance was deferred and is not claimed as passed.
- Windows packaging, ASAR inspection, fuse checks, 31 Vitest tests, and the Electron Playwright test passed.

## 13. Test policy

- Vitest + fast-check: schemas, migrations, date math, units, semantic IDs, crop and transform invariants.
- Integration tests: atomic save/recovery, locking, hash deduplication, media normalization, path safety.
- React Testing Library: forms, Record Board, keyboard operation, error acknowledgement.
- Browser-based Playwright: most renderer workflows with a fake typed bridge.
- Focused Electron Playwright smoke tests: preload/IPC/native seams and packaged launch.
- Open XML validation/package assertions: PPTX structure, notes, slide counts, relationships, native objects.
- Deterministic render regression in a pinned environment with fixed fonts.
- Manual PowerPoint acceptance on Windows and macOS when those environments are available; any product-owner exception must be explicit and leave the untested platform recorded as residual risk.
- No real patient data in any automated test.

## 14. Gate 3 status

Gate 3 is accepted by the product owner.

Delivered core-case workflow:

- Versioned strict Zod `case.json` schema with stable UUID case IDs, SHA-256 asset IDs, and semantic record-slot IDs.
- Managed case folders with immutable originals, normalized PNG derivatives, WebP thumbnails, and relative asset references.
- Atomic save, revision checks, close/reopen, and whole-folder portability.
- JPEG/PNG import through Sharp with content deduplication and managed-path traversal protection.
- Narrow validated case IPC operations for create, open, save, close, and single-slot image import; no raw paths or generic filesystem/dialog API reaches the renderer.
- Minimal Turkish Record Board with 22 named v1 slots, group filters, completion count, expected-shape diagrams, managed thumbnails, record metadata, and manual choose/replace actions.
- Windows unsigned package contains the required Sharp native runtime; packaged Sharp loading was verified independently. The inherited Smart App Control launch limitation remains unchanged.

Evidence: 36 Vitest tests across 9 files, one real-Electron Playwright security test, strict typecheck, lint, formatting, builds, Windows packaging, and packaged Sharp verification pass. See `docs/gates/GATE-3-REPORT.md`.

## 15. Gate 4 status

Gate 4 is accepted by the product owner.

Delivered presentation workflow:

- One library-independent `SlideDocument` and one 720 × 540-point geometry calculation consumed by both local SVG preview and PptxGenJS export.
- Definitions for all 35 canonical semantic slides. The default Gate 3 case produces 30 required slides; slides 16, 18, 21, 34, and 35 are omitted when empty.
- Slide 8 defaults to included and the layout API also supports the configured `omit-when-empty` behavior.
- Gate 3 case title and managed normalized assets flow into presentation layouts without exposing raw paths to the renderer.
- A basic Presentation screen provides canonical thumbnails, selected-slide preview, per-slide missing-content warnings, and local `.pptx` export.
- A synthetic 30-slide deck passes the independent Open XML validator; all Gate 1–3 regressions remain green.

Evidence: 41 Vitest tests across 10 files, one Electron Playwright security test, strict typecheck, lint, formatting, build, synthetic preview/export, Open XML validation, and Gate 1 visual thresholds pass. See `docs/gates/GATE-4-REPORT.md`.

## 16. Gate 5 status

Gate 5 is accepted by the product owner. Gate 6 has not started.

Delivered clinical editing workflow:

- Strict persisted clinical fields for patient/case metadata, extraoral/dental/radiographic findings, all six HN results, both Bolton results, all specified cephalometric values, clinician-approved interpretations, five problem/goal/plan rows, case decision, ICON data, and notes.
- Optional Record Board inputs for slides 16, 18, 21, and 35; slide 34 is included when ICON rows are populated. Slide 8 behavior is case-configurable.
- Precision per-image translation, uniform scale, crop, fractional rotation, opacity, arrow-key nudging, reset, and linked/detached transform controls.
- A shared ceph transform group for slides 23 and 25–28 with explicit per-instance detach/relink. Slide 22 profile and ceph layers remain independently adjustable.
- Saved edits feed the same `SlideDocument` used by SVG preview and PptxGenJS export immediately after save/revision refresh.
- Missing clinical content is visible and blocks export only until the clinician acknowledges the current warning set. Corrupt cases and failed/invalid exports remain blocking errors.
- Speaker notes are exported only when the clinician enables note export. No diagnosis or interpretation text is generated automatically.
- Post-acceptance workflow refinement makes `Sunum oluşturma` the single case workspace entry, with `Kayıtlar`, `Klinik`, and `Sunum` as top-level inner tabs.
- A local recent-case registry provides resumable presentation sessions, unavailable-folder relinking, and safe list removal without exposing raw paths to the renderer.
- Clinical fields, case titles, and alignment changes stay as local drafts while editing, then save on section/tab/slide/session changes, sidebar navigation, export, and normal application close. Failed boundary saves block that transition; workspace position is saved on navigation actions.
- Images can be selected directly on the slide preview. Overlaps open a front-to-back layer chooser; the selected image receives a minimal outline and its live alignment controls stay in a right-side inspector.
- Placement and crop both have compact direction pads. Crop panning preserves its window size and stops at image boundaries; deliberate crop zoom uses separate `Yakınlaştır` / `Uzaklaştır` controls. Keyboard arrows automatically control whichever section was edited most recently; direct rotation dragging updates the selection outline immediately and requests live slide-preview frames.

Ambiguous relationship classifications remain clinician-authored free text. HN/Bolton are manual final values, slide 24 remains a precomposited tracing image, and Dolphin/tooth-level calculators remain excluded.

Closure evidence: 57 Vitest tests across 12 files and one real-Electron Playwright security test pass. Strict typecheck, lint, formatting, production builds, synthetic preview/export, independent Open XML validation, and all existing Gate 1–4 regressions pass. The ceph regression explicitly covers the shared group on slides 23 and 25–28, detached independence, and independent slide 22 overlay layers. See `docs/gates/GATE-5-REPORT.md`.

## 17. Lead-agent rules

- Work one gate at a time and stop after producing its report.
- Do not use subagents for Gates 3–6.
- Avoid speculative abstractions and unrelated refactors.
- Add only essential tests.
- Do not create ADRs unless an actual architectural decision requires one.
- Update only this file and one short gate report for each future gate.
- After two unsuccessful attempts at the same blocker, stop and report it.
- Do not weaken validation or tests just to make a gate green.
- Stop and ask only when a decision materially changes clinical meaning, data safety, or exporter architecture.

## 18. Current non-blocking configuration defaults

These do not block Gate 5 planning:

- Turkish visible text only in v1.
- JPEG/PNG media only.
- Existing template fonts, with substitution checks on both operating systems.
- Optional slides omitted when empty.
- TMJ form and worksheet supplied as images.
- No Dolphin import in the critical path.

## 19. Current handoff

Completed:

- Source-deck and empty-template inspection.
- Presentation/clinical specification cleanup.
- Implementation plan v0.4.
- Product/platform/privacy/export decisions.
- Current context creation.
- Frozen library-independent exporter contract.
- Synthetic Gate 1 fixtures and four-slide spike artifact.
- PptxGenJS exporter implementation for the four canonical spike slides.
- .NET 8/Open XML structural validator and PowerPoint render/persistence harness.
- 25 passing automated tests across 7 test files plus passing strict typecheck.
- Inspected Windows PowerPoint renders and same-environment visual goldens.
- Exporter ADR and Gate 1 report.
- Product-owner exception deferring unavailable macOS PowerPoint validation.

Gate 2 additions:

- Normalized exact-pinned workspace and root commands without Corepack.
- Frozen desktop bridge contract and security architecture ADR.
- Minimal React shell and hardened Electron main/preload implementation.
- Restricted application protocol, Electron fuses, and unsigned Forge packaging.
- Gate 2 unit, source-security, Electron launch, and packaged-app smoke coverage.
- Windows/macOS CI workflow and current Gate 2 report.

Remaining gate structure:

- Gate 6 — Final release: recovery checks, essential regression tests, packaging, and pilot readiness.

The former Gate 10 optional modules are removed from v1.

Gate 3 additions:

- Portable managed case folders, strict case schema, immutable imports, normalized assets, thumbnails, deduplication, and Record Board.

Gate 4 additions:

- Canonical 35-slide metadata and point layouts with optional-slide filtering.
- Shared `SlideDocument` preview/export path, SVG preview renderer, and full-deck PptxGenJS export.
- Narrow presentation preview/export bridge operations and Presentation screen.
- Synthetic full-deck structural validation and stable-order/optional/geometry regression tests.

Gate 5 additions:

- Persisted clinician forms, optional-slide content, interpretation approval, notes, and warning acknowledgement.
- Precision alignment with shared/detached ceph behavior and independent slide 22 overlay controls.
- Clinical data binding into shared preview/export geometry and a complete synthetic clinical export regression.

Next action: begin Gate 6 only when explicitly requested.

Residual risks: the replacement Windows/macOS Gate 2 CI run was not accepted as platform evidence; local Smart App Control prevents Windows packaged-launch evidence; macOS PowerPoint compatibility remains unverified under the Gate 1 waiver; Gate 2 packages are unsigned development artifacts.
