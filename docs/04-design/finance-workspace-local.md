# Selected Finance forms and scoped card workspace

Date:2026-10-27. Source implementation on `codex/redesign`; native and real-stack
acceptance remain pending. Extends the [commission contract](commissions-local.md)
and [selected migration](../03-planning/design-prototype-migration-2026-10-25.md).

## Composition

The Deal keeps its four main tabs. Its M/A-only supporting Finance entry opens
Commissions et encaissements. Frozen `parity-ui.js`, `app.css` and later
`drawer-cards.css` supply the tonal full-width card and focused-form treatment.
Current summaries, inline receipts and true-actor revisions use shared
RecordEntry, neutral badges and semantic icons, without drawer tables. Terms,
recognition and receipt corrections replace the collection/detail with one
focused editor. Cancel and confirmed completion return to the collection;
page/scroll/focus restoration stays local, not in business payloads.

Forms reuse shadcn controls, selected spacing, top labels, responsive paired
fields and the shared footer. There is one controller at both screen sizes;
no new token, theme, icon family, dependency or chart. The shared related-entry
variant removes nested card frames and left-aligns their actions with two scoped
CSS rules; outer cards remain unchanged. Lists explicitly
request20 rows, validate current page/parent/unique IDs and preserve an escape
from empty later pages. Unnecessary single-page footers are absent.

The subsequent collection checkpoint now embeds receipts beneath each recognized
commission, after its actions, with separators rather than nested card frames.
Expected commissions cannot have receipts under the existing rules and issue no
receipt query. Each displayed recognized commission has its own bounded20-row
read; at most20 such reads occur for the20-row commission page. This is not an
unbounded scan. Receipt pages and the dossier-history page survive focused forms.
The obsolete Encaissements et historique detour is removed.

History follows the commission collection, using one new scoped server read
across every commission in the Deal, including those outside the displayed page.
Financial events are explicitly described as commissions, encaissements and
reviews; ordinary Deal activity remains in its existing home. Cards show the
retained actor/reason/server civil time and allow disclosure of original terms.
Empty first history pages add no dead section; empty later pages retain navigation.
Delayed receipt focus restoration waits for the exact selected page, falls back
if the original moved/disappeared and does not take focus back after the user
has moved elsewhere. Validation focus waits until invalid controls are rendered;
receipt date/reason/correction errors link to the shared explanation.

## Dossier financial history read

`GET /api/v1/deals/{id}/finance-history` accepts only existing numbered
`page`/`page_size` bounds (default50/max100; the UI requests20). It returns the
existing revision fields plus `commission_id` and `deal_id`, within the existing
numbered envelope. A scoped join supplies both the count and page, ordered by
`created_at DESC, id DESC`. Current M/A authority precedes Deal lookup/count/page;
current Deal/Contact scope remains authoritative. Original actor metadata comes
from each immutable revision, including retained identities, never a new lookup
of the currently signed-in user. The existing per-commission reads keep their
unchanged shapes. No command, migration, broader grant, automatic fact or new
file access is introduced. Deploy backend support before the consuming frontend.

## Reviewed commands and recovery

Only existing endpoints and strict decimal-string schemas are used. Fixed and
percentage modes retain an explicit base; BigInt previews preserve final MAD
half-up rounding, including10.05 ×10% =1.01. Expected recognized balance remains
null/Non reconnu, despite the demo's computed balance. Recognition is a separate
version-only confirmation, never an automatic consequence of closing or saving.
Receipts, replacement/void and commission corrections preserve original IDs,
versions, amounts, actor/reason, proof version and authoritative balance.

Each form captures a reviewed baseline. Incoming values never silently rebase
it. Confirmation freezes the body and reviewed amounts; handlers also enforce
hydration, read-only context and a synchronous duplicate lock. Managed draft,
busy/recovery markers participate in the shared navigation/unload guard.
Transient quiet reads do not overwrite an active draft.

Unknown acknowledgement pins the exact path/body/UUID key. Fields and fresh
confirmation remain disabled; comparison cannot rebase a possibly committed
write. Exact retry recovers its result. If POST was acknowledged but completion
read failed, retry only repeats that read/callback, including after the context
becomes read-only. It never sends POST again. Completion refuses a projection
older than the acknowledged revision. Departure aborts requests/suppresses late
completion without claiming server rollback.

Leaving recovery warns that the operation may already be recorded and labels
the action Quitter le formulaire. Ordinary dirty drafts retain the existing
Quitter sans enregistrer wording. Leaving does not reverse financial facts.

Definite conflicts permit a scoped current comparison and explicit keep. The
comparison includes exact terms, state, balance and review warning, or the real
parent Deal for creation. A foreign target cannot become a new baseline.
Already recognized commissions cannot recognize again. Receipt correction
rechecks the selected original's current numbered page: a replaced, voided or
missing original blocks keep. A moved original requires returning to the list/
reselection; there is no invented receipt-by-ID endpoint or unbounded scan.
This conservative paging behavior is a technical adaptation, not a new business
rule. The server still checks current version, scope and validity.

## Authority, proofs and privacy

Backend authority remains: only current M/A see/write finance; Agents receive403
before lookup. Both Deal and Contact archive flags disable writes. Current401/
403/404 or definite archive refusal hides private content; the dossier-keyed
boundary unmounts the complete Finance controller. Retry creates a new lifetime
and fresh queries, without resurrecting the previous editor/selection.
Superseded scheduled denial cleanup is cancelled.

The facade preserves the existing backend RECORD_ARCHIVED409 code rather than
misclassifying it as uncertain dependency failure. The new history read above
adds no permission, migration or write/data-rule change; existing command and
legacy response shapes remain. Optional proof selection reads
current scoped Deal/Contact attachment pages and offers clean, unarchived
documents. Invalid/denied pages expose no cached filenames. The backend fixes
the exact proof version; selection grants no bytes/permit or broader scope.
Private fields/recovery keys do not enter storage, telemetry or URLs.

## Verification boundary

The [initial checkpoint evidence](../03-planning/design-migration-evidence/finance-workspace-2026-10-27.json)
and [collection follow-up](../03-planning/design-migration-evidence/finance-collection-2026-10-27.json)
records actual commands/results. Synthetic units exercise real modules with
stubbed React/request dependencies; they do not prove native rendering,
database authorization or concurrency. The prepared Finance journey keeps its
SP16 acceptance identity in each representative profile, plus explicit1440/390
variants. Excess receipt refusal, retained corrections/void, reopening review,
exact retry, version comparison and Agent denial remain in that source.
Older native `tests/review/finance.chrome.spec.ts` still needs selector migration.
The new aggregate read has prepared isolated PostgreSQL/HTTP coverage as well
as connection-forbidden synthetic query/role/route/SQL-compilation cases. The
prepared integration test has not run. A first unit assertion incorrectly assumed
a fixed Casablanca offset; it now verifies retained instants and separately
injects a deterministic zone to test server-local projection, leaving real time
policy unchanged. These are not real SQL/race/current-role execution results.
No browser, CUA, CDP, app HTTP or alternate-origin workaround was run.

Frozen inputs remain read-only. Original-machine antislop/design-system-ops
files remain unavailable; execution is not claimed. Installed design-taste
explicitly excludes dense multi-step product UI; no marketing workflow applies.
System-first shared composition and owner-selected appearance remain; AFTER
timing and final owner review are preserved. Native desktop/phone, keyboard/
touch/zoom/focus/accessibility, real roles/scope/SQL/proof transfer/races,
full-stack/CI, maximum-page performance, final Finance fidelity and other P0–P8
work remain open.
Main, real records/services/private configuration, push/merge/deployment and
production are untouched.
