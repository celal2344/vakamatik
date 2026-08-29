# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Electron 44, React 19, TypeScript 7, and Vite 8 in a pnpm workspace. The renderer is a local web surface inside a hardened desktop shell targeting Windows and macOS.

## Users

Orthodontists working locally on approximately three or four clinic computers. They assemble standardized case-presentation PowerPoints from clinical records and clinician-authored data.

## Product Purpose

Vakamatik helps a clinician turn local case records and manually entered findings into a consistent, editable orthodontic PowerPoint. Success means reducing repetitive placement and copying while leaving clinical judgment and approval with the orthodontist.

## Positioning

The product binds named clinical record slots and canonical fields to reusable semantic slide definitions, then preserves precise non-destructive placement in an editable PowerPoint rather than flattening the case into a generic report.

## Operating Context

The application operates offline on Windows and macOS, usually on macOS in clinical use. Patient records remain local. The source presentation family is evidence for layout and behavior, not runtime content and not repository material.

## Capabilities and Constraints

- Turkish is the default visible language for v1.
- The application is a presentation-production tool, not a diagnostic system.
- No cloud service, accounts, authentication, telemetry, analytics, crash upload, auto-update, or remote content is part of v1.
- Patient data and local reference material must never enter committed fixtures, logs, CI artifacts, or external services.
- Gate 2 establishes only the secure shell; case storage, patient forms, records, measurements, previews, and exporter expansion belong to later gates.

## Evidence on Hand

- Canonical product and clinical specification: `ORTHODONTIC_CASE_PRESENTATION_TOOL_SPEC.md`.
- Architecture and gated implementation plan: `ORTHODONTIC_CASE_BUILDER_IMPLEMENTATION_PLAN.md`.
- Accepted four-slide synthetic exporter spike and evidence under `artifacts/gate-1/`.
- Local reference material under ignored `resources/`; it must not be copied, staged, committed, or uploaded.

## Product Principles

- Keep patient records local and privileged capabilities narrow.
- Bind repeated content to one canonical source of truth.
- Preserve editable PowerPoint output and non-destructive image transforms.
- Make missing content explicit without pretending the software makes clinical decisions.
- Advance one acceptance gate at a time.

## Accessibility & Inclusion

Core workflows must remain keyboard-accessible with visible focus, semantic controls, readable contrast, and reduced-motion support.
