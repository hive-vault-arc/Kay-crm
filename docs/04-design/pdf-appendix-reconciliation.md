# PDF appendix reconciliation: concrete M01 choice

Date: 2026-10-28. The initial read-only comparison is recorded below; the approved
implementation now changes future new PDF appendices on `codex/redesign`.
Original PDFs, prototype inputs and existing stored versions remain unchanged.

## Approved implementation

Use the frozen selected styled blank appendices for future new PDFs. Keep all
original PDFs byte-for-byte as provenance references. Record original/styled
SHA-256, model source date and code in a manifest and generated PDF metadata.
Describe the appendix as a KAY layout derived from the original. Retain blank
fields, clauses/sources/warnings, current finance restrictions and the absence
of automatic filling/signatures. Stored versions and same-key replay remain
immutable. No duplicate appendix or new user-facing generation option is proposed.

Owner decision,2026-10-28: “Use selected styled appendix (recommended)”. This
authorizes the proposed future-new-PDF substitution, preserved original assets
and recorded provenance. Source implementation and local PDF checks now pass;
native/full-stack acceptance remains pending. This is not merge approval.

The [migration plan's M01 boundary](../03-planning/design-prototype-migration-2026-10-25.md#6-known-integration-gaps-and-how-they-fit)
says “Do not silently substitute either document.” The former
[generation contract](generated-documents.md#boundary) promised an unchanged
original appendix; the selected prototype uses a separately restyled blank model.
This provenance/content choice is distinct from final merge approval.

## Source implementation and verification

All12 selected PDFs are copied byte-for-byte from the frozen reference into
`backend/app/generated/styled_templates/`. The original12 remain in `templates/`
and match the owner references. A strict bounded manifest pins each code/source,
original/styled hashes, bytes, pages, source date and revision, plus the catalogue
content hash. Every new render verifies these local resources. Missing, altered
or incoherent resources produce a safe503 dependency error before private storage;
there is no fallback to a different layout or external asset fetch.

The selected preparation sheet is followed by the selected blank pages, without
field filling, annotations or overlays. Its total counts the selected appendix;
the appendix retains its selected printing/pagination. The preparation end note
explicitly identifies the derived KAY layout and blank/unsigned state. PDF metadata
records `/KAYTemplateCode`, `/KAYTemplateSourceDate`, `/KAYAppendixFormat`,
`/KAYOriginalSHA256` and `/KAYAppendixSHA256`. No request/response/schema change,
new dependency, broader grant, duplicate appendix or generation option is added.

An existing same-key receipt is resolved before rendering or opening storage,
under the existing locked current identity and parent write authorization.
Operation, exact legacy request digest and parent binding still apply. Publication
also rechecks template visibility before a concurrent receipt can return, including
M/A-only models10/11. New keys create new immutable versions; old objects/receipts
are never rewritten. Other private transfer, audit and file rules remain.

Explicit-venv connection-forbidden units pass463 cases, with700 real integration
cases deselected. The46 added cases prove all12 body/literal comparisons and
appended page streams/text/geometry, provenance, malformed/tampered resources,
legacy digest replay without assets/storage and current-authority racing receipts.
Three PostgreSQL replay/byte-integrity cases are prepared, not executed. Ruff
check/format7 paths and mypy218 application sources pass. The offline wheel builds
and all33 required PDF/font/license/JSON resources match source bytes.

The PDF skill marker ran once before this authoring phase. Twelve synthetic
combined PDFs produce38 pages:13 preparation pages, including a long09
continuation, and25 appendices. All38 were Poppler-rendered at85dpi and opened
for visual inspection. No assembly clipping, overlap, glyph or preparation-footer
collision was observed. Selected source flow, inline blank rules and page breaks
are retained; this is not a new aesthetic redesign or legal review. All254 frozen
inputs and12 originals retain their hashes. Frontend505-unit/lint/type/build
evidence is retained from the inbox checkpoint, not rerun for this backend change.
[Implementation evidence](../03-planning/design-migration-evidence/styled-appendix-2026-10-28.json).

System-first selected assets and the PDF skill apply. Original-machine mandatory
UI skills remain unavailable/not claimed, dense CRM/PDF preparation excludes
marketing design-taste and AFTER timing remains. No app/browser/CUA/CDP/HTTP
workaround, database/service/private configuration, real record, migration or
main/push/merge/deploy. Real scope/SQL/concurrency/storage/download, native/CI/
AFTER and owner acceptance remain pending; the full redesign goal stays active.

## All-model evidence

| Code | Model | Original pages | Selected pages | Literal parts checked |
| --- | --- | --- | --- | --- |
| 01 | Bon de visite immobilière | 1 | 1 | 27 |
| 02 | Mandat de vente immobilière | 3 | 2 | 62 |
| 03 | Mandat de mise en location | 3 | 2 | 60 |
| 04 | Location longue durée - habitation | 4 | 3 | 75 |
| 05 | Contrat de location courte durée | 3 | 2 | 59 |
| 06 | Projet de bail commercial | 4 | 3 | 67 |
| 07 | Compromis de vente - préparation | 3 | 2 | 55 |
| 08 | Fiche descriptive du bien | 2 | 2 | 40 |
| 09 | Fiches clients - trois profils | 3 | 3 | 81 |
| 10 | Reçu de paiement | 1 | 1 | 25 |
| 11 | Facture de commission - gabarit | 1 | 1 | 30 |
| 12 | État des lieux - entrée / sortie | 3 | 3 | 60 |

All twelve originals match both the backend bundle and prototype original copies
byte-for-byte. The selected models total25 pages versus31 original pages. All641
catalogue chunks (paragraphs, headings, field labels and table cells) appear in
both extractions after NFC/case/whitespace and blank-rule normalization. This
literal check retains punctuation. A second whole-body alphanumeric comparison
passes after removing precisely known page furniture, repeated first notices and
table headings. Each header/cell and the first notice is checked separately.

Models08/12 add repeated table headers at a page break. Models07/09 keep repeated
professional/privacy notices in their flow. Raw token differences otherwise
include header/footer replacement, added reference/version labels, dotted versus
ruled blanks and line-wrapped URLs. Token counts alone must not be called lost
clauses. Model date16/10/2026 is source provenance, not a new preparation time.
No referenced legal/public-source URL was browsed or validated.

Four negative controls on extracted model01 text reject an added clause, changed
word, deleted field and punctuation change. The punctuation-only case passes the
whole-body character check but fails the literal check, showing why both are
necessary. The tool fails unexpected page furniture/unknown content blocks and
does not claim that extraction proves visual placement or legal equivalence.

At the initial read-only comparison, original and selected model02 page1 were Poppler-rendered at90dpi and visually
inspected: the selected wordmark/title/paired-field layout is denser and reflows
onto fewer pages. Only those two pages were inspected for this comparison; no
all-model visual pass was claimed then. The later38-page assembly inspection is
recorded above. The PNGs are ignored local review intermediates.

## Reproduce without app/database access

From the repository root:

```powershell
backend/.venv/Scripts/python.exe backend/tools/compare_pdf_appendices.py `
  --prototype 'C:/Users/ali-a/Documents/the vault/designs/kay' `
  --output docs/03-planning/design-migration-evidence/pdf-appendix-comparison-2026-10-28.json
```

The [read-only tool](../../backend/tools/compare_pdf_appendices.py) imports no
application/config/database/service module and never creates/edits a PDF. Its
source comparison output contains source/styled hashes and normalization counts;
the recorded run additionally includes explicit negative-control and visual
observations. [Evidence](../03-planning/design-migration-evidence/pdf-appendix-comparison-2026-10-28.json).
Ruff/format and explicit-venv mypy pass for that one tool. No backend application
suite or frontend test rerun is claimed by this read-only work.

The original-machine mandatory UI skills remain unavailable/not claimed, dense
CRM/PDF preparation excludes marketing design-taste and AFTER timing remains.
No app/browser/CUA/CDP/HTTP workaround, database/service/private configuration,
real records, main, push/merge/deploy. Native generation/download, full-stack,
actual CI/AFTER and owner acceptance remain open. The initial all-page visual
limitation is superseded by the local38-page inspection above.

Owner choice: approved for the selected styled appendix and implemented above.
The full redesign goal remains active; merge/native/product acceptance is pending.
