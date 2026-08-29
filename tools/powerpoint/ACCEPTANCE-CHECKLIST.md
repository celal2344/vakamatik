# Gate 1 PowerPoint acceptance checklist

Use a copy of `artifacts/gate-1/gate-1-spike.pptx`. Never overwrite the generated evidence artifact.

Record the PowerPoint version, operating-system version, device architecture, date, tester, and SHA-256 of the unmodified artifact.

For both Windows PowerPoint and macOS PowerPoint:

- [ ] Open the artifact without a repair, corruption, conversion, or font warning.
- [ ] Inspect all four slides at 100% and in Slide Show view.
- [ ] Confirm each image preserves its aspect ratio and expected crop.
- [ ] Confirm slide 22 opacity, fractional rotation, crop, stacking, and alignment markers.
- [ ] Edit native text on slide 9.
- [ ] Edit a native table cell on slides 25 and 32.
- [ ] Move one image on slide 22 by a visible amount.
- [ ] Confirm slide 25 speaker notes are present and editable.
- [ ] Save the acceptance copy, close PowerPoint, and reopen it.
- [ ] Confirm text/table edits and the image move persisted.
- [ ] Confirm notes, crops, opacity, rotation, and layer alignment remain correct.
- [ ] Confirm no object appeared outside the canvas and no hidden scaffolding is visible.
- [ ] Confirm slide 32 normal content is readable without clipping.

Recorded status: **Windows PASS (2026-08-29) / macOS DEFERRED BY PRODUCT OWNER (not tested)**. macOS compatibility remains an unverified residual risk. The canonical detailed checklist and evidence table are in `docs/gates/POWERPOINT-ACCEPTANCE-CHECKLIST.md`.

Any failure must include the slide semantic ID, object, PowerPoint version, exact reproduction steps, screenshot, and a copy of the modified acceptance presentation if safe.
