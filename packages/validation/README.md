# Gate 1 validation boundary

Gate 1 validation is deliberately independent from the PptxGenJS exporter implementation.

- `tools/pptx-validator` validates the generated OPC/PresentationML package without loading exporter code.
- `tools/powerpoint` renders and exercises a controlled acceptance copy through installed Windows PowerPoint.
- `tests/gate-1` validates the library-independent document contract, overflow behavior, generated structure, privacy canaries, and same-environment rendered output.

The visual goldens are valid only for the recorded Windows, PowerPoint version, installed fonts, and 1440 × 1080 render size. They do not establish Windows/macOS equivalence.

Goldens may be replaced only after a human inspects all four current renders:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/powerpoint/Compare-RenderedSlides.ps1 `
  -CurrentDirectory artifacts/gate-1/render-current `
  -GoldenDirectory artifacts/gate-1/goldens `
  -EvidencePath artifacts/gate-1/validation/visual-regression.json `
  -UpdateGoldens
```

The generated original is never opened for editing. `Invoke-PowerPointAcceptance.ps1` first creates a separate acceptance copy.
