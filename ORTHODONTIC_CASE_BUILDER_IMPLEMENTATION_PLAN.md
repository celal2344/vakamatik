# Orthodontic Case Presentation Builder — Implementation Plan

Status: Implementation-ready; Gate 0 documentation complete  
Version: 0.4  
Date: 2026-08-29  
Inputs: `ORTHODONTIC_CASE_PRESENTATION_TOOL_SPEC.md`, three sample patient decks, and the 34-slide `VAKA TEMPLATE` deck

## 1. Executive decision

The project is worth building and the product specification is strong, but the current material is not yet safe to hand to several implementation agents without a decision gate. The first release should be a local, single-user Electron desktop application whose portable source of truth is a versioned `case.json` plus managed local assets. It must run on both macOS and Windows: normal use will be mostly on macOS, while development and a large part of testing will happen on Windows.

The recommended primary stack is:

- Electron, React, TypeScript, and Vite.
- Node.js 24 LTS for development tooling; pin the exact runtime and package versions in the repository.
- pnpm workspaces without a large monorepo framework.
- Zod at every persistence and IPC boundary.
- Sharp for metadata, orientation-normalized derivatives, thumbnails, and safe image decoding.
- A pure point/EMU layout engine and semantic slide document shared by preview and export.
- PptxGenJS as the first exporter candidate.
- A .NET 8/Open XML exporter only if the Gate 1 fidelity spike fails.
- Vitest, React Testing Library, Playwright, fast-check, and a small .NET Open XML validation CLI.
- Electron Forge for packaging/signing, subject to the Gate 2 toolchain spike.

The supplied `VAKA TEMPLATE` and the three patient decks should be visual/structural oracles, not automatically assumed to be production runtime templates. Inspection confirms that all four use the same 4:3 canvas, one master, and 11 layouts; many slide/shape identities also align. The patient decks contain 35 slides, while the empty template contains 34 and omits the final worksheet slide. The empty template also retains off-slide/scaffolding content, especially around slides 21–24. Do not begin by writing a custom placeholder-replacement engine over these files unchanged. PptxGenJS supports slide masters, images, crop/contain/cover behavior, transparency, rotation, tables, and notes, but the real clinic layouts must still pass a spike. If it fails, keep the Electron UI, case model, slide schema, and layout engine and replace only the exporter behind an interface.

## 2. Required corrections to the current specification

### 2.1 Resolve the exporter contradiction

Two exporter architectures were considered during analysis: template-driven OOXML replacement and reconstructing the presentation in code with PptxGenJS. These are different architectures.

Decision for planning:

1. Build a code-generated PptxGenJS spike first.
2. Use a sanitized expected deck and slide renders as the golden visual reference.
3. Accept PptxGenJS only after slides 9, 22, 25, and 32 pass structural, visual, editability, notes, and cross-platform checks.
4. If it fails a hard criterion, record the failure and replace only the exporter with a .NET/Open XML implementation.
5. Do not maintain two production exporters.

Slide 32 is added to the proposed spike because dense native PowerPoint table text, wrapping, and overflow are a different risk from the image/table combination on slide 25.

### 2.2 Make privacy claims match the v1 architecture

The proposed v1 has no server, accounts, or data transmission. Therefore:

- There is no app login, RBAC, account system, or application-managed encryption in v1.
- “Encryption in transit” is not applicable to a fully offline workflow.
- The app simply stores files on the local computer like an ordinary desktop tool.
- The app may keep a local activity history, but it must not be presented as a tamper-proof compliance audit log.
- Crash reporting, analytics, auto-update checks, and external network access should be disabled by default.
- Patient name, paths, measurements, and image metadata must not enter developer logs, committed fixtures, issue reports, or CI artifacts. The supplied real decks may be inspected locally as references but must not be copied into the source repository or automated test output.

### 2.3 Use a simple managed folder for each case

A “case folder” is only the app's local working folder for one patient presentation. The user should not have to construct it manually. The app can ask for one main **Cases/Vakalar** location once, then create a subfolder whenever a case is created. That subfolder stores the entered form data, copies of assigned media, autosave data, and exported PowerPoints together so that links do not break when source photos are renamed or moved.

Retain the assigned file byte-for-byte and generate an orientation-normalized derivative for preview/export:

```text
CASE-2026-001/
  case.json
  assets/
    original/<sha256>.<ext>
    normalized/<sha256>.<ext>
    thumbnails/<sha256>.webp
  autosave/
  exports/
```

This preserves provenance while avoiding EXIF and color-profile differences between the app and PowerPoint. The original remains immutable. Derived files are reproducible and may be rebuilt.

### 2.4 Snapshot configuration into each case

Clinic references and labels can change. Each case must record:

- `schemaVersion`
- `templateVersion`
- `clinicConfigVersion`
- `exporterVersion`
- the effective reference-value/configuration snapshot used by that case

A later template update must not silently change an old case or regenerate it with different norms.

### 2.5 Keep export validation simple

Use three levels:

- Technical error: corrupt/missing managed file, invalid schema, impossible transform, or exporter failure. Technical errors prevent export.
- Content error: required-looking content is missing, an interpretation is unapproved, or text may overflow. Content errors are shown prominently and require acknowledgement but do not prevent export.
- Information: optional module omitted, suspicious aspect ratio, or per-slide override present.

There is no separate “draft deck” mode in v1. The user may export an incomplete presentation after acknowledging content errors. Empty optional slides are omitted.

### 2.6 Keep clinical calculations conservative

For v1:

- Hayes Nance and Bolton accept clinician-approved final results.
- Every cephalometric value is manually enterable.
- Reference values are versioned clinic configuration.
- Narrative interpretations are clinician-entered or explicitly edited and approved.
- Do not generate diagnosis from measurements silently.
- Tooth-level calculators, automatic interpretation rules, and Dolphin import are later features.

### 2.7 Keep the documents separate by responsibility

The implementation plan does not replace the detailed tool specification.

- `ORTHODONTIC_CASE_PRESENTATION_TOOL_SPEC.md` remains the canonical clinical and presentation specification: exact assets, measurements, field definitions, slide contents, geometry, notes behavior, and transform/link rules.
- `ORTHODONTIC_CASE_BUILDER_IMPLEMENTATION_PLAN.md` owns architecture, build gates, agent prompts, testing, and delivery order.

The tool specification has been tightened accordingly: engineering-stack and build-order recommendations were removed while the clinical model, asset manifest, slide blueprint, semantic IDs, validation behavior, and alignment rules were retained.

## 3. Architecture and ownership boundaries

```text
apps/desktop
  main/                 Electron lifecycle, windows, protocol, IPC handlers
  preload/              Narrow typed bridge; no generic filesystem access
  renderer/             React UI, forms, Record Board, previews, editor

packages/domain         Versioned case schema, IDs, clinical types, config
packages/case-store     Atomic save, migrations, recovery, locking, archive
packages/media          Hashing, safe decode, metadata, normalize, thumbnail
packages/record-mapper  Local deterministic filename/aspect-ratio suggestions
packages/slide-model    Semantic SlideDocument and canonical slide definitions
packages/layout-engine  Point/EMU geometry, crops, linked transforms, overflow
packages/preview        React/SVG/DOM renderer of SlideDocument
packages/pptx-exporter  Exporter interface and selected implementation
packages/validation     Case/export validation and human-readable report
packages/test-fixtures  Synthetic/anonymized records and golden expectations
tools/pptx-validator    .NET Open XML structural validation CLI
docs/                   Context, decisions, clinical questions, gate reports
```

Non-negotiable dependency direction:

```text
domain <- case-store/media/record-mapper
domain + layout-engine <- slide-model
slide-model <- preview and pptx-exporter
Electron adapters depend on packages; packages do not depend on Electron.
```

The preview and exporter consume the exact same `SlideDocument`. The preview may scale a 720 × 540 point canvas into CSS pixels, but it must not recalculate placements independently.

### 3.1 Transform model

Use three layers rather than one broad shared transform:

1. Asset normalization: EXIF orientation and deterministic normalized derivative.
2. Shared semantic transform: normalized crop, rotation, mirror state, and linked-group data that intentionally follows the asset across compatible placements.
3. Slide-instance placement: slot bounds, local offset, scale, opacity, z-order, and an explicit detached override.

Slides with different geometry may share a crop but must not share absolute coordinates. Semantic linked groups define exactly what propagates.

### 3.2 Electron security baseline

- `contextIsolation: true`
- `nodeIntegration: false`
- Chromium sandbox enabled
- no remote content
- restrictive Content Security Policy
- deny unexpected navigation, popups, permissions, and external protocols
- validate every IPC payload and result
- validate IPC sender/frame
- expose named operations only; never expose `fs`, `shell`, or arbitrary command execution
- resolve all case paths beneath the selected case root and reject traversal/symlink escapes
- serve local previews by opaque asset ID through a root-bound application protocol; do not expose raw paths to the renderer

## 4. Lead-agent operating model

The lead developer agent owns architecture, integration, context, and final verification. Subagents own bounded packages or test reviews; they do not make product decisions independently.

`PROJECT_CONTEXT.md` is the current pre-repository handoff. At repository creation, move or copy it to `docs/PROJECT_CONTEXT.md` and establish:

- `docs/PROJECT_CONTEXT.md`: current gate, accepted scope, stack, commands, latest decisions, open blockers, known defects.
- `docs/DECISIONS.md`: ADR index with decision, alternatives, evidence, and consequences.
- `docs/CLINICAL_DECISIONS.md`: questions and clinic-approved answers, with dates and approver labels.
- `docs/TEST_MATRIX.md`: unit/component/E2E/export/manual platform coverage.
- `docs/gates/GATE-N-REPORT.md`: delivered scope, files, commands, evidence, remaining risks, and next-gate prerequisites.

Rules:

1. Read the presentation/clinical specification, implementation plan, current project context, and relevant ADRs before each gate.
2. Work on one gate only. Do not quietly implement the next gate.
3. Freeze shared contracts before parallel work.
4. Use at most two implementation subagents concurrently unless their file ownership is completely disjoint.
5. Give each subagent exact directories, acceptance tests, and explicit non-goals.
6. The lead reviews every diff and reruns tests; a subagent report is not acceptance evidence.
7. Never put real patient data in the repository.
8. Do not weaken validation, security, or tests merely to make a gate green.
9. Update project context and the gate report before asking for acceptance.
10. Stop for the consultant/user when a clinical, privacy, or exporter decision is required.

Standard subagent return format:

```text
Scope completed:
Files changed:
Contracts introduced/changed:
Tests added:
Commands run and results:
Known limitations:
Questions/blockers:
```

## 5. Gate plan

## Gate 0 — Pre-implementation analysis and context — completed

Completed results:

- Inspected the empty template and three patient reference decks slide by slide.
- Confirmed the shared 4:3 canvas, one master, 11 layouts, template lineage, 35-slide patient sequence, missing template slide 35, and off-slide/scaffolding issues.
- Cleaned the presentation/clinical specification without removing its measurement, asset, geometry, notes, and alignment detail.
- Resolved both-platform support, local case folders, no-auth/no-encryption v1, manual-first measurements, precomposited trace, and non-blocking missing-content errors.
- Created `PROJECT_CONTEXT.md` as the single current-truth handoff for the lead agent.

The user does not have synthetic/anonymized fixtures. Gate 1 must create non-clinical synthetic test images and expected renders; this is an engineering deliverable, not a user prerequisite. The real patient decks remain local visual references and must not be copied into committed fixtures or CI output.

## Gate 1 — PowerPoint fidelity and exporter decision

Objective: prove or reject the primary exporter before the application grows around it.

Deliverables:

- Minimal workspace with a pure `Exporter` interface.
- Synthetic non-patient image fixtures with obvious crop/orientation/alignment markers; do not wait for the user to provide fixtures.
- Sanitized expected renders for slides 9, 22, 25, and 32 derived from the template geometry without patient pixels.
- PptxGenJS spike for slides 9, 22, 25, and 32.
- Semantic IDs and point-based geometry for those slides.
- Native editable text/tables, image crop/rotation/transparency, and speaker notes.
- Structural validator and deterministic render/diff harness.
- `ADR-001-exporter.md` accepting PptxGenJS or selecting .NET/Open XML fallback.

Tests:

- PPTX is a valid OPC/PresentationML package and opens without a repair warning.
- Canvas is 4:3, 10 × 7.5 inches / 720 × 540 points.
- Text and tables remain editable.
- Notes appear on the correct slide.
- Slide 22 opacity, z-order, scale, translation, and rotation survive export.
- Slide 25 table dimensions and formatting remain stable.
- Slide 32 flags overflow rather than silently clipping.
- Generated deck opens, edits, saves, reopens, and renders in current Windows PowerPoint.
- Compatibility check in current macOS PowerPoint before calling the exporter cross-platform safe.
- Same-environment render regression produces a documented baseline and threshold; do not claim pixel identity across different renderers or operating systems.

Exit criteria:

- All hard checks pass, or a documented PptxGenJS failure and a passing .NET/Open XML proof select the fallback.
- Only one production exporter path is selected.
- The exporter is behind a stable interface that does not expose library-specific objects to the domain or UI.

Recommended subagents:

- Export specialist: owns the four-slide spike and exporter implementation directory.
- QA specialist: owns validation/render scripts and expected comparisons; does not edit exporter code.

### Gate 1 prompt

```text
Apply the shared lead-agent rules and work only on Gate 1. First freeze the Exporter interface and four semantic slide inputs. Then delegate at most two disjoint tasks: one export-spike implementation and one independent validation/render harness.

Create synthetic non-clinical image fixtures yourself using labeled grids, gradients, and alignment markers; the user does not have anonymized fixtures. Implement slides 9, 22, 25, and 32 with PptxGenJS using 720 × 540 point source geometry derived from the clean template and verified against the patient examples. Do not copy patient pixels into fixtures or test output. Keep text and tables native/editable, add a speaker-note fixture, and exercise crop, rotation, transparency, z-order, and overflow. Add structural package validation and deterministic same-environment visual regression. Record manual Windows and macOS PowerPoint checks explicitly; do not substitute LibreOffice rendering for PowerPoint acceptance.

Write ADR-001 with measured evidence. If a hard requirement fails, prove the narrow .NET 8/Open XML fallback against the failed case before selecting it. Do not build the Electron UI, Record Board, or remaining slides. Finish with GATE-1-REPORT.md and stop.
```

## Gate 2 — Workspace and hardened Electron shell

Objective: create a reproducible, secure desktop foundation without clinical features.

Deliverables:

- pnpm workspace, TypeScript strict mode, formatting/linting, builds, and dependency lock.
- Electron main/preload/renderer separation with a typed bridge.
- React shell with routing/navigation placeholders.
- Restricted local application protocol.
- CI jobs on both Windows and macOS for the platform-sensitive packages and application smoke tests.
- Packaging smoke builds for both operating systems.

Tests:

- App launches and closes cleanly in development and packaged smoke mode.
- Renderer has no Node globals or generic filesystem API.
- IPC rejects malformed payloads and untrusted senders.
- Unexpected navigation, window creation, permissions, and external URLs are denied.
- CSP blocks network loads and unsafe script execution.
- No analytics or crash upload is active.

Exit criteria:

- Clean install/build/typecheck/lint/test commands are documented and green.
- Exact tool versions are pinned.
- Security baseline is covered by automated or inspectable assertions.

Recommended subagents:

- Desktop-platform agent owns `apps/desktop/main` and `preload`.
- Tooling/QA agent owns root configuration and launch/security tests.
- Lead owns bridge contracts and integration.

### Gate 2 prompt

```text
Apply the shared lead-agent rules and work only on Gate 2. Scaffold the pnpm workspace and secure Electron/React/TypeScript shell. Freeze a narrow typed preload API before parallel work. Use context isolation, disabled Node integration, Chromium sandboxing, a restrictive CSP, sender validation, denied navigation/popups/permissions, and no remote content.

Add documented build, typecheck, lint, unit-test, Electron E2E smoke, and package commands. Test rejection of malformed IPC and renderer attempts to access privileged APIs. Do not add case persistence, patient forms, image assignment, or slide features. Update decisions/context, produce GATE-2-REPORT.md, and stop.
```

## Gate 3 — Domain, case store, and media pipeline

Objective: make a case portable, recoverable, versioned, and safe before UI complexity.

Deliverables:

- Stable semantic IDs and Zod schemas for case, assets, findings, analyses, plan, slides, transforms, provenance, and configuration snapshot.
- Atomic versioned `case.json` persistence, migration framework, autosave/recovery, and double-open locking.
- Managed import pipeline with hash deduplication.
- Immutable originals, normalized derivatives, and thumbnails.
- Missing-asset detection and safe relink/restore-from-source contract.
- Synthetic fixture cases.

Tests:

- Round-trip schema tests and migration fixtures.
- Atomic-write interruption and recovery tests.
- Stale/live case-lock behavior.
- Duplicate content hash reuses one managed original.
- Source files are never modified or moved.
- EXIF orientation produces deterministic normalized output.
- Corrupt/unsupported/oversized images fail safely.
- Path traversal and symlink escape attempts are rejected.
- Case remains functional after moving the whole managed folder.
- Date-only age calculation is deterministic and timezone-independent.

Exit criteria:

- A CLI or test can create, save, close, move, reopen, migrate, and validate a complete synthetic case.
- Domain/case/media packages have no Electron dependency.

Recommended subagents:

- Domain agent owns schemas, template configuration, migrations, and fixtures.
- Storage/media agent owns safe persistence and media derivatives after the lead freezes contracts.

### Gate 3 prompt

```text
Apply the shared lead-agent rules and work only on Gate 3. Freeze the case schema and semantic ID rules first. Then implement domain/config/migration work separately from case-store/media work with non-overlapping files.

Use atomic same-directory writes, recovery snapshots, explicit schema migrations, managed content hashes, immutable originals, deterministic normalized derivatives, and root-bound path validation. Include template/config/exporter versions and the effective clinic configuration snapshot in every case. Add failure-path tests for interruption, corruption, locking, traversal, symlink escape, duplicate files, EXIF orientation, unsupported media, and moved case folders.

Do not build the Record Board or presentation UI. End with a green synthetic-case lifecycle test, updated context/ADRs, GATE-3-REPORT.md, and stop.
```

## Gate 4 — Shared slide document, layout engine, preview/export skeleton

Objective: prevent preview/PPTX drift by establishing one rendering contract.

Deliverables:

- Semantic `SlideDocument` intermediate representation.
- Point/EMU geometry library and deterministic CSS scaling adapter.
- Crop/contain/cover and transform matrices.
- Linked-group and detached-instance semantics.
- Preview renderer and selected exporter adapters consuming the same document.
- Optional-slide filtering and calculated display numbers by semantic ID.

Tests:

- Point ↔ EMU ↔ reference-pixel conversions, including 1 px = 0.5 pt at 1440 × 1080.
- Transform and crop round-trips/property tests.
- Optional slide omission never changes semantic identity or bindings.
- Preview and export adapters receive identical computed geometry.
- Golden spike slides remain within the Gate 1 regression threshold.

Exit criteria:

- No slide component or exporter contains a second independent layout calculation.
- A small preview can render and export the Gate 1 slides from the same fixture document.

Recommended subagents:

- Layout-model agent owns pure geometry/contracts.
- Adapter agent owns preview/export adapters after contracts are frozen.

### Gate 4 prompt

```text
Apply the shared lead-agent rules and work only on Gate 4. Define a library-neutral SlideDocument and pure point-space layout engine before any UI work. Represent semantic slide IDs, native text/table/image primitives, notes, slot bounds, shared crop/transform groups, and explicit per-instance overrides.

Make both preview and the selected exporter consume the same computed document. Add deterministic point/EMU/reference-pixel conversions and property-based transform tests. Prove optional slide omission and stable semantic identity. Re-run all Gate 1 goldens. Do not implement the Record Board or full clinical forms. Produce GATE-4-REPORT.md and stop.
```

## Gate 5 — Record Board and local record intake

Objective: deliver the complete manual asset-assignment workflow.

Deliverables:

- Grouped Record Board for core assets.
- Slot states, neutral orientation guides, completion counts, filters, and jump-to-next-missing.
- Individual picker and drag/drop.
- Multiple-file/folder mapping review.
- Deterministic Turkish/English filename aliases and aspect-ratio suggestions.
- Explicit accept/reject/swap/remove/reveal/metadata actions.
- Record preview and primary/reused slide preview.

Tests:

- Individual keyboard-only assignment path.
- Multiple-file/folder drop never silently commits suggestions.
- Low-confidence/duplicate candidates stay unassigned.
- Reassign/swap/remove updates the manifest without modifying source files.
- Completion counts distinguish required/usually/optional.
- Preview works offline and receives opaque asset IDs, not unrestricted paths.
- Accessibility: names, focus order, visible focus, keyboard actions, contrast, reduced motion.

Exit criteria:

- A user can assign every core record one-by-one without selecting a folder.
- A synthetic case survives close/reopen with the same assignments.

Recommended subagents:

- Record Board UI agent owns renderer components.
- Mapping agent owns deterministic matcher and tests.
- Lead owns IPC integration and end-to-end acceptance.

### Gate 5 prompt

```text
Apply the shared lead-agent rules and work only on Gate 5. Implement the approved Record Board as the primary intake UI. Manual single-slot assignment must be complete without folder intake. Folder/multi-file matching is only a provisional review flow and must require explicit acceptance.

Keep patient pixels local, use opaque asset IDs in the renderer, show required status and reuse metadata, and support keyboard-accessible choose/replace/remove/swap actions. Add deterministic filename/aspect-ratio matcher tests plus Electron E2E tests for assignment, persistence, preview, and source-file immutability. Do not implement clinical measurement forms or the full deck. Produce GATE-5-REPORT.md and stop.
```

## Gate 6 — First clinician-usable vertical slice: metadata, findings, HN/Bolton, slides 1–15

Objective: generate a useful editable deck section from one source of truth.

Deliverables:

- Patient/case metadata and date-only age calculation.
- Extraoral and dental/occlusal findings.
- Manual final-result HN and Bolton forms.
- Slide definitions 1–15.
- Consistent Turkish numeric/unit/text formatting.
- Completeness and overflow validation.
- End-to-end create → assign → enter → preview → export flow.

Tests:

- One shared field change updates every occurrence across slides 9–15.
- Right/left classifications cannot diverge between photo and model slides.
- HN/Bolton sign, affected arch, blank, and not-calculable states render correctly.
- Long complaint/history/findings and table text produce deterministic overflow feedback.
- Decimal comma UI input stores canonical numeric values.
- Export contains no scaffolding, placeholder value, or production reminder.
- Goldens for representative slides and a full synthetic 1–15 deck.

Exit criteria:

- A clinician can complete and export slides 1–15 using only synthetic/anonymized inputs.
- Every repeated value is bound to one canonical field.

Recommended subagents:

- Clinical-form agent owns UI/schema bindings but not slide rendering.
- Slide-definition agent owns slides 1–15 after the lead freezes field keys.

### Gate 6 prompt

```text
Apply the shared lead-agent rules and work only on Gate 6. Freeze the field-to-slide binding table first. Implement metadata, extraoral/occlusal findings, manual final HN/Bolton results, and slide definitions 1–15. Do not add automatic diagnostic conclusions or tooth-level calculators.

Use one canonical field for every repeated value. Add tests proving edits propagate across all relevant slides and cannot diverge. Handle Turkish decimal display separately from numeric storage, detect overflow, and remove all authoring scaffolding. Deliver an Electron E2E vertical slice from case creation to editable PPTX export, update context, write GATE-6-REPORT.md, and stop.
```

## Gate 7 — Precision alignment editor and transform history

Objective: provide deterministic non-destructive alignment with trustworthy undo/redo.

Deliverables:

- Selection, zoom, pan, rulers/guides, numeric controls, crop, scale, rotation, opacity, and z-order.
- Exact keyboard nudges and rotation increments.
- Shared-link/unlink behavior with visible override status.
- Undo/redo command history for every transform operation.
- Copy/paste/reset current/reset linked transforms.
- Alignment task grouping.

Tests:

- Arrow/Shift/Alt increments map exactly to documented point values.
- Undo/redo restores bit-for-bit transform state across compound actions.
- Linked transformations propagate only the properties defined by their group.
- Unlink/relink behavior is explicit and reversible.
- Summary montage crop overrides never alter detailed-slide crops.
- 800% zoom and pan do not change stored geometry.
- Preview/export parity goldens for rotation, opacity, crop, and z-order.

Exit criteria:

- Gate 1 overlay can be aligned in UI, exported, reopened, and visually match the preview within the accepted tolerance.

Recommended subagents:

- Transform/history agent owns pure commands and property tests.
- Editor UI agent owns interaction controls after command contracts are frozen.

### Gate 7 prompt

```text
Apply the shared lead-agent rules and work only on Gate 7. Freeze the transform command model, linked-property rules, and undo/redo semantics before UI implementation. Store geometry in slide points/EMU; CSS pixels are only a view scale.

Implement exact keyboard nudges, crop/scale/rotation/opacity/z-order, zoom/pan/guides, link/unlink status, reset, and copy/paste. Add property tests and E2E tests for compound undo, shared propagation, per-slide overrides, and preview/export parity. Do not implement new slide sections. Produce GATE-7-REPORT.md and stop.
```

## Gate 8 — Imaging, cephalometrics, and slides 17–28

Objective: complete the highest-risk clinical/image section through manual input.

Deliverables:

- Slides 17, 19–23, and 25–28.
- Slide 24 using one precomposited traced-ceph asset for v1 unless Gate 0 approved separate layers.
- Panoramic reuse and linked left/right condyle crops.
- Profile/ceph overlay using the precision editor.
- Complete manual vertical, sagittal, upper-incisor, lower-incisor, and soft-tissue forms.
- Versioned reference values and explicit blank/not-measured/not-applicable states.
- Clinician-authored/edited/approved interpretations.

Tests:

- Every canonical measurement supports manual entry without any workbook.
- Units and signed values render consistently.
- Clinic reference values cannot be overwritten as patient T0 values.
- No interpretation enters export until explicit approval.
- Ceph shared crop propagates across compatible slides while placements remain layout-specific.
- Pano condyle crop changes do not mutate the original or the main pano placements.
- Full slides 17–28 synthetic deck passes structural and visual regression.

Exit criteria:

- The complete manual cephalometric workflow works offline without Dolphin files.
- Overlay and measurement slides pass PowerPoint review.

Recommended subagents:

- Measurement-form/config agent owns manual forms and reference configuration.
- Imaging-slide agent owns slides and crop/link behavior after contracts are frozen.

### Gate 8 prompt

```text
Apply the shared lead-agent rules and work only on Gate 8. Implement the complete manual cephalometric form and the core imaging slides. Keep T0 patient data separate from versioned clinic references. Require clinician approval for every interpretation; do not infer diagnosis silently.

Use the established transform engine for pano crops, profile/ceph overlay, and shared ceph crop groups. For v1, treat slide 24 as a precomposited traced-ceph image unless Gate 0 explicitly approved a two-layer workflow. Exclude Dolphin import and optional video/TMJ-form features. Add full structural, binding, manual-entry, approval, and visual tests. Produce GATE-8-REPORT.md and stop.
```

## Gate 9 — Diagnosis, plan, decision, notes, and slides 29–33

Objective: complete the core clinician-authored narrative and decision workflow.

Deliverables:

- Analysis summary, problem/goal/plan rows, and case decision.
- Slides 29–33.
- Per-slide notes and case note with explicit export-notes setting.
- Overflow-aware text fitting with minimum readable sizes and manual correction prompts.
- Final-review navigator and validation report.

Tests:

- Unapproved draft interpretations are not exported as final clinical conclusions.
- Problem rows bind logically despite the physical PowerPoint table structure.
- Overflow is detected; text is never silently clipped or reduced below the approved minimum.
- Notes remain private when export is off and attach to correct slides when on.
- Optional slide numbering never leaks into data keys or note keys.

Exit criteria:

- Core deck slides 1–33, excluding approved optional modules, can be reviewed and exported end-to-end.

Recommended subagents:

- Narrative/form agent owns structured authoring and approval states.
- Slide/notes agent owns slides 29–33 and notes export.

### Gate 9 prompt

```text
Apply the shared lead-agent rules and work only on Gate 9. Implement clinician-authored summaries, up to five problem/goal/plan rows, case decision, per-slide notes, final-review navigation, and slides 29–33. Keep draft/generated text distinct from approved export text.

Use explicit overflow errors and approved minimum font sizes; never silently clip. Verify that notes are excluded by default and exported only when enabled. Keep semantic IDs stable through optional-slide omission. Complete core-deck E2E and visual tests, produce GATE-9-REPORT.md, and stop.
```

## Gate 10 — Clinic-approved optional modules only

Objective: implement only optional content that the clinic has explicitly selected for v1.

Candidate modules:

- Slide 16 inferior comparison.
- Slide 18 poster frame; no embedded video in the default v1 plan.
- Slide 21 questionnaire image or structured TMJ form.
- Separate trace layer for slide 24.
- Slide 34 ICON after labels are clinic-approved.
- Slide 35 assigned worksheet image or native renderer after formula/input approval.

Rules and tests:

- Each module has a semantic feature flag and explicit completeness criteria.
- Disabled/empty optional slides are omitted, not exported blank.
- Dynamic display numbering, notes, links, and navigation remain correct.
- No ICON labels, worksheet formulas, or TMJ answers are invented.
- Each enabled module has its own acceptance fixture and golden.

Exit criteria:

- Every implemented module has a recorded clinic decision and passes the core-deck regression suite.

Recommended agent use: one module agent at a time. Do not parallelize modules that touch shared slide sequencing or configuration until the lead freezes the module contract.

### Gate 10 prompt

```text
Apply the shared lead-agent rules and work only on Gate 10. Read the approved optional-module matrix and implement only modules marked v1-approved. Treat every module as independently enabled, validated, tested, and omitted when disabled. Do not invent clinical labels, formulas, or form contents.

Add module-specific fixtures/goldens and rerun the entire core deck to prove semantic IDs, slide numbering, notes, and navigation remain correct. Document every deferred module explicitly. Produce GATE-10-REPORT.md and stop.
```

## Gate 11 — Recovery, privacy hardening, packaging, and clinical pilot

Objective: turn the feature-complete build into a safe pilot release.

Deliverables:

- Archive/restore/relink workflows and documented case backup behavior.
- Redacted local logs and export history.
- Clear deletion behavior; temporary renders cleaned after use.
- Signed installers for approved platforms and documented update policy.
- Install/uninstall/upgrade/migration tests.
- Accessibility and performance passes on representative case sizes.
- User guide, privacy/deployment guide, support diagnostic bundle that excludes PHI by construction.
- Clinician pilot checklist and issue triage process.

Tests:

- Crash/restart during save/export does not corrupt the last good case.
- Upgrade migrates copies of fixture cases and preserves old exports.
- Uninstall does not silently delete user-selected case folders.
- Logs and diagnostic bundles contain no patient fields, filenames, paths, or pixels.
- App functions with network disabled.
- Packaged application passes security smoke tests.
- Current Windows PowerPoint and macOS PowerPoint compatibility matrix is complete.
- Pilot cases are reviewed by clinicians; software never claims diagnostic validation.

Exit criteria:

- Release checklist is green, unresolved risks are accepted in writing, and a clinician approves the pilot deck outputs.

Recommended subagents:

- Independent security/privacy reviewer: read-only review first, targeted fixes second.
- Release/QA agent: packaging, upgrade, compatibility, and recovery matrix.

### Gate 11 prompt

```text
Apply the shared lead-agent rules and work only on Gate 11. Begin with independent read-only security/privacy and release/recovery reviews. Fix accepted findings with focused ownership. Verify offline behavior, redacted diagnostics, crash recovery, case migrations, archive/relink, temporary-file cleanup, install/uninstall/upgrade safety, accessibility, and supported-platform PowerPoint compatibility.

Package signed pilot builds only after the complete automated suite passes. Produce user/deployment guides, pilot checklist, risk register, release evidence, and GATE-11-REPORT.md. Do not describe the tool as diagnostic or clinically validated. Stop for final pilot approval.
```

## Backlog Gate D — Dolphin workbook import

This is not part of the critical path. Begin only after core manual entry is stable and representative anonymized exports exist.

Required sequence:

1. Inspect real anonymized `.xls` containers and record signatures/profiles.
2. Freeze a format-adapter interface.
3. Parse workbook content as inert data with formulas/macros/external links disabled.
4. Normalize labels/units without losing original text.
5. Map by profile alias + normalized label + unit, never by row number.
6. Review mapped/missing/unrecognized/conflict/needs-confirmation states.
7. Apply confirmed values to the same canonical manual fields.
8. Preserve source hash and field provenance without logging patient identifiers.

It must pass equivalence: manual entry and confirmed import of the same values produce identical `case.json` clinical values and identical slide output.

### Backlog Gate D prompt

```text
Work only on the Dolphin import backlog after the lead confirms representative anonymized exports are available and the core manual workflow is stable. Inspect actual file signatures first; do not trust the .xls extension. Build format adapters that parse inert data and never execute formulas, macros, links, or objects.

Map by configured profile alias, normalized label, and unit. Preserve original rows and provenance; require review for ambiguity, conflict, patient/timepoint mismatch, and unknown fields. Apply confirmed values to the existing editable manual controls. Prove manual/import output equivalence. Do not change canonical measurement keys to fit workbook quirks. Produce a dedicated gate report and stop.
```

## 6. Continuous test strategy

| Layer | Tooling | Required coverage |
| --- | --- | --- |
| Pure domain/layout | Vitest + fast-check | schemas, migrations, units, date math, semantic IDs, crop/transform invariants, slide filtering |
| Storage/media | Vitest integration | atomic writes, recovery, locking, hashes, derivatives, corruption, path attacks |
| React components | React Testing Library + accessibility checks | forms, Record Board states, keyboard flow, approval states, overflow UI |
| Renderer workflows | Playwright browser/component tests with a fake typed bridge | fast deterministic UI coverage |
| Electron integration | Playwright Electron smoke tests | preload/IPC, native dialogs via controlled seams, case lifecycle, packaging smoke |
| PPTX structure | Open XML validator + package assertions | valid relationships/content types, canvas, notes, slide count, native objects |
| Visual regression | deterministic renderer → PDF/PNG → image diff | same-environment regression only, stable golden fixtures |
| PowerPoint acceptance | Windows and macOS PowerPoint | open without repair, edit/save/reopen, notes, crops, tables, fonts |
| Clinical acceptance | orthodontist review | labels, norms, readability, workflow, output correctness |

CI visual tests must run in one pinned container/OS with fixed fonts and one worker. Cross-platform visual differences are inspected separately, not hidden by broad pixel thresholds.

## 7. Resolved decisions and remaining product choices

Resolved:

1. The application is a small offline desktop tool for roughly three or four local users.
2. There is no authentication, RBAC, encryption feature, cloud service, or external data transfer in v1.
3. Both macOS and Windows must work. Normal use is mainly macOS; development/testing is mainly Windows.
4. Missing clinical content produces visible content errors that require acknowledgement but do not block export. Corrupt data or exporter failures still block export.
5. Three 35-slide patient examples and one 34-slide empty template are available as local layout evidence.
6. A case folder is simply the application's self-managed local folder containing one case's JSON, copied assets, autosave files, and exports.

Observed reference-deck facts:

- All four decks use exactly `9144000 × 6858000` EMU (`10 × 7.5 in`, 4:3), one master, and 11 layouts.
- The patient decks contain 35 slides; `VAKA TEMPLATE` contains 34 and lacks the final worksheet slide.
- The template retains off-slide/scaffolding content on slides 21–24. Patient decks contain additional off-canvas items on varying slides, so none should be used unchanged as a production template.
- The empty template is still the best canonical layout source because it preserves native tables, text styling, guide labels, and the shared template hierarchy without patient photography.

Remaining choices, with recommended defaults until changed:

1. Turkish UI and Turkish deck output only for v1.
2. Omit unused optional slides rather than exporting blanks.
3. Use one precomposited traced-ceph image for slide 24 in v1.
4. Accept clinician-entered final HN/Bolton results without tooth-level calculators in v1.
5. Use the fonts already present in the template after a macOS/Windows substitution check; explicitly embed or bundle only fonts with suitable licensing.

## 8. Immediate next action

Gate 0 documentation is complete. Start Gate 1 using `PROJECT_CONTEXT.md`, the cleaned presentation/clinical specification, this implementation plan, and the supplied template family. Gate 1 creates its own synthetic non-patient fixtures and resolves the exporter ADR. No full UI or 35-slide build should start until that ADR is accepted.

## 9. Reference rationale

- Electron's security guidance supports context isolation, restricted renderers, sender validation, and narrow IPC.
- Electron documents Playwright-based Electron testing, while noting that the Electron integration is experimental; therefore keep most renderer tests browser-based and reserve Electron E2E for critical seams.
- PptxGenJS documents native masters, images, crop/contain/cover, rotation, transparency, tables, and notes, which justifies the spike but not automatic acceptance.
- The Open XML SDK supports PresentationML construction/manipulation and validation, making it a suitable fallback exporter and an independent structural validator.
- Sharp supports EXIF auto-orientation and bounded image decoding; keep its input limits enabled.
