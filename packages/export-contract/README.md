# Gate 1 exporter contract

Status: **frozen for Gate 1** on 2026-08-29.

The contract is deliberately library-independent. It describes a computed slide document in native PowerPoint points and contains no PptxGenJS, Open XML, Electron, React, or filesystem-library objects.

Gate 1 invariants:

- Canvas: exactly 720 × 540 points, or 9,144,000 × 6,858,000 EMU.
- Semantic order: `dental_frontal_comparison`, `ceph_profile_overlay`, `ceph_vertical`, `problem_goal_plan`.
- Elements are explicitly z-ordered.
- Text and tables are native editable content.
- Images always lock aspect ratio and expose crop/contain/cover plus translation, uniform scale, rotation, and opacity.
- Overflow is a structured result containing semantic slide ID, element ID, optional row and column, and a deterministic reason.
- One reference pixel at 1440 × 1080 equals 0.5 points or 6,350 EMU.

Changes to this contract during Gate 1 require a lead-agent review and a corresponding note in the Gate 1 report.
