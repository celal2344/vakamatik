# ADR-001: Use PptxGenJS as the production PowerPoint exporter

Status: Accepted. Gate 1 closed with a product-owner exception deferring unavailable macOS PowerPoint testing.

Gate 1 selects PptxGenJS 4.0.1 behind the library-independent `Exporter`/`SlideDocument` contract. The four-slide spike produced native editable text and tables, valid notes, aspect-preserving crops, fractional rotation, opacity, deterministic z-order, and exact 4:3 geometry. Independent Open XML validation, same-environment visual regression, and a real Windows PowerPoint open/edit/save/reopen exercise all passed. No measured hard requirement failed, so building an Open XML fallback exporter would add a second implementation without evidence that it is needed.

## Considered options

- **PptxGenJS 4.0.1**: selected because it met the measured acceptance criteria with a small adapter and preserved editable PowerPoint objects.
- **.NET 8/Open XML exporter**: retained only as the specified fallback path. Gate 1 uses Open XML independently for package validation, but no fallback exporter proof was built because PptxGenJS did not fail a hard requirement.

## Consequences

- PptxGenJS-specific objects stay inside `packages/pptx-exporter`; the input model remains library-independent.
- Production work must keep semantic slide IDs, points as the layout unit, normalized crop values, uniform scaling, and structured overflow errors in the shared contract.
- Windows PowerPoint acceptance passed. macOS PowerPoint was not tested because no device was available; the product owner accepted this as an unverified residual risk rather than a Gate 1 failure.
- Gate 2 may proceed when explicitly started. Future evidence of a hard platform-specific failure reopens this ADR and triggers the smallest possible .NET 8/Open XML proof for that failed feature.
