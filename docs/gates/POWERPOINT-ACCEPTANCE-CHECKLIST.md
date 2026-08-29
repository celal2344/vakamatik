# Gate 1 PowerPoint acceptance checklist

Artifact under test: `artifacts/gate-1/gate-1-spike.pptx`

Never edit the original artifact during acceptance. Make one platform-specific copy first:

- Windows: `gate-1-spike-windows-acceptance.pptx`
- macOS: `gate-1-spike-macos-acceptance.pptx`

Record the PowerPoint version, operating-system version, CPU architecture, tester, date, and artifact SHA-256 in the Gate 1 report.

## Required checks on each platform

### Open and inspect

- [ ] Open the copied deck in the current desktop Microsoft PowerPoint.
- [ ] Confirm PowerPoint shows no repair, recovery, unreadable-content, font-substitution, or compatibility warning.
- [ ] Confirm the canvas is 4:3 and exactly four slides are present.
- [ ] Inspect all four slides at Fit and 100% zoom.
- [ ] Confirm synthetic grids, center lines, crop markers, and orientation labels are sharp and correctly oriented.
- [ ] Confirm no object, guide, or hidden scaffolding appears beyond the slide canvas.

### Slide 9 — `dental_frontal_comparison`

- [ ] Confirm all three images preserve aspect ratio and show the expected crop markers.
- [ ] Confirm midline guides appear above their intended image layers.
- [ ] Edit the upper-midline text and confirm it is native text.
- [ ] Edit overjet or overbite and confirm it is native text.
- [ ] Move one synthetic image by a visible amount.

### Slide 22 — `ceph_profile_overlay`

- [ ] Confirm the two synthetic layers are visibly aligned at their center/crosshair markers.
- [ ] Confirm the fractional rotation is visible and correct.
- [ ] Confirm opacity allows both layers to remain visible.
- [ ] Confirm crop and z-order are correct.
- [ ] Move the top layer by a visible amount.

### Slide 25 — `ceph_vertical`

- [ ] Confirm the ceph fixture is on the left and preserves aspect ratio.
- [ ] Confirm the measurement table is native and editable.
- [ ] Edit one T0 table cell.
- [ ] Confirm row heights, column widths, highlight colors, alignment, units, and signed values remain stable.
- [ ] Confirm normal fixture text does not wrap or clip.
- [ ] Open the Notes pane and confirm the Gate 1 note is attached to this slide only.

### Slide 32 — `problem_goal_plan`

- [ ] Confirm the problem/goal/plan table is native and editable.
- [ ] Edit one table cell.
- [ ] Confirm short/normal content is readable and unclipped.
- [ ] Confirm the deck does not contain the intentionally excessive fixture; that fixture must be rejected before export and reported by automated validation.

### Save and reopen

- [ ] Save the platform-specific acceptance copy.
- [ ] Close PowerPoint completely.
- [ ] Reopen the saved copy.
- [ ] Confirm all deliberate text/table/image edits remain.
- [ ] Confirm notes remain attached to slide 25.
- [ ] Confirm unaffected crops, opacity, fractional rotation, z-order, and alignment remain unchanged.
- [ ] Confirm PowerPoint still shows no repair or compatibility warning.

## Evidence status

| Platform | Status | Evidence |
| --- | --- | --- |
| Windows PowerPoint | Passed 2026-08-29 | PowerPoint 16.0.20326.20100 opened/rendered all four slides; controlled text, table, image, and notes edits persisted after save/reopen. See `artifacts/gate-1/validation/windows-powerpoint-acceptance.json`. |
| macOS PowerPoint | Deferred by product owner on 2026-08-29 | Not tested because no macOS device is available. Compatibility remains an unverified residual risk, not a failure. Retain this checklist for future validation. |

Gate 1 was **accepted with an explicit product-owner platform-testing exception**. Windows PowerPoint passed. macOS PowerPoint was not tested and must not be described as passing. Future macOS validation remains recommended; automated rendering, LibreOffice, or another renderer is not a substitute for that future check.
