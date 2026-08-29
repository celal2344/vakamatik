# Orthodontic Case Presentation Builder — Implementation Plan

Status: Gate 2 accepted; Gate 3 authorized
Version: 1.0
Date: 2026-08-30

## 1. Product and architecture baseline

Vakamatik is a local, offline Electron application for preparing editable orthodontic case-presentation PowerPoints. The portable source of truth is a versioned `case.json` plus managed local assets. Windows and macOS remain target platforms, while no server, account system, cloud storage, telemetry, or external patient-media processing is part of v1.

The active stack is:

- Electron, React, strict TypeScript, Vite, and pnpm workspaces.
- Zod at persistence and IPC boundaries.
- Sharp for image metadata, orientation normalization, and thumbnails.
- PptxGenJS 4.0.1 behind the library-independent exporter contract accepted in Gate 1.
- Vitest for essential package tests and focused Playwright coverage for Electron seams.
- Electron Forge for unsigned development packaging.

Repository material under `resources/` is local reference evidence only. It must not be copied, staged, committed, uploaded, logged, or used as test data.

## 2. Stable boundaries

```text
apps/desktop               Electron main, preload, renderer
packages/desktop-contract  Narrow typed renderer bridge
packages/domain            Versioned case schema and stable IDs
packages/case-store        Atomic local persistence and managed folders
packages/media             Safe import, hashing, normalization, thumbnails
packages/slide-model       Shared semantic presentation document
packages/layout-engine     Point/EMU geometry and transforms
packages/preview           Renderer for the shared slide document
packages/pptx-exporter     Accepted PowerPoint exporter
packages/validation        Human-readable case/export validation
packages/test-fixtures     Synthetic non-patient fixtures only
```

Rules:

- Packages do not depend on Electron.
- The renderer receives named typed operations, never raw `fs`, `path`, generic IPC, or unrestricted local paths.
- Every renderer request and main-process response is runtime validated.
- Case data refers to managed assets by stable IDs and relative paths.
- Source files are copied, never moved, renamed, overwritten, or modified.
- Preview and export must eventually consume the same semantic slide document and geometry.

## 3. Lightweight gate process

For Gates 3–6:

- Work on one gate only and stop before the next gate.
- Do not use subagents.
- Avoid speculative abstractions and unrelated refactors.
- Add only tests essential to the gate’s working behavior and regressions.
- Do not create an ADR unless an actual hard-to-reverse architectural trade-off is decided.
- Update only `PROJECT_CONTEXT.md` and one short `docs/gates/GATE-N-REPORT.md` for gate documentation.
- After two unsuccessful attempts at the same blocker, stop and report it.
- Keep completion responses concise.
- Never weaken the Electron security boundary, privacy rules, or exporter evidence to make a gate pass.

## 4. Accepted gates

### Gate 1 — PowerPoint fidelity and exporter decision — accepted

The four-slide synthetic spike proved editable native text/tables, notes, crop, opacity, z-order, scale, translation, fractional rotation, overflow reporting, and the exact 4:3 canvas. PptxGenJS 4.0.1 is the selected exporter. Windows PowerPoint persistence passed. macOS PowerPoint testing was deferred by an explicit product-owner exception and remains a residual risk.

### Gate 2 — Workspace and hardened Electron shell — accepted

The exact-pinned pnpm/Electron/React/TypeScript workspace, restricted local protocol, narrow validated preload API, hardened renderer, Forge packaging, and security smoke coverage are complete.

Accepted limitations:

- Packaged Windows launch was blocked by Smart App Control and is not claimed as passed.
- Cross-platform CI acceptance was deferred and is not claimed as passed.
- Windows packaging, ASAR inspection, fuse checks, 31 Vitest tests, and the Electron Playwright test passed.

## 5. Remaining gates

### Gate 3 — Core cases

Objective: deliver the smallest portable local case workflow and manual Record Board.

Scope:

- Versioned Zod case schema with stable case, asset, and record-slot IDs.
- Managed local case folder with `case.json`, immutable imported originals, normalized images, and thumbnails.
- Atomic save, close, reopen, and relocation-safe relative references.
- JPEG/PNG import with path containment, content-hash deduplication, orientation normalization, and thumbnails.
- Minimal Record Board to create, open, edit, save, reopen, and manually assign images.
- Narrow typed preload/IPC operations for only those case actions.

Essential tests:

- Create, save, close, and reopen a synthetic case.
- Imported source bytes remain unchanged.
- Duplicate imports reuse managed content.
- Traversal and outside-root access are rejected.
- Moving the whole case folder preserves the case.
- Existing Gate 1 and Gate 2 tests remain green.

Non-goals: slide layouts, presentation preview/export expansion, alignment, measurements, diagnosis, treatment planning, folder auto-mapping, recovery history, and release packaging changes.

### Gate 4 — Presentation builder

Objective: build the shared layout, preview, and export system and all required v1 slides.

Scope:

- Semantic slide document and point/EMU layout engine.
- One shared placement calculation for preview and PowerPoint export.
- Required canonical slide definitions and editable PowerPoint output.
- Required asset reuse, crop behavior, native text/tables, notes plumbing, overflow reporting, and final deck validation.
- Synthetic full-deck fixtures and essential structural/visual regression coverage.

Optional modules from the former Gate 10 are not part of v1. Disabled or unsupported optional slides are omitted rather than exported blank.

### Gate 5 — Clinical editing

Objective: complete clinician-facing editing and review workflows.

Scope:

- Precision crop/alignment, translation, uniform scale, rotation, opacity, z-order, linked transforms, and focused undo/redo.
- Manual clinical measurement entry.
- Clinician-authored diagnosis, interpretations, problem/goal/plan, case decision, and notes.
- Completeness/overflow feedback, keyboard accessibility, and practical usability refinement.
- End-to-end editing of a synthetic case through final presentation review.

Automatic diagnosis, Dolphin import, and tooth-level HN/Bolton calculators remain outside v1.

### Gate 6 — Final release

Objective: make the completed core workflow ready for a small clinic pilot.

Scope:

- Essential save/reopen/recovery and migration checks.
- Focused regression suite for case portability, media integrity, renderer security, and PowerPoint generation.
- Windows/macOS packaging evidence available for the release environment.
- Privacy/log review, offline verification, cleanup of temporary artifacts, and pilot checklist.
- Concise operator guidance and explicit residual-risk acceptance.

Signing, notarization, auto-update, analytics, cloud services, authentication, and diagnostic validation are not implied by this gate unless separately authorized.

## 6. Deferred backlog

### Dolphin workbook import

Dolphin `.xls` import is an alternative input path after manual clinical entry is stable and representative anonymized exports are available. It must parse files as inert data, map confirmed values into the same canonical manual fields, retain provenance, and never execute workbook macros, links, or objects.

### Other excluded v1 capabilities

- Former Gate 10 optional slide modules.
- Automatic record classification.
- Tooth-level space-analysis calculators.
- Automatic diagnostic or interpretation rules.
- Embedded video.
- Authentication, accounts, cloud sync, telemetry, and remote crash reporting.

## 7. Current next action

Implement Gate 3 only. Produce a working local case lifecycle and minimal manual Record Board, update `PROJECT_CONTEXT.md`, create `docs/gates/GATE-3-REPORT.md`, verify the essential tests, commit, push, and stop before Gate 4.
