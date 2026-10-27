# Selected customer proposal workspace

Status: source integration proposal, 2026-10-27. C08/C04; native and owner review
pending. The [Deal contract](deal-pipeline-local.md) remains authoritative.

## Home and presentation

Frozen `record-tabs-ui.js`/`records.js` place proposals in Projets. `parity-ui.js`
supplies a separate editor. The old always-open overview form is removed without
adding a fifth tab. Aperçu/Projets/Activités/Documents and the existing Finance
drawer remain. Supported scalar overview/projects/activity/documents/finance
links work; unknown or array values fall back safely.

The existing selected-project editor and linked inventory summary also move to
Projet et offre retenus in Projets, before discussed/visited links and proposals.
Their controllers and stock rules remain; no duplicate overview section is kept.
Search/offering selection in the full Deal editor remains available. Broader
per-field context reconciliation is not claimed complete by this slice.

The server-counted section has Nouvelle proposition at the top. Desktop uses the
selected Montant/Statut/Échéance/Conditions/Actions table; phones and drawer
contexts use shared cards. Selected neutral status badges remain. Conditions
over 180 characters use disclosure; exact annual comparison, version and update
date remain available. Empty single-page collections omit unnecessary paging;
an empty later page retains a return path.

One focused drawer uses shared entry/sections, top labels, input pairs and footer.
Its selection lives outside the table, keyed by original proposal identity rather
than changing Deal revision. Refreshed/reordered rows cannot discard the draft or
turn editing into creation. Close returns to a surviving row or section heading;
the shared heading ref is optional and leaves other sections unchanged.

## Existing rules and command lifetime

Positive amounts remain decimal strings, MAD only, with original sale/month/year
periods and existing context-coherence checks. Shared formatting uses BigInt for
the integer part. Status, conditions and optional date keep existing bounds.
Acceptance does not close/reserve or change stock; no automatic expiry or
single-accepted-proposal restriction is introduced. Current scope and closed/
archived boundaries remain authoritative on the backend.

The existing MutateDeal/useDealCommand controller sends reviewed bodies, locks
writes, preserves the unchanged path/method/body retry key and reloads the Deal.
Edits retain both proposal expected_version and expected_deal_version. Confirmed
success alone accepts the managed draft and closes. A lost response/follow-up
reload retains the original request for exact retry. Unknown mutation failures
do not offer version rebasing that could duplicate a committed creation. Old
unrelated parent errors are not presented as new proposal failures.

## Current comparison and privacy

There is no single-proposal GET. Explicit comparison reads the Deal, finds the
original ID through the existing scoped 100-row numbered collection, then reads
the Deal revision again. Strict scoped schemas reject foreign IDs, unexpected
fields, wrong page/size and excess rows. Missing/nonprogressing results or a
changing revision cannot become a baseline. No endpoint/grant is invented.

Actual current proposal and Deal stage/inventory context are shown without
replacing input. Explicit keep adopts both reviewed versions; reload is discard-
guarded. Closed/archived context cannot authorize keep. Current denial clears
private lists/form fields before fresh retry. Transient errors retain drafts;
comparison aborts on departure and late success cannot close/reopen the editor.
Read busy state releases on departure. Submitted-command rollback is not claimed;
private values/retry proofs never enter storage, logs or URL payloads.

## Evidence and limits

18 new actual-module cases are registered in the 403-case frontend unit gate.
They cover fields, scopes/paged reads, lifecycle, draft/validation/retry behavior,
comparison/reload, denial/unmount, row-independent editor lifetime, presentation
and route compatibility. Two isolated 1440/390 journeys are prepared, not run.
Older Deal/Contact/pipeline helpers remain migration work.

Source/compiled/hash checks are not native visual/focus/touch/zoom/accessibility,
real authority/stock/concurrency, full-stack/CI or human approval. The existing
app-access restriction remains. Original-machine mandatory skills are unavailable
and not claimed executed; dense CRM/forms exclude marketing design-taste.
Shared system/React guidance and AFTER timing remain. No new CSS/kit/theme/
dependency/backend/schema/data/service operation, private config, main/push/merge
or deployment. PDF provenance, finance/work/report/domain reconciliation and
final gates remain open.
[Evidence](../03-planning/design-migration-evidence/customer-proposals-2026-10-27.json).
