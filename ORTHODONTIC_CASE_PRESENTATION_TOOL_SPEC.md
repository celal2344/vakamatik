# Orthodontic Case Presentation Builder — Presentation and Clinical Specification

Status: Canonical product specification  
Version: 0.2  
Date: 2026-08-29

## 1. Purpose

This document defines exactly what information the tool collects and how that information appears in the generated orthodontic case presentation. It covers the clinical fields, semantic image slots, canonical slide sequence, slide geometry, notes, and alignment behavior. Dolphin Imaging Excel import is a backlog alternative input method and is not required for the initial product.

The proposed product is a presentation-production tool, not a diagnostic system. It may calculate display values or assemble clinician-entered findings, but all diagnoses, interpretations, and treatment decisions must remain clinician-authored and clinician-approved.

This document intentionally does **not** define the repository layout, desktop framework, exporter library, gate order, subagent assignments, CI, or packaging. Those decisions belong to `ORTHODONTIC_CASE_BUILDER_IMPLEMENTATION_PLAN.md`. If the two documents conflict, this specification is authoritative for clinical content and slide behavior; the implementation plan is authoritative for engineering execution.

## 2. Source-deck findings

The original source analysis inspected four patient decks:

| File | Non-number speaker-note entries |
| --- | ---: |
| `ecrin akgün.pptx` | 17 |
| `eylül bozdoğan.pptx` | 19 |
| `İpek Bozdoğan.pptx` | 18 |
| `musab.pptx` | 17 |

The supplemental folder `resources/ceph measurements/` contains six screenshots of the Dolphin Imaging Measurements window. They show that the presentation's cephalometric tables are assembled from several analysis profiles: `ALTINBAS ORTO/ORTODONTI`, `AU ORTO`, `McNamara`, `Holdaway`, and `tvl`. No exported `.xls` example was available during this inspection, so the field mapping can be specified now but the physical workbook parser must be finalized against a real anonymized export.

All four presentations use:

- A 4:3 slide canvas of exactly 720 × 540 PowerPoint points, equivalent to 10 × 7.5 inches.
- One design and 11 layouts.
- A black clinical-presentation background.
- Gold/tan headings and labels, white body text, turquoise/blue bullets, and occasional cyan/orange measurement highlights.
- Repeated image and measurement layouts rather than a different design for each patient.
- Patient-specific speaker notes but no PowerPoint comments.

The current planning pass additionally inspected the empty `VAKA TEMPLATE kopyası.pptx` and re-verified three of the patient decks. The verified structural facts are:

- Every inspected deck uses the exact same `9144000 × 6858000` EMU canvas (`10 × 7.5 in`, 4:3), one slide master, and 11 layouts.
- The three re-verified patient decks contain 35 slides.
- The empty template contains 34 slides and does not contain the final worksheet slide.
- Many slide and shape identities align across the empty template and patient decks, confirming that they belong to the same template family.
- The empty template still contains off-slide/scaffolding content, especially around slides 21–24, and is therefore a layout reference rather than a production-ready template.

Across the patient files, the recurring structure defines one canonical 35-slide sequence. This specification treats that sequence as the canonical content model. Optional slides are omitted when unused, so their exported numbers may change; semantic slide IDs remain stable.

## 3. Important interpretation of the existing files

The decks mix four kinds of content:

1. **Reusable template content:** colors, headings, institution logo, reference ranges, growth-stage chart, table styling, and fixed captions.
2. **Patient assets:** photographs, radiographs, model renders, video/poster frame, TMJ form, and a calculator/worksheet screenshot.
3. **Structured patient data:** demographics, dates, clinical findings, measurements, diagnoses, problem list, goals, plan, and case decision.
4. **Authoring scaffolding:** off-slide or covered labels such as `19 → yükseklik`, `4:3 portre`, `KAPALI KARŞIDAN`, and copy/paste reminders. These help explain how the deck was built but must not appear in the exported presentation.

The generated deck must contain categories 1–3 only. Category 4 should become internal template metadata or validation rules.

## 4. Canonical asset manifest

The local-file assignment interface should use named slots. Users should not have to understand slide numbers.

### 4.1 Extraoral photography

| Asset key | User-facing name | Reused on slides |
| --- | --- | --- |
| `face_front_rest` | Frontal face — at rest | 2, 4, 9, 30, 31 |
| `face_front_smile` | Frontal face — smiling | 3, 30, 31 |
| `face_profile_rest` | Right profile — at rest | 4, 5, 7 crop, 22 overlay, 30, 31 |
| `face_profile_smile` | Right profile — smiling | 5, 7 crop, 30, 31 |
| `face_three_quarter_rest` | Right 45°/three-quarter — at rest | 6 |
| `face_three_quarter_smile` | Right 45°/three-quarter — smiling | 6 |
| `retractor_front_1` | Frontal retractor take 1 | 8 |
| `retractor_front_2` | Frontal retractor take 2 | 8 |

Slide 7 does not need four additional source files. Its close-ups are crops of the frontal/profile rest and smile photographs. The tool should generate these crops and allow independent crop adjustment without changing the source asset.

### 4.2 Intraoral photography

| Asset key | User-facing name | Reused on slides |
| --- | --- | --- |
| `intraoral_front` | Frontal occlusion | 9, 14, 16 variant, 30 |
| `intraoral_right` | Right buccal | 10, 14, 16 variant, 30 |
| `intraoral_left` | Left buccal | 11, 14, 16 variant, 30 |
| `intraoral_upper_occlusal` | Maxillary occlusal | 12, 14, 30 |
| `intraoral_lower_occlusal` | Mandibular occlusal | 12, 14, 30 |

### 4.3 Digital study-model renders

| Asset key | User-facing name | Reused on slides |
| --- | --- | --- |
| `model_front` | Model — frontal occlusion | 9, 15, 16 variant, 31 |
| `model_right` | Model — right buccal | 10, 15, 16 variant, 31 |
| `model_left` | Model — left buccal | 11, 15, 16 variant, 31 |
| `model_upper_occlusal` | Model — maxillary occlusal | 13, 15, 31 |
| `model_lower_occlusal` | Model — mandibular occlusal | 13, 15, 31 |

Slide 16 uses six additional “from below” views: right/front/left intraoral photographs and matching right/front/left model renders. This should be an optional asset group named `inferior_comparison`.

### 4.4 Imaging and other records

| Asset key | User-facing name | Required? | Reused on slides |
| --- | --- | --- | --- |
| `cervical_image` | Cervical vertebra image | Usually | 17 |
| `patient_video` | Patient video or poster frame | Optional | 18 |
| `panoramic_xray` | Panoramic radiograph | Usually | 19, 20, 21 crops |
| `tmj_questionnaire` | TMJ questionnaire/form image | Optional | 21 |
| `lateral_ceph` | Lateral cephalogram | Usually | 22, 23, 25–28 |
| `traced_ceph` | Cephalogram with tracing | Usually | 24 |
| `space_analysis_worksheet` | Hayes Nance/Bolton worksheet image | Optional if tool renders it | 35 |

The panoramic radiograph is assigned once and reused. Slide 21 takes left and right TMJ crops from the same image.

The existing slide 24 stores its cephalogram and tracing as one precomposited raster image. A better tool may accept a raw ceph plus a separate transparent tracing layer, but that would be a new capability and must use the alignment editor.

### 4.5 Local photo-intake and assignment screen

The product should use the language **Add local files** or **Choose records folder**, not **Upload**, because the initial product has no cloud storage. The user is assigning local records to semantic presentation slots.

#### 4.5.1 Approved design choice: Record Board

The **Record Board** from prototype Variant B is the approved primary photo-assignment screen. It is the default view when the user opens the Records section.

Its production layout should contain:

- A dense board of named asset cards grouped into Extraoral, Intraoral, Study Models, Inferior Comparison, and Imaging/Other.
- Filter pills for showing all records or one group at a time.
- Per-group and overall required-record completion counts.
- A persistent slide-preview panel beside the board. Selecting a card updates this preview without leaving the page.
- Direct drag-and-drop and click-to-choose behavior on every card.
- The expected-orientation diagram while empty and the assigned local thumbnail afterward.
- Required/optional status, filename, and slide-reuse badges on each card.
- A **Jump to next missing** action for fast completion.

The other prototype concepts become supporting interactions rather than alternative main screens:

1. **Folder intake** opens from **Add folder**. It indexes selected local media, proposes destinations, and returns confirmed assignments to the Record Board. Suggestions are never silently committed.
2. **Guided slot details** open when a user requests help or expands a card. They show the larger demonstration diagram, framing tips, metadata, all slide uses, and replacement controls.

The folder intake is an accelerator, not a prerequisite. A user must be able to complete the entire Record Board by assigning images individually.

#### 4.5.2 Slot-card requirements

Every asset slot must show:

- A clear clinical name, such as **Right profile — at rest** or **Mandibular occlusal**.
- A neutral diagram showing expected orientation and approximate framing. Use vector silhouettes and mouth/arch/radiograph outlines rather than real patient examples.
- Required, usually required, or optional status.
- The slide numbers or semantic slide names that reuse the record.
- An empty, assigned, warning, or missing state.
- The assigned filename and a thumbnail after selection.
- Actions for choose, replace, remove, move/swap assignment, open in the OS file browser, and inspect metadata.
- Drag-and-drop as the primary shortcut, with an ordinary file-picker button and keyboard-accessible equivalent.

Dropping one file on a slot assigns that file to the semantic asset key. Dropping multiple files or a folder opens the mapping review rather than guessing silently. Moving a thumbnail from one slot to another changes the assignment; it must not duplicate or modify the source file.

#### 4.5.3 Mapping assistance

Initial automatic suggestions should be deterministic and local:

- Filename and folder-name aliases in Turkish and English, such as `front`, `frontal`, `ön`, `smile`, `profil`, `right`, `sağ`, `upper`, `üst`, `pano`, and `ceph`.
- Media type and extension.
- Portrait, landscape, square, and panoramic aspect-ratio hints.
- Optional image-dimension and EXIF-orientation checks.

Show a confidence indicator and the proposed target, but require explicit acceptance. Low-confidence and duplicate candidates remain unassigned. Do not send patient images to an external classification service. A later local-only classifier may be evaluated, but filename/aspect-ratio matching plus clinician confirmation is sufficient for the first version.

#### 4.5.4 Preview behavior

The tool must provide two related previews:

- **Record preview:** the selected source image with filename, dimensions, orientation, and warnings.
- **Slide preview:** the actual 4:3 slide layout with the selected image placed into its target slot using the same crop/transform calculations as PowerPoint export.

The slot shows its primary slide first and allows cycling through every slide instance that reuses the asset. A change to the shared crop/transform updates all linked instances; a deliberate per-slide override remains visibly marked. The preview uses a local object URL or application protocol and must never require network transfer.

#### 4.5.5 Recommended local storage model

Use a **managed local case folder** rather than relying only on the original source paths:

```text
Case Folder/
  case.json
  assets/
    <content-hash>.<extension>
  previews/
  exports/
```

When a record is assigned, copy the original byte-for-byte into `assets/`, calculate a content hash, and store the semantic slot mapping in `case.json`. Keep the source path as provenance, but generate the presentation from the managed copy. This is local file copying, not cloud uploading.

This model is recommended because reference-only paths break when a file is renamed, moved, disconnected from a network drive, or opened on another workstation. The app must never move, rename, overwrite, or delete the clinician's original file. Duplicate hashes may reuse one managed asset. Image crops, rotations, and alignment values are stored as metadata and never baked into the original.

An optional reference-only mode may be offered later for clinics that prohibit local duplication. It requires a **Relink missing files** workflow and cannot provide the same portability guarantees.

Suggested asset-manifest shape:

```json
{
  "face_profile_rest": {
    "assetId": "sha256:...",
    "originalName": "profile-right-rest.jpg",
    "sourcePath": "...",
    "managedRelativePath": "assets/abc123.jpg",
    "mimeType": "image/jpeg",
    "width": 3024,
    "height": 4032,
    "orientationNormalized": true,
    "assignedBy": "manual_drag_drop",
    "instances": ["extraoral.profilePair", "ceph.overlay", "summary.photos"]
  }
}
```

## 5. Structured data model

Every structured field in this section must have a normal manual-entry control. File import is an optional way to prefill those same controls; it must never be the only way to create or complete a case. Imported values remain editable, and a manual edit must retain the original imported value and its provenance in the audit history.

### 5.1 Patient and case information

The first screen should collect:

- Patient name.
- Date of birth.
- Patient assignment date.
- Records date.
- Case-presentation date.
- Treatment start date, optional.
- Treating doctor.
- Referring doctor, optional.
- Chief complaint.
- Medical/dental history (`Anamnez`), optional long text.

Age should be calculated from date of birth and case-presentation date, but remain overrideable for legacy cases.

### 5.2 Extraoral findings

- Facial symmetry: symmetric, asymmetric, or custom text.
- Free-text facial-asymmetry note.
- Smile line: low, normal, high, or custom text.
- Upper-incisor display at rest: reduced, adequate, increased, plus optional measurement/note.
- Soft-tissue profile: concave, straight, convex, or custom text.
- Optional three-quarter/S-curve note.
- Cervical maturation stage.

These values appear as concise visible findings. Longer observations belong in speaker notes.

### 5.3 Dental and occlusal findings

- Upper dental midline (`ÜOH`): centered, tooth-relative description, or offset in millimetres with left/right direction.
- Lower dental midline (`AOH`): same structure.
- Overjet in millimetres.
- Overbite in millimetres.
- Right molar relationship: Class I, II, III, not assessable, or custom.
- Right canine relationship: Class I, II, III, not assessable, or custom.
- Left molar relationship: Class I, II, III, not assessable, or custom.
- Left canine relationship: Class I, II, III, not assessable, or custom.
- Missing/supernumerary teeth finding.
- Caries, restorations, crowns, endodontic treatment, and other radiographic findings.
- Condylar/TMJ finding.
- Andrews Element III maxillary constriction in millimetres.

Every repeated occurrence must bind to the same field. The source decks contain a real example where one canine classification differs between slides 14 and 15; a single source of truth must make this impossible.

### 5.4 Hayes Nance space analysis

The visible 4 × 2 table has an unlabeled visual structure. The interface must use explicit labels:

- Upper arch total discrepancy.
- Upper right discrepancy.
- Upper left discrepancy.
- Lower right discrepancy.
- Lower left discrepancy.
- Lower arch total discrepancy.

Store sign and magnitude separately or as a signed number. In the decks, negative means space deficiency and positive means excess space. Rendering should consistently display `(−)` or `(+)` plus the value.

Optional advanced input can accept raw tooth widths and available arch lengths and calculate the discrepancies. If that calculator is implemented, the clinician must be able to override and approve the final displayed values.

### 5.5 Bolton analysis

For each analysis, collect status, affected arch, and discrepancy:

- Anterior/6-tooth result: calculable or not calculable; upper or lower excess; millimetres.
- Overall/12-tooth result: calculable or not calculable; upper or lower excess; millimetres.

Optional advanced input may collect maxillary and mandibular widths for teeth 6–1 and 1–6, calculate the anterior and overall ratios, and generate the worksheet shown near the end of the source decks.

### 5.6 Cephalometric measurements

The normal/reference column is template configuration, not patient input. The patient measurement column is `T0`.

The current decks use the following fixed reference values. Preserve them in a versioned clinic-template configuration, not application code, because the orthodontists may revise them:

| Group | Measurement | Source-deck reference |
| --- | --- | --- |
| Vertical | SN–GoGn | 32 ± 5° |
| Vertical | Saddle angle | 123 ± 5° |
| Vertical | Articular angle | 143 ± 6° |
| Vertical | Gonial angle | 130 ± 7° |
| Vertical | Sum of inner angles | 396 ± 3° |
| Vertical | Jarabak (SGo/NGn) | 59–63% |
| Vertical | ANS–Me / N–Me | 55 ± 0.1% |
| Vertical | Maxillary height angle | 60 ± 3° |
| Vertical | Facial axis angle | 90 ± 3.5° |
| Vertical | S–Ar / Ar–Go | 75 ± 10% |
| Vertical | Gonial ratio | 75%; components shown as 54.5 / 70.6 |
| Vertical | FMA | 25 ± 4.5° |
| Vertical | Y-axis angle | 59.4 ± 5.5° |
| Vertical | Occlusal plane / SN | 14.4 ± 2.5° |
| Vertical | Occlusal plane / mandibular plane | 17.6 ± 5° |
| Vertical | Palatal plane / SN | 7 ± 5° |
| Vertical | Palatal plane / mandibular plane | 26° |
| Sagittal | SNA | 82 ± 2° |
| Sagittal | SNB | 80 ± 2° |
| Sagittal | ANB | 2 ± 2° |
| Sagittal | Wits | −1 ± 2 mm |
| Sagittal | Anterior cranial base | 73 ± 3 mm |
| Sagittal | Mandibular body length | 80 ± 4.4 mm |
| Sagittal | Anterior base / mandibular body | `x / x+7` |
| Sagittal | Posterior cranial base | 37 ± 4.4 mm |
| Sagittal | A–N perpendicular | 1 ± 2 mm |
| Sagittal | Pog–N perpendicular | −2 ± 4 mm |
| Sagittal | Maxillary depth | 90 ± 3° |
| Sagittal | Co–A | 91 ± 4.3 |
| Sagittal | Co–Gn | 120 ± 5.3 |
| Upper incisors | U1–SN | 103 ± 5.5° |
| Upper incisors | U1–FH | 112 ± 6° |
| Upper incisors | U1–palatal plane | 115 ± 6° |
| Upper incisors | U1–NA angle | 22 ± 5.7° |
| Upper incisors | U1–NA distance | 4 ± 2.7 mm |
| Lower incisors | IMPA | 90 ± 7° |
| Lower incisors | L1–NB angle | 25 ± 6° |
| Lower incisors | L1–NB distance | 4 ± 1.8 mm |
| Lower incisors | Pog–NB | 4 ± 1.7 mm |
| Lower incisors | Holdaway ratio | 1 / 1 |
| Lower incisors | Interincisal angle | 131 ± 6° |
| Soft tissue | Nasolabial angle | 102 ± 8° |
| Soft tissue | Holdaway angle | 8 ± 4° |
| Soft tissue | Upper lip to E-line | −4 ± 2 mm |
| Soft tissue | Lower lip to E-line | −2 ± 2 mm |
| Soft tissue | Profile angle | 161 ± 5° |
| Soft tissue | Convexity | 131 ± 4° |
| Soft tissue | Soft pogonion to Sn vertical | −3 ± 1 mm |
| Soft tissue | Upper-lip anterior point to Sn vertical | 3 ± 1 mm |
| Soft tissue | Lower-lip anterior point to Sn vertical | 1 ± 1 mm |
| Soft tissue | Holdaway superior-sulcus depth | Male 1.6 ± 1.8; female 3.3 ± 3.2 |

These are transcription results from the source deck tables, not independently validated clinical standards. The clinic must confirm them before the application uses them.

#### Vertical table

- SN–GoGn.
- Saddle angle.
- Articular angle.
- Gonial angle.
- Sum of inner angles.
- Jarabak ratio (SGo/NGn).
- ANS–Me / N–Me ratio.
- Maxillary height angle.
- Facial axis angle.
- S–Ar / Ar–Go (ramus) ratio.
- Gonial ratio, including component values when used.
- FMA.
- Y-axis angle.
- Occlusal plane / SN.
- Occlusal plane / mandibular plane.
- Palatal plane / SN.
- Palatal plane / mandibular plane.

#### Sagittal table

- SNA.
- SNB.
- ANB.
- Wits appraisal.
- Anterior cranial-base length.
- Mandibular body length.
- Anterior cranial base / mandibular body derived value.
- Posterior cranial-base length.
- A–N perpendicular.
- Pog–N perpendicular.
- Maxillary depth.
- Co–A.
- Co–Gn.

#### Upper-incisor table

- U1–SN angle.
- U1–FH angle.
- U1–palatal-plane angle.
- U1–NA angle.
- U1–NA millimetres.

#### Lower-incisor table

- IMPA.
- L1–NB angle.
- L1–NB millimetres.
- Pog–NB millimetres.
- Holdaway ratio.
- Interincisal angle.

#### Soft-tissue table

- Nasolabial angle.
- Holdaway angle.
- Upper lip to E-line.
- Lower lip to E-line.
- Soft-tissue profile angle.
- Soft-tissue convexity.
- Soft pogonion to Sn vertical.
- Upper-lip anterior point to Sn vertical.
- Lower-lip anterior point to Sn vertical.
- Holdaway superior-sulcus depth.

Each input must carry its unit (`°`, `mm`, `%`, or ratio). The interface should show the unit beside the field and store a numeric value without forcing the clinician to type unit characters.

### 5.7 Manual measurement entry and backlog Dolphin Excel import

#### 5.7.1 Manual-first behavior

The complete vertical, sagittal, upper-incisor, lower-incisor, and soft-tissue field sets in §5.6 must always be available for manual entry. The cephalometric screen should provide:

- A field for every canonical measurement, grouped exactly like slides 25–28.
- Numeric entry without typed unit characters; the unit is displayed beside the control.
- Explicit blank/not-measured and not-applicable states where appropriate.
- Validation for numeric format and expected unit, but no diagnosis based solely on data entry.
- A source badge on each value: `Manual`, `Dolphin import`, or `Manual override of Dolphin import`.
- The ability to edit or clear any imported value before or after slide generation.
- A reset action that restores the original imported value for a manually overridden field.

Manual entry and Excel import must write to the same canonical measurement keys. The PPTX generator must not care which entry path supplied a confirmed value.

#### 5.7.2 Observed Dolphin analysis profiles

The screenshots show the following source split:

| Dolphin analysis | Presentation data supplied |
| --- | --- |
| `ALTINBAS ORTO`, `ALTINBAS ORTODONTI`, or `AU ORTO` | Most vertical, sagittal, incisor, and basic soft-tissue values. Treat these names as configured aliases, not three separate schemas. |
| `McNamara` | A–N perpendicular, Pog–N perpendicular, Co–A, and Co–Gn. |
| `Holdaway` | Superior sulcus depth. Other visible Holdaway rows are not used by the current slides. |
| `tvl` | Upper lip, lower lip, and soft-tissue pogonion relative to a vertical reference. The exact landmark terminology requires confirmation. |

An import may therefore require several workbooks if Dolphin exports only the currently selected analysis. The UI must accept multiple files for the same case and merge them into one review session.

#### 5.7.3 Canonical Dolphin-to-slide mapping

Vertical values for slide 25:

| Dolphin measurement label | Canonical field | Mapping status |
| --- | --- | --- |
| `SN - GoGn` | SN–GoGn | Direct |
| `Saddle/Sella Angle (SN-Ar)` | Saddle angle | Direct |
| `Articular Angle` | Articular angle | Direct |
| `Gonial angle` | Gonial angle | Direct |
| `Sum of Angles (Jarabak)` | Sum of inner angles | Direct |
| `Jarabak Percentage` or `SGo/NGn` | Jarabak ratio | Candidate; select the exact source row after XLS and clinician confirmation. |
| `ANS-Me/Na-Me` | ANS–Me/N–Me | Direct |
| `Maxillary Height (N-CF-A)` | Maxillary height angle | Direct |
| `Facial Axis-Ricketts (NaBa-PtGn)` | Facial axis angle | Direct |
| `S-Ar/Ar-Go` | S–Ar/Ar–Go ratio | Direct |
| `Upper Gonial Angle` | Gonial-ratio upper component | Direct |
| `Lower Gonial Angle` | Gonial-ratio lower component | Direct |
| `Upper/Lower Gonial Ratio` | Gonial ratio | Direct |
| `FMA (MP-FH)` | FMA | Direct |
| `Y-Axis (SGn-SN)` | Y-axis angle | Direct |
| `Occ Plane to SN` | Occlusal plane/SN | Direct |
| `Occl Pl-GoGn` | Occlusal plane/mandibular plane | Direct |
| `Cranio-Mx Base/SN-Palatal Plane` | Palatal plane/SN | Direct |
| `ANS/PNS - GoGn` | Palatal plane/mandibular plane | Direct |

Sagittal values for slide 26:

| Dolphin analysis and measurement label | Canonical field | Mapping status |
| --- | --- | --- |
| Core analysis: `SNA` | SNA | Direct |
| Core analysis: `SNB` | SNB | Direct |
| Core analysis: `ANB` | ANB | Direct |
| Core analysis: `Wits Appraisal` | Wits | Direct |
| Core analysis: `Anterior Cranial Base (SN)` | Anterior cranial-base length | Direct |
| Core analysis: `Mandibular Body Length (Go-Gn)` | Mandibular body length | Direct |
| Core analysis: `SN/GoMe` | Anterior-base/mandibular-body field | Candidate; confirm against the slide's `x / x+7` label. |
| Core analysis: `Posterior Cranial Base (S-Ar)` | Posterior cranial-base length | Direct |
| `McNamara`: `Maxillary Skeletal (A-Na Perp)` | A–N perpendicular | Direct |
| `McNamara`: `Mand. Skeletal (Pg-Na Perp)` | Pog–N perpendicular | Direct |
| Core analysis: `Maxillary Depth (FH-NA)` | Maxillary depth | Direct |
| `McNamara`: `Midface Length (Co-A)` | Co–A | Direct |
| `McNamara`: `Mandibular Length (Co-Gn)` | Co–Gn | Direct |

Incisor values for slide 27:

| Dolphin measurement label | Canonical field |
| --- | --- |
| `U1 - SN` | U1–SN angle |
| `U1 - FH` | U1–FH angle |
| `U1 - Palatal Plane` | U1–palatal-plane angle |
| `U1 - NA (°)` | U1–NA angle |
| `U1 - NA (mm)` | U1–NA distance |
| `IMPA` | IMPA |
| `L1 - NB (°)` | L1–NB angle |
| `L1 - NB (mm)` | L1–NB distance |
| `Pog - NB (mm)` | Pog–NB distance |
| `Holdaway Ratio` | Holdaway ratio |
| `Interincisal Angle (U1-L1)` | Interincisal angle |

Soft-tissue values for slide 28:

| Dolphin analysis and measurement label | Canonical field | Mapping status |
| --- | --- | --- |
| Core analysis: `Nasolabial Angle` | Nasolabial angle | Direct |
| Core analysis: `Holdaway Angle (NB to H-line)` | Holdaway angle | Direct |
| Core analysis: `Upper Lip to E-Plane` | Upper lip to E-line | Direct |
| Core analysis: `Lower Lip to E-Plane` | Lower lip to E-line | Direct |
| `AU ORTO`: `Soft Tissue Profile` | Soft-tissue profile angle | Direct |
| Core analysis: `Soft Tissue Convexity` | Soft-tissue convexity | Direct |
| `tvl`: `STissue N Vert (True Vert) to ST Pogonion` | Soft pogonion to Sn vertical | Candidate; Dolphin says `N Vert`, while the slide says `Sn vertical`. |
| `tvl`: `STissue N Vert (True Vert) to Upper Lip` | Upper-lip anterior point to Sn vertical | Candidate for the same terminology reason. |
| `tvl`: `STissue N Vert (True Vert) to Lower Lip` | Lower-lip anterior point to Sn vertical | Candidate for the same terminology reason. |
| `Holdaway`: `Superior Sulcus Depth` | Holdaway superior-sulcus depth | Direct |

Visible Dolphin measurements not consumed by the current slides include standalone anterior/posterior face height, ramus height, `S-L`, `S-E`, McNamara LAFH and Mx/Md difference, `U1 Most Labial`, `L1 Protrusion`, lower lip to H-line, lip/chin thicknesses, and nasal prominence. Preserve unknown and unused rows in import metadata, but do not create additional slide fields automatically.

#### 5.7.4 Excel ingestion and review

The importer must:

1. Accept one or more `.xls` files for a case. Support for `.xlsx` may be included, but `.xls` is required.
2. Detect the actual file container from its signature instead of trusting the extension. Older applications may produce BIFF/OLE, SpreadsheetML, or HTML-table content with an `.xls` extension.
3. Parse spreadsheet content as inert data. Never execute macros, external links, formulas, or embedded objects.
4. Extract patient identifier, date of birth when available, timepoint, image name, analysis profile, original measurement label, value, unit, normal value, standard deviation, and deviation-from-normal.
5. Match rows by configured analysis-profile alias, normalized measurement label, and unit. Never map by row number because custom Dolphin analyses can change row order.
6. Normalize case, whitespace, Unicode dashes, decimal comma/point, percent signs, and degree symbols for comparison while retaining the exact source text.
7. Import only Dolphin's patient `Value` into the canonical T0 field by default. Store `Norm`, `Std Dev`, and `Dev Norm` as source metadata; they must not silently overwrite the clinic-template reference column.
8. Detect duplicate mappings. Identical duplicates may be merged with both sources recorded; different values for one canonical field must be presented as a conflict requiring clinician selection.
9. Flag patient/timepoint mismatches, unknown analyses, unknown measurements, unit conflicts, malformed numbers, missing required fields, and candidate mappings.
10. Present a review grid with `Mapped`, `Missing`, `Unrecognized`, `Conflict`, and `Needs confirmation` states before applying values.
11. Apply confirmed imported values to the same editable controls used for manual entry.
12. Retain file hash, import timestamp, original row data, selected mapping, imported value, later manual override, and confirming user in the audit record.

Screenshot OCR is not an import method. The screenshots document the workflow and labels; production data ingestion must use the exported workbook or manual entry.

The Dolphin parser is not an initial implementation dependency. Manual entry must support the complete workflow without any workbook. When the backlog importer is implemented, first inspect at least one anonymized Dolphin `.xls` export and build it behind a format-adapter interface so the workbook decoder can be finalized without changing canonical measurement keys or the UI.

### 5.8 Clinician interpretations

The slides display human-readable interpretations below or after the measurement tables. Collect or derive drafts for:

- Growth pattern: low, normal, or high angle.
- Skeletal class and optional maxillary/mandibular positional qualifier.
- Upper-incisor inclination and position.
- Lower-incisor inclination and position.
- Soft-tissue profile.
- Cervical stage.

The tool may propose text from thresholds configured by the clinic, but the clinician must explicitly approve it. Never silently turn entered measurements into a diagnosis.

### 5.9 Diagnosis, problem list, goals, plan, and decision

- Analysis-summary sections: skeletal and dental.
- Five logical problem-list rows.
- For each row: problem, treatment goal, and treatment plan.
- Case-decision title/owner suffix and one or more bullet points.
- Optional ICON Index rows and total.

The problem table is physically a 7 × 5 PowerPoint table because of merged/duplicated cells, but logically it is four columns: row number, problem, treatment goal, and treatment plan.

The ICON slides encode five weighted rows using weights 7, 5, 5, 4, and 3, but most source decks do not name the five components. The implementation should not invent or hard-code component labels until an orthodontist confirms them. Store configurable labels, raw scores, weights, weighted results, and total.

## 6. Canonical 35-slide blueprint

### Geometry notation

Coordinates use the native 720 × 540-point slide. `L/T/W/H` means left, top, width, and height in points. Values are from the most complete 35-slide template and may differ by a few points between decks.

At a 1440 × 1080 reference render, one PowerPoint point equals two pixels. A one-reference-pixel nudge therefore equals 0.5 points or 6,350 EMU.

### 6.1 Patient and extraoral section

| Slide | Purpose and content | Canonical placement | Required controls |
| ---: | --- | --- | --- |
| 1 | Patient/case metadata and institution logo. | Main text area approximately `25/26/670/488`; logo at upper right. | Structured fields from §5.1. Auto-calculate age. Long anamnesis goes to notes unless it fits. |
| 2 | Frontal face at rest plus facial-symmetry finding. | Photo `0/0/405/540`; finding on right. | `face_front_rest`; symmetry dropdown/custom text; note. |
| 3 | Frontal smiling face plus smile-line finding. | Photo `0/0/405/540`; finding on right. | `face_front_smile`; smile-line finding; note. |
| 4 | Frontal and profile at rest. | Two near-halves, about `1/0/364/486` and `363/0/364/486`; caption at bottom. | Reuse `face_front_rest` and `face_profile_rest`; independent crop/position. |
| 5 | Profile at rest and smiling; soft-tissue-profile finding. | Two near-halves, about `−6/−2/368/491` and `363/−2/367/491`. | Reuse profile rest/smile; profile finding; note. |
| 6 | 45° rest and smiling comparison. | Two near-halves, each about `373 × 497`. | Two three-quarter photos; note. |
| 7 | “Diş ve Dudak İlişkileri”: frontal rest/smile and profile rest/smile crops. | Four 360 × 203 quadrants below a 37-point header; top row starts at `T≈79`, bottom at `T≈281`. | Derive four crops from existing extraoral photos; separate crop adjustment per tile. |
| 8 | Two frontal retractor views. | Left/right halves about `360 × 482`. | Two retractor takes; independent crop/position. |

The dimension labels and shot names found behind or outside the images on slides 2–7 are authoring guides. They should become slot metadata and must not render.

### 6.2 Dental photographs, study models, and space analysis

| Slide | Purpose and content | Canonical placement | Required controls |
| ---: | --- | --- | --- |
| 9 | Frontal intraoral photo over frontal model, with frontal face at right; upper/lower midlines, overjet, and overbite. | Intraoral `0/0/442/249`; model `0/249/442/249`; face `442/75/279/373`. | Three linked assets; midline fields; OJ/OB. Add vertical midline guides as vector lines. |
| 10 | Right buccal photo over right model; right/left molar and canine classifications shown at right. | Photo `0/0/471/265`; model `0/265/469/263`. | Right photo/model pair; all four relationship fields from one source. |
| 11 | Left buccal photo over left model; classifications shown at left. | Photo about `247/2/472/265`; model about `247/267/510/286`. | Left photo/model pair; same relationship fields. |
| 12 | Upper and lower occlusal photographs with Hayes Nance and Bolton results. | Photos on left: `0/2/360/270` and `0/270/360/270`; HN table `445/77/200/137`; Bolton text at lower right. | Upper/lower photos; six HN fields; two Bolton outcomes. |
| 13 | Upper and lower occlusal model renders with the same HN/Bolton results. | Models on left using the same 360 × 270 stack; results at right. | Model pair; bind to the exact same analysis fields as slide 12. |
| 14 | Five-view intraoral montage surrounded by all occlusal measurements. | Top/bottom occlusals about 250 × 187; middle left/front/right about 250 × 140. | Reuse the five intraoral assets; display midlines, OJ/OB, classes, HN, and Bolton. |
| 15 | Five-view model montage surrounded by the same measurements. | Same cross-shaped composition as slide 14. | Reuse five model assets; bind to the same fields as slides 9–14. |
| 16 | Optional “teeth from below” photo/model comparison. | Three photos across the top and three matching model renders below, each about 246 × 138; lower half of slide remains black. | Optional six-asset group; pairwise alignment controls. Hide slide when the group is absent. |

The source decks contain copy/paste notes for HN, Bolton, and class relationships. The tool must eliminate copy/paste by data binding.

### 6.3 Growth, panoramic, TMJ, and cephalometric imaging

| Slide | Purpose and content | Canonical placement | Required controls |
| ---: | --- | --- | --- |
| 17 | Cervical maturation. Cervical image at left, fixed reference chart at right, stage caption below. | Cervical image `43/68/258/362`; chart `338/106/301/278`. | Cervical image; stage; optional note. Chart is template content. |
| 18 | Patient video/poster frame. | Centered poster frame about `218/174/272/142`. | Local video or still image; poster-frame selection. Hide slide if clinic does not use it. |
| 19 | Panoramic radiograph with date and missing/supernumerary finding. | Radiograph approximately `0/73/720/396`. | Pano; record date; missing/supernumerary free text. |
| 20 | Same panoramic radiograph with caries/restoration finding. | Same source, slightly different crop, approximately `0/72/719/369`. | Reuse pano; dental-treatment/finding text. |
| 21 | TMJ section: left/right condylar crops and questionnaire image. | Condyle crops near `19/104/118/175` and `149/104/118/175`; form about `226/306/500/238`. | Auto-crop pano with per-side adjustment; TMJ finding; local form file or structured-form renderer. |
| 22 | Natural-head-position overlay of profile photograph and lateral ceph. | Ceph about `144/48/461/432`, rotated roughly −4.3° in one source; profile about `100/4/468/468`. | Two-layer precision alignment, opacity, scale, rotation, translation, and layer switching. |
| 23 | Lateral ceph alone using the aligned transform. | Same ceph transform as slide 22. | Reuse the exact ceph transform; allow linked override only when explicitly detached. |
| 24 | Ceph with tracing. | About `131/64/486/429`. | Existing decks use one raster. New workflow may use raw ceph plus transparent tracing with precision alignment. |

### 6.4 Measurements and diagnosis

| Slide | Purpose and content | Canonical placement | Required controls |
| ---: | --- | --- | --- |
| 25 | Vertical cephalometric table, ceph at left, growth-pattern interpretation below. | Ceph `3/118/334/303`; table about `341/11/365/489`. | Vertical fields; fixed normal column; T0 patient measurements; approved interpretation. |
| 26 | Sagittal table and skeletal interpretation. | Same ceph; table about `331/49/379/405`. | Sagittal fields and approved skeletal interpretation. |
| 27 | Upper- and lower-incisor tables plus interpretation. | Same ceph; upper table about `358/68/334/166`; lower `358/236/334/191`. | Incisor fields and approved interpretation. |
| 28 | Soft-tissue table and profile interpretation. | Same ceph; table about `349/83/352/373`. | Soft-tissue fields and approved interpretation. |
| 29 | Consolidated “Analiz Sonuçları” slide. | Full-slide text composition. | Assemble skeletal and dental sections from structured data, then require clinician review/edit/approval. |

All four measurement slides must reuse one ceph crop and transform. Moving the ceph on one should update all four unless the user deliberately unlinks a slide.

### 6.5 Summary, plan, and supplemental slides

| Slide | Purpose and content | Canonical placement | Required controls |
| ---: | --- | --- | --- |
| 30 | Diagnostic photo montage: four extraoral views above five intraoral views. | Four portrait tiles across the top; right/front/left intraoral middle row; upper/lower occlusal bottom row. | Reuse assets; montage-specific crop overrides. |
| 31 | Diagnostic model montage: same four extraoral views above five model views. | Same top portraits; right/front/left model middle row; upper/lower model bottom row. | Reuse model assets; montage-specific crop overrides. |
| 32 | Problem list, treatment goals, and treatment plan. | Table approximately `0/66/720/505`. | Up to five rows; logical columns: number, problem, goal, plan. Auto-grow text within limits and flag overflow. |
| 33 | Case decision. | Large title and bullet list on black background. | Decision owner/title suffix and one or more free-text bullets. |
| 34 | ICON Index. | Title and five weighted rows plus total. | Configurable component labels, scores, weights, and total. Hide if not used. |
| 35 | Hayes Nance/Bolton worksheet snapshot. | Large worksheet image, near full slide. | Prefer tool-rendered worksheet from raw measurements; otherwise accept a local image file. Hide if not used. |

## 7. Speaker notes

The source files contain 71 non-number note entries. They fall into three categories:

- Patient-specific clinical observations, such as facial asymmetry, incisor display, or smile-line comments.
- Generic interpretation references, such as cephalometric or growth-pattern reminders.
- Production reminders, such as “copy HN and Bolton” or “paste all.”

The tool should provide:

- One internal note field per slide.
- Optional template guidance shown in the app but not written into patient notes.
- A case-level note area.
- A setting to export clinician notes into the PowerPoint notes page.
- A clear distinction between visible slide text and private/internal notes.

Never automatically promote speaker notes into visible slide content. Production reminders should be removed from the clean template because data binding makes them unnecessary.

## 8. Precision alignment editor

### 8.1 Required transform model

Each placed image instance needs its own non-destructive state:

- Source asset ID.
- Slot ID and linked-instance group.
- X and Y translation.
- Width/height or uniform scale.
- Rotation.
- Crop rectangle.
- Opacity.
- Horizontal/vertical flip, disabled by default.
- Z-order.
- Lock-aspect-ratio state.
- Whether its transform is linked to other instances.

Store transforms in slide coordinates/EMU, not screen CSS pixels. The editor can expose reference-render pixels to the user.

### 8.2 Keyboard behavior

- Arrow key: move selected layer by exactly 1 reference pixel.
- Shift + Arrow: move by 10 reference pixels.
- Alt + Arrow: move by 0.1 reference pixel or the smallest supported subpixel step.
- `[` / `]`: rotate by −0.1° / +0.1°.
- Shift + `[` / `]`: rotate by −1° / +1°.
- Delete/Backspace should clear the slot only after confirmation, not delete the managed asset or clinician's original file.
- Undo/redo must cover every transform, crop, opacity, and link/unlink action.

The reference render should default to 1440 × 1080 so a 1-pixel nudge maps cleanly to 0.5 PowerPoint points. If a different reference resolution is selected, the conversion must remain deterministic.

### 8.3 Editor controls

- Zoom from fit-to-window through at least 800%.
- Pan without moving the selected image.
- Slot boundary, slide boundary, center lines, thirds, and optional grid.
- Toggleable rulers and crosshair.
- Numeric X/Y/scale/rotation/crop fields.
- Opacity slider and quick presets such as 25%, 50%, and 75%.
- Blink comparison between layers.
- Difference/blend mode for overlay alignment when technically feasible.
- Lock one layer while moving the other.
- Bring forward/send backward.
- Reset current property, reset current instance, and reset all linked instances.
- Copy/paste transform between corresponding slots.

### 8.4 Alignment-sensitive groups

| Group | Required behavior |
| --- | --- |
| Frontal intraoral ↔ frontal model | Match apparent dental width, midline, and vertical centering on slide 9. |
| Right/left intraoral ↔ corresponding model | Match scale and occlusal-plane orientation on slides 10 and 11. |
| Occlusal photo ↔ occlusal model | Keep arch orientation and size visually comparable on slides 12–15. |
| Inferior photo ↔ inferior model | Pairwise alignment for all three views on slide 16. |
| Pano ↔ TMJ crops | Crops remain linked to the pano while allowing left/right crop overrides. |
| Profile portrait ↔ lateral ceph | Full translation, scale, rotation, opacity, and layer controls on slide 22. |
| Ceph ↔ tracing | Two-layer alignment if the tool accepts a separate tracing; otherwise display the assigned composite. |
| Ceph across slides 23 and 25–28 | One shared base transform, propagated to every use. |
| Summary montages | Independent crop overrides without altering the detailed-slide crops. |

## 9. Suggested user workflow

1. **Create case:** choose or create the managed local case folder, then enter patient and case metadata.
2. **Add local records:** optionally choose the patient-records folder for suggested matching, or drag/select files directly into named photo, model, radiograph, and supplemental-record slots.
3. **Confirm record mappings:** review folder suggestions, thumbnails, required/missing states, duplicates, orientation warnings, and slide reuse. Move, swap, replace, or remove incorrect assignments.
4. **Preview image placement:** select any slot to view its source and first slide placement; cycle through reused slide instances when needed.
5. **Enter clinical findings:** extraoral, dental/occlusal, radiographic, and TMJ findings.
6. **Enter analyses:** complete Hayes Nance, Bolton, and every cephalometric T0 field manually.
7. **Review interpretations:** clinician edits and approves all narrative conclusions.
8. **Enter problem/goal/plan and decision:** structured rows plus free text.
9. **Generate preview:** create all enabled slides and list missing content or overflow as review errors.
10. **Alignment review:** show only slides with images, grouped by alignment-sensitive task. Start with shared transformations, then per-slide overrides.
11. **Final review:** slide navigator grouped into Patient, Extraoral, Dental, Imaging, Cephalometrics, and Plan. Missing content remains visible and must be acknowledged but does not block export.
12. **Export:** editable `.pptx` into the case's `exports/` folder.

When the Dolphin backlog is implemented, workbook selection and import review become an optional alternative inside step 6; they do not replace manual entry.

The interface should show completeness per section rather than forcing a long single form. A user must be able to return to any field by clicking the affected slide element.

## 10. Semantic slide identities and binding rules

Slide numbers are presentation order only. Internal data, notes, transforms, and navigation must use stable semantic IDs:

| Canonical position | Semantic slide ID | Purpose |
| ---: | --- | --- |
| 1 | `case_overview` | Patient and case metadata |
| 2 | `extraoral_front_rest` | Frontal face at rest |
| 3 | `extraoral_front_smile` | Frontal smiling face |
| 4 | `extraoral_front_profile_rest` | Frontal/profile rest comparison |
| 5 | `extraoral_profile_rest_smile` | Profile rest/smile comparison |
| 6 | `extraoral_three_quarter` | Three-quarter comparison |
| 7 | `lip_tooth_relationship` | Lip/tooth close-up crops |
| 8 | `extraoral_retractor_pair` | Retractor comparison |
| 9 | `dental_frontal_comparison` | Frontal photo/model/face comparison |
| 10 | `dental_right_comparison` | Right buccal photo/model comparison |
| 11 | `dental_left_comparison` | Left buccal photo/model comparison |
| 12 | `occlusal_photos_space_analysis` | Occlusal photos with HN/Bolton |
| 13 | `models_space_analysis` | Model occlusals with HN/Bolton |
| 14 | `intraoral_montage` | Five-view intraoral montage |
| 15 | `model_montage` | Five-view model montage |
| 16 | `inferior_comparison` | Optional inferior photo/model views |
| 17 | `cervical_maturation` | Cervical stage |
| 18 | `patient_video` | Optional video/poster frame |
| 19 | `panoramic_missing_teeth` | Panoramic image and tooth-presence findings |
| 20 | `panoramic_restorative_findings` | Panoramic restorative findings |
| 21 | `tmj_review` | Condylar crops and questionnaire image |
| 22 | `ceph_profile_overlay` | Profile/ceph overlay |
| 23 | `ceph_lateral` | Lateral ceph |
| 24 | `ceph_tracing` | Precomposited traced ceph in v1 |
| 25 | `ceph_vertical` | Vertical measurements |
| 26 | `ceph_sagittal` | Sagittal measurements |
| 27 | `ceph_incisor` | Incisor measurements |
| 28 | `ceph_soft_tissue` | Soft-tissue measurements |
| 29 | `analysis_summary` | Consolidated interpretation |
| 30 | `diagnostic_photo_montage` | Extraoral/intraoral summary |
| 31 | `diagnostic_model_montage` | Extraoral/model summary |
| 32 | `problem_goal_plan` | Problem, goal, and plan table |
| 33 | `case_decision` | Case decision |
| 34 | `icon_index` | Optional ICON index |
| 35 | `space_analysis_worksheet` | Optional HN/Bolton worksheet image |

Rules:

- A repeated finding or measurement binds to one canonical field everywhere it appears.
- Optional-slide omission changes only displayed slide numbers, never semantic IDs.
- Notes are keyed by semantic slide ID.
- Image instances use semantic slot IDs such as `dental.rightComparison.photo`, not positional keys such as `slide10.image1`.
- Shared crop/transform groups are explicit; a per-slide override is stored separately and visibly marked.

## 11. Presentation output rules

- Output is an editable `.pptx` with a 4:3, 720 × 540-point canvas.
- Photographs and radiographs may be raster images; titles, labels, findings, measurement tables, diagnoses, notes, and plan tables remain native editable PowerPoint content.
- Preview and export use the same calculated slide geometry and transforms.
- Repeated assets reuse the same managed source while retaining instance-specific placement and allowed crop overrides.
- Enabled optional slides appear in canonical semantic order. Disabled optional slides are omitted rather than exported blank.
- Clinician notes are written only when notes export is enabled.
- The deck must open without a PowerPoint repair warning and remain editable after save/reopen on both macOS and Windows PowerPoint.
- Export must not contain hidden guides, covered authoring labels, placeholder values, or production reminders.

The implementation plan decides which exporter technology satisfies these rules.

## 12. Source-template issues the new tool must correct

- The empty template contains 34 slides, while the patient decks contain the canonical slide 35 worksheet.
- The empty template retains off-slide/scaffolding objects on slides 21–24.
- Off-slide measurement and shot-type guides are present throughout patient decks.
- Several shot labels are behind images rather than removed.
- A stray/default `5.2 mm` value remains in the overjet text shape on slide 9 even when a different visible value is used.
- Repeated values are manually copied and can diverge; at least one source deck has a different canine classification between photo and model composite slides.
- Terminology, capitalization, degree symbols, spaces, decimal separators, and `mm` formatting are inconsistent.
- Cephalometric values are assembled manually from several Dolphin analysis profiles, creating transcription and source-selection risk.
- Some optional pages are blank or partially completed but are not marked hidden.
- Several ICON pages contain placeholder text rather than a completed index.
- The existing traced ceph is rasterized, so v1 treats it as one precomposited image.
- Some slides contain tiny ink/picture artifacts outside the meaningful layout.

The product must format structured values consistently and prevent hidden scaffold content from entering an export.

## 13. Validation and acceptance criteria

### 13.1 Presentation correctness

- A fully populated case generates all enabled canonical slides in semantic order.
- Output is a valid, editable `.pptx` that opens without a repair warning.
- Canvas is exactly 4:3 and 720 × 540 points.
- No off-slide guides, covered labels, placeholder values, or production notes are visible.
- Repeated measurements and findings are identical everywhere they appear.
- Empty optional slides are omitted.
- Text overflow is detected before export and linked to the affected field/slide.

### 13.2 Missing content and export behavior

- Missing required-looking images, measurements, or text appear as clear **content errors** in the review screen.
- Content errors list the affected semantic slide and provide a direct way to return to the missing field or slot.
- Content errors do not block export, but the user must explicitly acknowledge them before continuing.
- Corrupt case data, unreadable managed assets, impossible transforms, or exporter failure are **technical errors** and block export.
- There is no separate draft mode or automatic watermark in v1.

### 13.3 Image behavior

- Every canonical asset has a named, keyboard-accessible assignment slot with an orientation guide and slide-reuse list.
- A user can complete assignment through individual file selection and drag-and-drop without choosing a source folder.
- Folder suggestions remain provisional until explicitly accepted; low-confidence files remain unassigned.
- Assigning a record creates or reuses one managed local asset; repeated slides reference it rather than creating independent copies.
- The clinician's source file is never moved, renamed, overwritten, edited, or deleted.
- Missing managed files are detected when a case opens, with relink or restore-from-source behavior.
- Record and slide previews work without network access.
- The app checks supported type, decode success, dimensions, EXIF orientation, duplicate hash, and obvious aspect-ratio mismatch.
- Images are not stretched non-uniformly unless the user explicitly unlocks aspect ratio.
- Originals remain unchanged; crops and transforms are non-destructive.
- A one-reference-pixel nudge produces the documented deterministic movement in the PPTX.
- Shared ceph and pano transforms propagate only to their linked instances.
- Per-slide overrides do not alter the source asset or unrelated instances.
- Overlay opacity, rotation, z-order, and crop export faithfully.

### 13.4 Measurement and clinical-data behavior

- Every canonical measurement can be entered, edited, cleared, and confirmed manually without an Excel file.
- Units are displayed separately from stored numeric values and render consistently.
- Decimal comma/point, Unicode minus/dash, `%`, `°`, `mm`, blank, and `N/A` states are handled deterministically.
- HN and Bolton signs and affected arches are explicit and consistent on every bound slide.
- Clinic reference values cannot be overwritten as patient T0 data.
- Narrative interpretation, diagnosis, and treatment text remains clinician-authored or explicitly clinician-approved.
- Speaker notes stay private unless notes export is enabled.
- When Dolphin import is later implemented, confirmed imported values populate the same editable manual fields and produce identical slide output to equivalent manual entry.

### 13.5 Local operation

- V1 is a local desktop tool with no app login, account system, RBAC, cloud sync, telemetry, or application-managed encryption.
- Patient media is not sent to external AI/image services.
- Developer logs, issue reports, committed fixtures, and CI artifacts do not contain patient names, measurements, paths, or pixels.
- Temporary preview/render files are removed when no longer needed.

## 14. Current decisions and configurable template values

Fixed v1 decisions:

- The application works on both macOS and Windows.
- The workflow is local and offline.
- Each case uses an app-managed local case folder containing its data, copied assets, autosave files, and exports.
- Manual entry is complete without Dolphin import.
- Missing clinical content is a visible, acknowledged, non-blocking content error.
- Corrupt data or export failure blocks export.
- Slide 24 uses one precomposited traced-ceph image.
- HN and Bolton use clinician-entered final results; tooth-level calculators are deferred.
- Unused optional slides are omitted.
- The alignment reference is 1440 × 1080, where one reference pixel equals 0.5 PowerPoint points.

Configurable clinic/template values:

- Institution logo, doctor list, terminology, and visible language.
- Which of slides 16, 18, 21, 34, and 35 are enabled for a case.
- Whether slide 8 is mandatory or may be omitted for a particular workflow.
- ICON component labels and weights before slide 34 is enabled.
- Generic interpretation guidance shown in the app and whether clinician notes are exported.
- Final worksheet image behavior for slide 35.
- Filename aliases used by local mapping assistance.
- Exact normal/reference values and future revisions.

Until changed, v1 defaults to Turkish visible text, the supplied institution styling, optional slides omitted when empty, TMJ as an assigned image, and slide 35 as an assigned worksheet image.

## 15. Deferred capabilities

The following do not block the core manual workflow:

- Dolphin `.xls` import. Detailed candidate mappings remain documented in §5.7 and require real representative exports before implementation.
- Tooth-level Hayes Nance/Bolton calculators.
- Automatic diagnostic or interpretation rules.
- Separate transparent tracing-layer alignment.
- Native TMJ questionnaire renderer.
- Native slide-35 worksheet renderer.
- Embedded video rather than a poster frame.
- HEIC, TIFF, DICOM, and other non-JPEG/PNG media unless later required.
- PDF export.

Engineering order, exporter selection, gate acceptance, and deferred-feature scheduling are defined only in `ORTHODONTIC_CASE_BUILDER_IMPLEMENTATION_PLAN.md`.
