# Selected preparation-sheet PDF stationery

Current update,2026-10-28: [approved M01 implementation](pdf-appendix-reconciliation.md#source-implementation-and-verification)
now uses the selected styled blank appendices for future new PDFs, preserving
originals/provenance and old replay. The unchanged-original statements below
describe this earlier preparation-sheet checkpoint, not the current renderer.

Date:2026-10-27. Source implementation on `codex/redesign`, following the
[document workspace](document-workspace-local.md) and
[generation contract](generated-documents.md). This is a renderer checkpoint,
not completion of M01 appendix reconciliation or of the redesign branch.

## Selected appearance and actual metadata

The preparation sheet ports frozen `document-stationery.js` and `generated-pdf.js`:
595.28×841.89pt pages,48pt margins/wordmark width,56pt lower content boundary,
the selected Manrope regular/bold instances, white paper and navy/grey text.
Uppercase centred title, small preparation subtitle, paired dossier/date and
actor/model metadata, numbered sections, paired short fields, full-width long
fields, blank writing rules and restrained footer replace the former cream/gold
Fraunces layout. Long values and metadata wrap within their columns; oversized
multiline fields split safely across pages. Every preparation page repeats the
wordmark and its actual page/combined-document total.

The service supplies the real parent kind/UUID, server Casablanca date and
authorized current actor name. Editable `agent_name` remains the document's
representative field; it cannot supply the preparation-author metadata. The
four-argument internal renderer remains available without fabricating an author.
No new public request/response field, write permission or database migration.

Money-like keys follow the selected decimal-string display grouping, including
comma decimals and large exact amounts. There is no float conversion, rounding,
automatic accounting/tax value or interpretation of nonnumeric budgets. The
selected whitespace/dash normalization affects presentation, not stored request
values or receipt digests. All strings are drawn literally, without HTML/XML,
links, signatures, JavaScript or user-supplied drawing commands.

## Content, attribution and immutable originals

Catalogue fields and model-specific warnings remain unchanged. The end note
retains the existing explicit facts: the original blank appendix still needs
completion/validation, its dotted fields are not filled, and no electronic
signature is created. This necessarily remains more explicit than the selected
prototype's shorter end note. Current scope/finance/archive checks run before
rendering and again in the existing locked publication transaction.

The12 original bundled PDFs are neither replaced nor overlaid. Tests compare
each appended page's extracted text, content stream, media/crop boxes and
rotation with its original. Source files remain byte-identical to owner originals.
The original appendices retain their own printing/pagination; preparation-sheet
footers count the combined document. M01 still requires a concrete resolution of
the selected restyled appendices' text-token/page-break differences. This slice
does not silently substitute different legal clauses or claim legal equivalence.

Only future new generation uses the new sheet. Existing stored versions and
same-key receipt replay stay immutable; the private file lifecycle, digest,
archive/current-authority checks, current creator audit and transfer remain.

## Assets and packaging

The two97KB static font instances are exact copies of the selected assets and
retain the existing Manrope OFL. Their679-code-point repertoire matches the old
variable instance. This is not new acceptance of complex-script shaping or all
Unicode input. The owner-supplied wordmark is vendored as132 fixed path commands
from3 paths, with SVG/font/license hashes in
`backend/app/generated/assets/document-branding.json`. No runtime SVG parser,
network asset fetch, font download or new dependency is introduced.

Both static instances retain the same internal variable-face name. ReportLab
initially aliased bold to regular, which actual PNG inspection exposed. Scoped
embedded descriptor identities now keep distinct faces/subsets without changing
the source font bytes. Registration is synchronized. The distribution includes
the vector JSON, fonts/license and all original models. An offline wheel build
and zip-byte comparison verify18 required resources; nothing is installed or
deployed by that check.

## Evidence and remaining acceptance

The [slice evidence](../03-planning/design-migration-evidence/pdf-stationery-2026-10-27.json)
records410 connection-forbidden backend units/696 deselected, including26 new
geometry, literal/metadata, decimal, long-line, asset, font and service-context
cases. Explicit backend/.venv Ruff/format and mypy217 sources pass. All254 frozen
inputs remain unchanged. Frontend source is unchanged from the preceding423-unit,
lint/type/build checkpoint; those gates are retained, not claimed newly run.

The PDF skill's create marker ran once before3 synthetic intermediate PDFs.
Poppler rendered4 final preparation pages (models01/09/11, including the long
model09 continuation), all visually inspected after fixing the font collision.
One frozen reference was inspected for comparison. The final samples have no
observed clipping, overlap, broken French glyphs or footer collision. This is
local PDF artifact inspection, not browser/app access or all-model visual proof.

No real document/data/account/service/private configuration was accessed. The
existing automatic app-access rejection remains; native app generation/download,
real scope/SQL/race/worker/transfer/full-stack/CI, AFTER and owner review remain
pending. Source tests and the wheel do not prove those gates. Original-machine
antislop/design-system-ops prerequisites remain unavailable and are not claimed
executed; dense CRM/PDF preparation excludes marketing design-taste. M01 and the
other P0–P8 gaps stay open. Main/push/merge/deployment are untouched.

Read-only M01 follow-up,2026-10-28: the [concrete appendix comparison and
proposal](pdf-appendix-reconciliation.md) checks all12 selected/original pairs
and641 literal chunks. The owner subsequently chose the selected styled appendix
on2026-10-28. That approved implementation and its gates are next; the renderer
is still unchanged at this inbox checkpoint, without legal/native acceptance.
