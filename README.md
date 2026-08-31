# Vakamatik

Vakamatik is an offline desktop application for assembling editable orthodontic case-presentation PowerPoints from locally managed records and clinician-entered data. It is a presentation-production tool, not a diagnostic system.

Release status: `0.1.0` unsigned Windows pilot build. macOS use and packaging remain unverified.

## Install the Windows pilot build

1. Obtain the complete `Vakamatik-win32-x64` folder from the project owner. The generated folder is not stored in Git.
2. Keep every file in that folder together; do not copy only `Vakamatik.exe`.
3. Run `Vakamatik.exe`.
4. Store case folders in a writable local location that is included in the clinic's normal backup process.

The pilot package is unsigned. Do not disable or bypass Windows security controls to run it. Report any Windows warning or launch block to the project owner.

## Development

Required versions are pinned in the repository:

- Node.js `24.15.0`
- pnpm `10.17.1` (installed directly; Corepack is not used)
- .NET 8 SDK for the independent PowerPoint structure validator

From PowerShell in the repository root:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Main verification commands:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:electron
pnpm build
pnpm package
pnpm test:package-inspect
pnpm test:package-smoke
```

`pnpm package` creates an ignored unsigned package under `apps/desktop/out/`.

## Case workflow

1. Open **Sunum oluşturma** and create a case in a writable parent folder, or resume a recent case.
2. In **Kayıtlar**, assign JPEG or PNG records to the named Record Board slots. Vakamatik copies them into the managed case folder without modifying the selected originals.
3. In **Klinik**, enter patient metadata, findings, manual HN/Bolton results, cephalometric measurements, clinician-approved interpretations, problem/goal/plan rows, the case decision, and optional speaker notes.
4. In **Sunum**, review slide thumbnails and missing-content warnings. Select images directly in the preview to adjust placement, crop, scale, rotation, and opacity.
5. Move between tabs, slides, or sessions to save pending edits. Normal application close also saves; a failed save blocks the transition or close.
6. If a recent case folder was moved, use **Yeniden bağla**. If a managed image is missing, try to open that session and then use **Eksik görüntüyü onar** with the exact original file.

Keep the complete case folder together. Its `case.json` and managed `assets/` are the portable source of truth. Copying or moving the whole folder preserves the case; moving only parts does not.

## PowerPoint export

The Presentation page lists missing content. Missing clinical content requires explicit acknowledgement but does not otherwise prevent export. Corrupt cases, unreadable assets, invalid transforms, and exporter failures block export.

Choose **PowerPoint dışa aktar** and save the editable `.pptx`. Open the result in Microsoft PowerPoint and review image alignment, measurements, optional slides, and speaker notes before clinical use.

## Privacy and backups

- Vakamatik has no cloud service, accounts, telemetry, analytics, or remote crash reporting.
- Patient media and case data remain in local case folders selected by the user.
- The application does not provide encryption or backups. Use operating-system access controls and the clinic's approved backup process.
- Never attach patient cases, screenshots, exported decks, or local paths to public issue reports.

## Known limitations

- The `0.1.0` package is unsigned and intended only for a small Windows pilot.
- Automated macOS build, packaging, launch, and application testing are deferred and unverified.
- macOS PowerPoint compatibility was not tested under the existing product-owner waiver.
- JPEG and PNG are supported; HEIC, TIFF, DICOM, and embedded video are not.
- Dolphin workbook import, tooth-level HN/Bolton calculators, automatic diagnosis, PDF export, signing, notarization, auto-update, authentication, and cloud sync are not included.
- Slide 24 uses a precomposited tracing image. Optional slides are omitted when their content is empty.

First pilot users should complete [docs/PILOT-CHECKLIST.md](docs/PILOT-CHECKLIST.md) before relying on the application for routine case work.
