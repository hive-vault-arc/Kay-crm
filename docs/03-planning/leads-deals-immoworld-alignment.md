# IMMO World lead/deal alignment

2026-10-17. Status: implemented and verified locally; the requested code-change
objective is complete. Human product acceptance and real-data rollout are separate;
nothing was committed, pushed or deployed by this work.

The acceptance matrix and final completion audit below describe the current
result. Intermediate checkpoints retain their original failures, running states
and corrected reruns as history, not outstanding work.

## Owner request and authority

Khalid requests the IMMO World lead/deal workflow and page compositions in KAY,
using KAY colours, shared shadcn/Tailwind/Iconsax components and French copy.
This supersedes the earlier SP-11 no-conversion/free-title creation UX for these
surfaces. It does not authorize production/database operations, publication,
rewriting history, changing authentication, replacing stock safeguards or editing
the IMMO World reference repository. Other existing worktree changes are retained.

Reference root: `../Immoworld/Immoworld-Crm-Ai`, inspected as a read-only reference.
KAY remains Next.js/FastAPI/PostgreSQL, one team, MAD, Africa/Casablanca.

## Reference evidence

- `frontend/src/features/leads/hooks/useCreateLeadSections.ts`: contact fields,
  selectable calling code, residence, nationality, languages, budget, campaign,
  owner, rating and description.
- `frontend/src/features/leads/hooks/leadSectionOptions.ts` and
  `frontend/src/features/deals/constants/formOptions.ts`: five shared MAD bands.
- `frontend/src/data/campaignSources.ts`: twenty campaign channels.
- `frontend/src/features/leads/components/ConvertToDealModal/useConvertToDeal.ts`
  and the matching modal: budget, buying intent and existing/other project choice;
  no separately invented deal name.
- `backend/app/schemas/deal_parts/core.py`: human create/conversion validation.
- `backend/app/services/deals/deal_conversion_service.py`: locked conversion,
  active-deal conflict, inherited client context and preserved history.
- `backend/app/crud/deal_conversion.py`: inherited identity/ownership/budget,
  converted lead state, project relationship and recorded actor.

IMMO World internals, retired integrations, role model and libraries are not
copied blindly. Its CRM layouts and workflow are the requested reference.

## Acceptance matrix

| Requirement | Current implementation and verification evidence | State |
|---|---|---|
| Name, international phone and selected calling code | Shared picker/E.164; current Lead/Deal qualification journeys exercise selected +33 and create/edit/read across installed Chrome and four additional profiles; final full backend includes normalization/persistence cases | Verified locally in source, SQL and browsers |
| Country, nationality, multiple languages | Persisted profile, French selectors; profile edits and saved-versus-current historical countries/languages in SQL/browser cases and the final backend aggregate | Verified locally in source, SQL and browsers |
| Budget and rich lead-source choices | Live reference comparison:20 mapped sources, no missing/extra keys, and five exact budget bands matching both reference forms; actual create/detail/filter/table and backend validation cases | Verified against reference, SQL and browsers |
| Actual lead conversion | Real versioned atomic command requiring project/budget/intent; strict HTTP/facade, current conversion and catalogue journeys; no free-title input/body | Verified locally through actual command and UI |
| Conversion integrity | PostgreSQL duplicate/race/retry/stale/private/archived/rollback/origin/history guards; actual recovery DB refuses cleanup-flag detachment after restored conversion; all included in the final backend pass | Verified locally in SQL, HTTP and browsers |
| Manual deal creation | New/existing canonical client; actual1/2/3 ordered project commits/replay/history pass3/3 and join the final aggregate; manual browser create/edit and required qualification without writable title | Verified locally through actual persistence and UI |
| All leads and all deals | Rich configurable inline-filter tables, scope-before-count queries, numbered pages and ID-only preferences; current native/list/filter/private-label cases and backend query/count checks | Verified locally in source, SQL and browsers |
| Lead/deal detail and editing |20 final captures, atomic profile/deal edits and saved snapshot history, exact derived heading/settled panels, actual pipeline/files and native200%; final backend history/authority pass | Verified locally in SQL, UI and visual evidence |
| Existing KAY business | All132 distinct broad Chrome cases have passing evidence through retained continuation runs, including stock/reservation/outcome/finance/report/deal/file flows; final complete backend775 passed | Verified locally with retained failures/reruns |
| Data upgrade | Populated0022→0024, corrected older-revision fixtures and70-table actual restore preserve original facts; final READ ONLY inspection finds head0024 and empty isolated fixture tables | Verified on isolated synthetic target; no real-data rollout |
| Responsive and accessibility |320–1440 widths, keyboard/touch/actual200%, states and20 captures; current four-engine journeys, native cases and bounded reviewer fixes | Verified locally within recorded browser/review scope |
| Verification | Final backend775 passed/94% configured coverage; production build, lint/direct types/45 frontend units,132 distinct broad Chrome and12 cross-browser journeys, dev-only case, static checks and final privacy/source/artifact audit | Local technical gate complete; documented dependency exception retained |

## Delivery sequence

1. Complete reference/code/layout comparison and record affected contracts.
2. Implement catalogues, profile/qualification persistence and additive migration.
3. Implement atomic conversion and manual creation, projections/filtering, history
   and tests; update linked readers, fixture creators and strict facade schemas.
4. Replace lead create/edit/list/detail and deal create/list/detail compositions,
   using the shared phone/profile/qualification/project controls.
5. Run isolated database/migration and real browser verification. Review the full
   explicit acceptance matrix, fix regressions, update contracts/evidence.

## Working boundaries

Existing dirty inventory/login sources, tests and documentation belong to other
ongoing work and are preserved. Contact identity and ownership remain canonical;
a conversion must not create a second client or broaden access. Project interest
does not reserve stock. A later offering/reservation/close still uses KAY's exact
physical target and dedicated commands. The supplied source code, not an old
mockup or test assertion, establishes the requested replacement workflow.

Skill applicability: design-system-ops and responsive guidance govern geometry;
React guidance governs implementation; Impeccable Operate governs forms/tables.
Design-taste-frontend's marketing concept/motion/imagery workflow is excluded.
Antislop's existing AFTER review is retained; the user's precise IMMO World
reference and KAY brand direction settle this task's composition, not a new world.
No claim of product acceptance or hosted rollout is made. Isolated migration
evidence, when available, is recorded in the implementation checkpoints below.

## Retained implementation and verification history

The following checkpoints record progress as it happened. Their pending/running
statements and failed attempts are superseded only by the later explicit results
and final completion audit, never silently reclassified as successful runs.

## Backend implementation checkpoint — 2026-10-17

The backend qualification and conversion path is now implemented, but this is
not completion of the requested page/workflow replacement. The acceptance
matrix above remains open until its frontend and broader regression evidence
exists.

- Canonical contacts persist residence, nationality and multiple languages.
  Partial older contact edits preserve omitted profile fields. Merge keeps the
  survivor's supplied country/nationality, fills blanks and unions languages
  within the existing bounded identity policy.
- Manual leads require a positive budget/reference band and known languages;
  campaign source and rating are separate from immutable technical provenance.
  Existing website/import/legacy records are not rewritten to invent facts.
- Authenticated `GET /api/v1/contacts/metadata` supplies calling codes and the
  reference-backed qualification vocabulary. Lead list filtering adds country,
  language, campaign and rating; converted leads have an explicit status filter
  and leave the default prospect list.
- `POST /api/v1/enquiries/{id}/convert` requires the reviewed enquiry version,
  exactly one project/standalone property/external project, budget and buying
  intent. It reuses the contact, captures the client profile, derives the deal
  title and records lead/deal history in the same transaction. Project interest
  does not reserve inventory. The old create-deal request cannot use an enquiry
  ID to bypass conversion qualification.
- Agency-first locking, current session/contact scope, archived/private denial,
  retry receipts and active-conversion conflict checks remain authoritative.
  Database checks tie the converted lead to the matching deal and require its
  project/qualification; ordinary SQL cannot detach an active conversion.
- Both strict server-side facade schemas and the explicit POST dispatcher now
  recognize conversion. New fields are present in bounded lead/deal/history
  projections. No public generic record proxy was introduced.

### Evidence and limitations

Only the resolved isolated `kayrealestate_test` target (OID109061) was migrated
under the shared test-run lease. Development and production were not migrated,
seeded or reset. The new draft revision is `0023_lead_deal_qualification`.
It was adjusted before publication to include `enquiries.converted` in the
append-only timeline action constraint, then recreated only on the empty
isolated target. Alembic reports no metadata operations after upgrade.

Verified commands (backend commands use `backend/.venv`):

| Check | Observed result |
|---|---|
| `python.exe -m pytest --unit-only tests/test_qualification_unit.py -q` |30 passed; catalogue, normalization and required conversion fields |
| `python.exe -m pytest tests/test_contacts.py tests/test_contact_edges.py tests/test_lead_conversion.py tests/test_qualification_migration.py -q --tb=short --maxfail=1` |47 passed74.62s; actual PostgreSQL, HTTP authority, races/retry/rollback, existing project interest and populated0022→0023 preservation |
| `mypy.exe app` |Success across181 source files |
| Frontend `node --test tests/unit/qualification.test.mjs` |3 passed; actual conversion schema/facade, required facts, session/CSRF forwarding and foreign-origin/free-title/retry-key denial |
| Focused Ruff check/format check across43 backend files |All checks passed;43 files formatted |
| `python.exe -m pytest tests/test_qualification_migration.py -q --tb=short --maxfail=1` |Final static-query migration test rerun1 passed17.85s |
| Frontend `npm run test:unit` |42 passed; existing TLS/auth boundaries plus the3 new qualification cases |

Earlier failed attempts remain known: the first conversion test exposed the
missing timeline action; the contact regressions required qualified synthetic
fixtures and preservation of omitted contact profile fields. These were fixed
before the47-test pass. Ruff subsequently caught two overlong SQL literals and
the migration test's final formatting; both were corrected and the focused
Ruff checks pass. This is scoped evidence, not a complete technical gate.

The frontend type errors described at the earlier checkpoint were subsequently
fixed by replacing the lead editor with the qualified, versioned form rather
than weakening validation. The new manual workflow checkpoint below supersedes
the earlier title-based contract. No full-product or production acceptance is
claimed; the acceptance matrix remains open pending complete evidence.

## Manual-deal and frontend checkpoint — 2026-10-17

- Lead create/edit/read now expose selectable international calling codes,
  residence/nationality, multiple languages, budget, campaign and rating. Lead
  profile/qualification editing is one versioned transaction. The create page
  no longer has a permanently empty summary column.
- The actual lead-record conversion dialog requires project/budget/buying intent,
  then opens the saved deal. The compiled visible Chrome lead path passed1/1
  before the manual-deal replacement, including320–1440 widths and keyboard
  dialog opening/Escape/focus return. The fresh compiled combined manual-deal/
  lead-conversion run passes2/2 in44.1s (16.0s and14.1s case times).
- Manual deals now require project(s), budget, buying intent and client languages.
  Create supports an existing scoped canonical contact or a new profile committed
  in the same transaction. Edit can atomically update that same profile and deal
  with two reviewed versions. There is no writable arbitrary deal title or
  enquiry-id conversion bypass. Current stage/stock/outcome commands remain.
- The new manual form pairs qualification and project controls, allows up to3
  interests, and exposes source/rating/financing/rooms/notes. Optional requirement
  and exact inventory offering context remains available without reserving stock.
- Deal detail and configurable tables expose the new facts. Leads/Deals use
  compact inline filter bars for the owner's reference composition. The ID-only
  column preference parser now accepts the new bounded column catalogue; its
  previous8-column bound would have rejected the new9-column defaults.
- A language-picker ref/error association was added for accessible form-error
  focus. No palette/token/icon-family/chart/dependency change or shipping raster.

Observed verification for this checkpoint:

| Check | Result |
|---|---|
| Backend qualification pure unit selection |42 passed0.45s |
| `test_manual_deal_qualification.py test_deals.py test_lead_conversion.py` |28 passed32.57s |
| `test_deal_edges.py test_manual_deal_qualification.py` |25 passed24.80s |
| `test_deal_edges.py test_reservations.py test_outcomes.py test_finance.py test_reports.py` |72 passed88.15s |
| Backend `mypy.exe app` |Success across182 source files |
| Frontend `npm run test:unit` |44 passed, actual qualification schemas/facade and bounded private-free column metadata |
| Frontend lint/typecheck/build |Passed; latest build includes the new forms and language error association |

Retained failures: broader backend verification initially stopped after67 passes
because a historical test still expected manual enquiry_id linking. It now tests
strict refusal separately while retaining its same-contact/private requirement
denials; the72-case rerun passes. Frontend units initially rejected two newly
imported facade modules in the explicit test loader; the test now supplies the
actual contact contracts and error mapping, and all44 pass. No check was removed.

Remaining: post-guard regression, all legacy browser
case updates, final lead/deal/detail/history layout and field parity, complete
state/keyboard/zoom/mobile visual captures, bounded independent finish review,
AFTER audit, documentation/traceability and full requirement/security audit.
Isolated test evidence does not authorize development/production migrations.

### Qualification history guard checkpoint

Additive0024_deal_qualification_history closes the SQL snapshot gap for all new
qualification fields and ordered project interests. Newly inserted deals require
budget, buying intent, client languages and project interest. Qualified rows
must exactly match their latest immutable qualification snapshot. Untouched
legacy default qualification may retain its historical empty snapshot; legacy
facts are neither invented nor rewritten. A partial unique index prevents
case-insensitive duplicate external projects per deal.

`test_qualification_history.py test_qualification_migration.py
test_manual_deal_qualification.py test_lead_conversion.py` passes32 cases53.55s,
including direct SQL tampering, project rename/delete/append, reorder with exact
new history, unqualified SQL insertion refusal, metadata parity and populated
0022→0024 preservation. Only the isolated test target was upgraded under its
exclusive lease. The current pure backend selection passes196 cases3.05s;
565 integration cases are deselected, not passed. Focused Ruff checks pass.

The deal history UI now offers each recorded qualification snapshot alongside
the actor/stage/proposal history. Its later browser verification is recorded
below. The preceding compiled expanded deal run passes6/6 in2.1m: conversion plus
proposal/stage behavior, list creation/
scoped counts/numbered pages/filtering/ID-only columns, committed-response retry,
preserved conflict draft/explicit reload, exact offering/requirement prefill and
proposal/intent/version protection. That earlier run alone did not certify the
later history UI.

Post0024 broad backend verification passes93 cases122.14s across
`test_deal_links.py test_deals.py test_deal_edges.py test_reservations.py
test_outcomes.py test_finance.py test_reports.py`, including real scan/private
deal files and merge/current-owner checks. Its first attempt stopped at9 passes
because the historical migration test still expected a populated contact schema
to downgrade. It now verifies the required refusal and preservation of contact,
inventory and requirement facts; the independent raw populated0022→0024 test
still proves the additive legacy upgrade. No retention guard was weakened.

## Confirmation and regression checkpoint (2026-10-17)

The previous goal turn is classified as progress: current source contains the
qualified manual/conversion workflow and additive history guards, with actual
scoped regression evidence above. This continuation checked the current files
and process handles before resuming. The earlier build handle no longer existed;
no success was inferred from it. A new lint run found2 React effect-dependency
warnings in deal-form's denied callbacks; destructuring those callbacks fixed
the warnings without removing the deny behavior. Fresh lint, typecheck,44 frontend
units and the production build all pass.

The first builder capture batch contained19 desktop/mobile frames. One batch
fixed corrected-error clearing, edit-form placement, history fact geometry,
toolbar wrapping, project-name readability and redundant empty contact fields.
The final builder confirmation passed2 compiled headed workflows in50.1s;
all18 resulting PNGs were opened. No additional builder polishing followed.

One manual Impeccable detector ran on changed contact/deal features, routes and
globals: exit0/JSON `[]`. A fresh generic subagent substituted for the unavailable
dedicated finish-reviewer type. Its full review returned `fix` on3 material
issues: multi-project column imbalance, missing historical country/nationality/
calling-code display, and stale PRODUCT/DESIGN authority notes. One correction
batch placed notes beside the first project/follow-up, moved additional project
interests into following balanced rows, exposed each saved client snapshot's
missing facts, and reconciled the scoped authority notes. No second detector ran.
Its verdict pass reopened the original18 captures plus2 three-project captures
and scored all3 listed fixes resolved, `disposition: ship`. This verdict covers
the scored fixes, not a new full-surface or full-product acceptance.

Final current-build command from frontend:
`npm.cmd run test:chrome -- e2e/deals-qualification.spec.ts
e2e/leads-qualification.spec.ts review/leads.chrome.spec.ts
review/deals.chrome.spec.ts e2e/filter-rail.spec.ts
e2e/action-buttons.spec.ts --reporter=list --max-failures=1`, with temporary
`KAY_E2E_PRODUCTION=1`, opt-in synthetic captures and round2 output, passes8/8
in4.7m with0 skipped. It proves client/profile creation and atomic edit,
retained old versus new countries in history,2/3 project form layouts, actual
conversion, rich tables/columns, manager and agent filters, retained project/
contact rails, shared actions, native loading/empty/error/conflict/denied/archive,
real clean-file scan/download, touch, keyboard and actual200% Chrome zoom.
Measured zoom changes DPR2→4 and viewport1427→713 CSS px with no document
overflow. Relevant controls are44px; expected local table scrolling is retained.
No unexpected console/page errors were reported in the native deal review.

Retained first broad attempt:5 passed/1 failed in4.3m. The new inline mobile
filter helper sampled form existence before the initial async screen finished,
then looked for a retired drawer. The corrected helper chooses the known route
and waits for its actual form; the whole8-case selection above passes. The
failed attempt's supervisor shutdown reported lease loss; no lease was bypassed
or competing database writer started. All test writers remain serial.

Fresh pure backend selection passes196 cases4.06s (565 integration cases
deselected, not passed); mypy passes182 source files. Client-bundle scan:
4 roots/391 JavaScript files/0 configured facade-secret matches/1 configured
signing key/0 signing-key matches. Private report audit:4 JSON entries/4 step
arrays/0 detailed arrays. Repository documentation validation passes22 specs,
1261 links/anchors,41 AT mappings,13 synchronized Mermaid pairs and10 API
examples. A trailing blank line in the scoped Lead source was removed after
`git diff --check` identified it; no behavior changed.

The explicit catalogue development/standalone interest browser case passes1/1
in29.2s (16.8s case time). It creates a manual deal with exact catalogue programme
and property parents, then converts the original Lead to that standalone target;
both retain the canonical client and leave offerings/reservations unset. Two
new backend catalogue-interest cases also pass in the11-case focused run below.

The fresh documenter completes the ordinary system-extension check in
[leads-deals-system-check.md](../../.impeccable/leads-deals-system-check.md).
It verifies source/token reuse and20 PNG dimensions, samples8 renders and
preserves pre-existing root DESIGN format/sidecar drift without an unrequested
global rewrite. [AFTER024](../../anti-slop/audit-024-2026-10-17.md) records0 new
numbered aesthetic-only findings and no unapproved audit-only source changes.

The complete backend attempt first stopped with39 passes/1 scanner assertion
failure: the test expected a length header and payload to use separate sendall
calls, although the implementation sends the same bytes together. The corrected
assertion checks the exact VERSION/INSTREAM commands, length, payload and terminal
bytes while retaining endpoint/timeout/signature/verdict assertions. A focused
unit run passes37 with8 deselected before the selector correction below.

That exposed a test-selector defect: splitting a full pytest node ID on `/`
mistook slash-bearing version/URL parameters for module paths, silently excluding
reviewed pure tests. It now partitions the module at `::` first, normalizes only
that path and retains the explicit allowlist plus DB-connection refusal. Six
selector regression variants include Windows paths and unreviewed tests with
allowed-looking parameter text. Current pure selection passes217 in3.53s with
552 cases deselected, not passed. Earlier196-unit evidence remains historical;
its565 deselections were not all integration tests.

The next full attempt stopped with171 passes/1 stale D34 test failure. Its HTTP
case still denied all agent hierarchy edits despite the separately approved
current project-permission contract. It now proves5 allowed fact operations with
fresh versions, while retaining owner/archive403, strict query/body, CSRF and
no-store checks. `test_development_edges.py test_manual_deal_qualification.py`
passes11/11 in28.41s, including both new catalogue-interest cases. No application
permission was broadened by this correction.

Recovery coverage is updated for the single new deal_project table: registered
metadata has69 tables plus Alembic, so the real restore must verify70 and retain
the qualified project's exact deal parent. That full run is executing. The
remaining broader record-layout/acceptance browser cases were adapted to actual
conversion/derived titles without dropping geometry/privacy assertions and are
not yet rerun. Full requirement acceptance and cross-module regression remain
open. No development/production migration, reference modification, commit, push
or deployment is authorized or performed.

## Historical migration regression checkpoint (2026-10-17)

The previous implementation turn made progress; the intervening CORS answer was
an ordinary question, not a goal-completion claim. The existing full backend
handle was polled to its actual terminal result:213 passed/3 failed in242.01s.
One discovery test supplied the retired writable deal title; it now creates a
qualified deal, verifies the derived title contains the canonical client name
and retains the positive/private deal/document search assertions. Two historical
migration tests attempted to downgrade already-populated qualification data.
Their fixtures now downgrade the empty isolated schema first and insert explicit
legacy contact/inventory facts before upgrading. The three corrected cases pass
3/3 in26.14s. The first focused attempt failed on a result-shape assumption and
an omitted historical contact version; those fixture defects were corrected,
not hidden by relaxing application validation or database constraints.

The same historical-fixture correction is applied to finance, import, outcomes,
reservations, requirements, scheduling, worker backfill and signed intake tests.
The shared test-only legacy helper inserts explicit old-schema columns; it does
not bypass constraints, disable triggers, truncate data or drop qualification
fields from current records. Existing true-actor, exact original fact/history,
reservation/release, outcome/reopening, commission, outbox and file assertions
remain. Each test restores head in finally. The isolated lease and synthetic-only
cleanup are unchanged. Ownership/intake downgrade assertions name the new earlier
qualification-history guard rather than falsely requiring a later old guard.

That focused command retained13 passes/1 failed import phone comparison in134.80s.
The difference was the additive empty website_source_id column, not changed phone
facts. Both old/new snapshots now exclude that single later provenance column;
the separate intake and qualification upgrade tests cover their added defaults.
The first correction hit only the old-side query and was caught by source
inspection; the new-side query is also corrected. A complete769-case backend run
is executing; it collected the import test before that second correction, so its
terminal result and a corrected affected rerun are still required. No result is
inferred from a live process or from the focused passes.

Fresh frontend lint,44 units and direct TypeScript checking pass. Fresh backend
Ruff/check/format passes315 files and mypy passes182 application modules. The
client scan still checks4 roots/391 JS files with0 configured facade/signing-key
matches; private report audit is4 JSON/4 step arrays/0 detailed arrays. Runtime
configs/build/test/capture paths remain ignored and contain no tracked files.
The20 final qualification captures and preceding compiled build remain present.

The executable OpenAPI catalogue was regenerated through the existing script:
125 paths/155 operations, SHA256
dc924eb0111b0545fc2dae7a0df10d96bb648645755b1e3395522de6c6032b6b.
Its current documentation includes metadata and conversion. Repository-only
documentation validation passes22 specs/1167 links/41 mappings/13 Mermaid pairs/
10 JSON examples; git diff --check passes. This repository-only link count is
not the earlier local/external-link mode count. The broader record-layout and
acceptance browser cases remain to run after the backend writer is terminal.

The completion audit also found that the new conversion-identity trigger's
synthetic-cleanup exception was not restricted by database name. Draft0023 now
allows that exception only in kayrealestate_test. A strengthened existing real
restore test converts a Lead before the coherent point, checks the exact restored
conversion link and proves SET LOCAL kay.synthetic_cleanup='on' cannot detach it
in the distinct recovery database. This new assertion was added after the running
suite collected tests; it must run against the rebuilt draft migration in the
affected rerun. No current production/development schema was changed.

Complete native Chrome discovery initially collected Node unit TLS fixtures and
failed before browser startup. The Chrome config now matches only e2e/review
*.spec.ts files. Fresh --list succeeds with133 tests in60 files; the independent
Node unit runner remains unchanged. One development-only ui-checks case must run
against the development harness separately rather than pretending it exists in
the compiled production build. Fresh lint/direct TypeScript checking also passes
after this collection-only correction.

## Complete backend result and current browser run (2026-10-17)

The complete backend command terminated with768 passed/1 failed in957.68s.
Its sole failure was the already-identified import-phone comparison collected
before the final correction. No other backend failure was suppressed or skipped.
After the writer exited, the final affected command ran, in this order:

`.venv/Scripts/python.exe -m pytest -q --tb=short --maxfail=3
tests/test_qualification_migration.py tests/test_benchmark_qualification.py
tests/test_lead_conversion.py tests/test_qualification_history.py
tests/test_import_http_migration.py::test_populated_0018_facts_preserved_and_import_evidence_refuses_downgrade
tests/test_recovery.py::test_coherent_point_real_restore_revoke_reconcile_and_immutable_replay`

Result:30 passed75.08s. The initial populated qualification migration rebuilds
the unpublished draft guard on the isolated test target; actual70-table restore
then preserves a newly converted Lead and its exact deal link. In the distinct
recovery database, a transaction setting the synthetic-cleanup flag still raises
LEAD_CONVERSION_IDENTITY when it tries to detach that conversion. The import
comparison and original facts pass. These are the full-run plus corrected-run
results, not a fabricated single all-green aggregate command.

Compatibility audit found that benchmarks/dataset.py still inserted unqualified
free-title deals. The fixed synthetic generator now supplies client languages/
country, Lead/deal budget/source/rating, purchase intent, programme/standalone
project interest, derived title, exact saved qualification snapshot and converted
Lead/timeline linkage. Two bounded real PostgreSQL cases invoke its actual
inventory SQL for programme and standalone branches and prove current list,
history and reservation behavior. Its fixed workload now expects180000 remaining
prospects or2000 per agent, since20000 of200000 Leads convert. The new full-volume
dataset/load was not executed or reset; these samples do not renew100-user timing
claims or mutate the existing benchmark database.

Fresh quality:217 pure units pass3.35s/554 deselected (the two new benchmark cases
are DB tests); Ruff/check/format passes316 files; mypy182 application modules pass.
Fresh production build passes after the final frontend source/test configuration.
The previous qualified browser captures remain unchanged in application design.

The complete compiled visible Chrome command is now running serially, with the
normal private/list/HTML reporters retained:
`KAY_E2E_PRODUCTION=1 npm.cmd run test:chrome -- --grep-invert 'live shadcn'
--max-failures=5`. This selects132 of133 native-profile cases; the single live
development-only component/error-boundary case is deliberately a separate dev
harness run, not skipped evidence or a claimed compiled route pass. No browser
result is claimed until that specific process is terminal. The full requirement
audit remains open pending actual broad browser outcomes and corrected reruns.

## Broad Chrome result and functional corrections (2026-10-17)

The specific complete compiled Chrome process terminated, exit1:39 passed,
5 failed and88 not run in15.0m. It was not still running or a successful full
regression. The failures were the old agent-block denial, two incomplete discovery
creation fixtures, the lost technical website-provenance filter, and an immediate
dashboard overflow measurement after viewport resize. Permission expectations now
match the previously approved D34 allowlist while retaining owner/private denials;
discovery fixtures supply the required client languages and budget. Related
ownership/performance fixtures also supply their required human Lead budgets.

The Leads advanced toolbar restores a distinct Provenance control using the
existing Label/NativeSelect/grid geometry. Marketing Source still selects the
new campaign catalogue; signed website intake keeps its original technical source
without invented campaign facts. Both intake browser cases now select Provenance;
the native case additionally exercises the received-list filter on touch mobile.
The responsive integration assertion now waits at most3 seconds for real reflow
and requires document width not to exceed viewport width at320/360/768/1024/1440.
Persistent overflow remains a failure, not a hidden or relaxed requirement.

The completion audit also found that the reporting pipeline still counted only
three old Lead states. The existing authorized list now returns all ten explicit
status counts (nine writable plus converted) over its exact filtered rowset,
before pagination. Dashboard prospects use one such response for all nine states,
with converted/archive exclusions stated. The current Bklit component and KAY
semantic colours remain; no arbitrary grouping or funnel conversion rate is added.

New real PostgreSQL coverage proves all nine states, scope/private denial,
filtered and out-of-range pages and conversion exclusion. The affected command
`-m pytest -q --tb=short --maxfail=2 tests/test_lead_counts.py
tests/test_lead_conversion.py tests/test_contacts.py` passes43/43 in44.47s.
The existing conversion case also proves received-Lead and canonical-contact
report totals stay1 while active deals move0 to1. Frontend lint/direct TypeScript
passes and45 units pass, including strict complete/nonnegative status-count
validation. Fresh build and corrected real-browser verification are next; these
checks do not close the broad acceptance gate.

The focused compiled Chrome process is terminal:8 passed/2 failed/1 not run in
4.3m. All five development cases, both discovery cases and actual signed website
intake pass, preserving role/stock/retry/private assertions. The integration
failure exposed an overstrict equality in the new poll (305px document inside a
320px viewport with a scrollbar is valid), now corrected to bounded `<=` without
allowing overflow. The performance fixture's status PATCH still omitted required
budget/source/rating; it now retains those current qualification fields. These
are test corrections, not weakened application validators. A fresh3-case run
covers both corrections and the native intake case that had not run.

The status-count test was extended with actual archived-contact state, manager
active/archived/all counts and agent archive denial; that final case passes1/1
in2.25s. Fresh full Ruff/check/format passes317 files; mypy182 application modules
passes. Pure backend units pass217/555 deselected3.25s. New compiled client scan:
4 roots/391 browser JS/0 configured facade/signing-secret occurrences. Docs-only
validation remains22 specs/1167 links/41 acceptance mappings/13 Mermaid pairs/
10 JSON examples; repository check8250 indexed files/0 forbidden/14 ignore probes.

The corrected3-case compiled rerun is terminal:3 passed in2.0m. It proves real
API stop/restart and recovery; proportional Bklit bars/accessibility lists for
all nine nonzero Lead states and the eight Deal stages; signed-intake native
states, actor/private denial, worker restart and the restored Provenance control
on390px touch mobile. Observed native minimum contrast6.045, all controls at
least44px, no document overflow; actual200% zoom DPR2 to4 and1427 to713CSS pixels.
The main agent opened the current desktop pipeline, mobile deal pipeline and
both refreshed received-Lead filter captures. No added aesthetic-only correction,
new token, detector rerun or widened reviewer verdict follows that confirmation.
One explicit mobile Lead-pipeline capture is added to the existing performance
case for the next full run; its new artifact is not yet claimed inspected.

The final3-case HTML report privacy audit finds4 JSON entries/3 step arrays/
0 detailed arrays. The complete compiled Chrome command has now started again:
`KAY_E2E_PRODUCTION=1 npm.cmd run test:chrome -- --grep-invert 'live shadcn'
--max-failures=3`, using the guarded serial writer and normal private/list/HTML
reporters. Its specific handle is live, not a completed result. The separate
development-only case, remaining cross-browser/final requirement audit and full
current backend aggregate still remain; no completion or deployment is claimed.

The new complete run has reached the qualified manual-deal/conversion/list/
proposal/retry/prefill cases, which pass. One dashboard-header case failed on
`HTMLImageElement.complete` immediately after responsive viewport changes; its
test now waits up to5 seconds for the actual image to load before retaining every
coverage/scale/border/height/overflow assertion. No application source or assertion
was removed. That collected failure remains part of this run and the corrected
case requires its own later rerun; the full writer is still active. This is a
verified wait on the existing process, not a restart inferred from a timeout.

The same live run exposed one further test-inventory omission: the generic
all-controls filter exercise had no label-to-query mapping for the restored
Provenance select. It now maps Provenance to the existing `source` parameter,
while marketing Source still maps to `campaign_source`. The assertion that every
select has an explicit mapping and sends its exact value remains. Both collected
dashboard-image/filter-inventory failures require corrected reruns after this
writer exits. No second database writer is started alongside it.

Read-only cross-browser discovery identifies12 relevant qualified Lead/manual
Deal/catalogue-conversion cases across Chromium, Edge, Firefox and WebKit, plus
the Chrome cases already selected in the broad run. This is collection evidence
only, not executed cross-browser proof. The development harness uses `.next-e2e`
when KAY_UI_CHECKS=1, separate from the compiled `.next` directory, so its pending
live-shadcn check must not be claimed through a production-only route.

## Terminal broad run and remaining-case continuation (2026-10-17)

The specific132-case writer is terminal, exit1:57 passed/3 failed/72 not run in
17.9m. The third failure expected the retired default Reception column after
reset. That test now first unchecks the actually default Budget column, asserts
it changed, then verifies Budget/Qualification/Country/Languages/Source restore.
The other two collected failures are the responsive image-load wait and explicit
Provenance query mapping recorded above. Application source is unchanged from the
verified compiled build; no failing business/auth/stock assertion was deleted.

The terminal report audit finds61 JSON entries/60 step arrays/0 detailed arrays.
It also exposed a retained test-created dashboard zoom profile. Four older
persistent-context cases now close and remove their own validated disposable
profile paths in finally, including first-launch failures. No user's browser
profile is a permitted target. A direct guarded manual cleanup command was
blocked by the runner and was not retried through another channel; no deletion
is claimed from that command. Final artifact state will be verified after the
normal test workflow. The general zoom test also now uses the current inline
Lead/Deal forms while retaining Contacts/Projects sheets and keyboard/draft checks.

Fresh lint/direct TypeScript passes after these test-only corrections. Read-only
`--last-failed --grep-invert 'live shadcn' --list --reporter=list` proves75 cases
selected:all3 collected failures plus all72 never-run cases, not merely the
three failures. The normal private/list/HTML75-case continuation is now running
serially. The earlier57 passes remain separate evidence, not a fabricated132-case
all-green command. Its terminal result, corrected dashboard zoom cleanup,
cross-browser12-case execution, development-only case and current full backend
aggregate remain open.

The75-case continuation has passed all three corrected failures and the next
agent-touch/outcome/ownership cases. No previous pass is used to excuse an
unexecuted case. Read-only inspection after ordinary Playwright startup confirms
the previous disposable dashboard zoom profile is absent; the blocked manual
command itself still did not delete it. The new finally cleanup paths require
the pending actual zoom cases and the extra corrected dashboard zoom rerun.

The75-case continuation is terminal, exit1:19 passed/3 failed/53 not run10.5m.
The new mobile nine-state prospect capture is inspected and legible; proportional
counts, catalogue project conversion and all paired-record/mobile/keyboard/touch/
safe-error checks pass. The actual200% Lead/Deal facts case passes17.5s and its
new cleanup leaves zero record-facts zoom profiles. The terminal HTML report has
42 JSON entries/22 step arrays/0 detailed arrays.

The three new failures are stale expectations, not accepted regressions: recovery
and report drill-down still looked for retired free deal titles; the search
selection helper looked for the old check glyph instead of the shared semantic
`select` action's Iconsax completed glyph. Recovery now asserts exact derived
title, restored budget/language snapshot/project ID and visible heading. Reporting
retains the exact derived-name link to the same deal. Search selection retains
aria-pressed, non-colour icon, inactive-icon absence and actual selected colours.
No app requirement or assertion category is removed. A further old denial-only
title check now first proves the real derived heading and denies that same full
text to the outsider; this strengthened case requires an extra rerun.

Fresh lint/direct types pass after the three failure corrections. Read-only
last-failed discovery proves56 cases selected (all3 failures plus53 never run).
That normal compiled serial continuation is now running. The earlier57+19 passes
remain separately attributable, not a fabricated all-green full command. Extra
current dashboard-zoom/private-title cases,12 cross-browser core journeys, the
development-only case, full backend aggregate and final requirement audit remain.

All three corrected failures pass at the start of the56-case continuation.
Actual restored-stack verification observes3.490s point age,3.874s restore and
26.322s incident-to-verified time for this synthetic run; these observations do
not promise production RPO/RTO. It verifies the new derived title, budget,
language snapshot and exact project together with revoked session/permit and
reconciled finance/import/intake jobs. Reporting drill-down preserves its exact
deal destination and derived label. Search selection retains its semantic action,
visible Iconsax non-colour marker and selected-state colours. Independent-search
retry and the first reservation case also pass. The56-case writer remains live,
with5 passed so far; its other51 cases are not yet verified.

## Current documentation/runtime contract audit (2026-10-17)

The README now identifies this replacement as undergoing final regression;
earlier SP-22 acceptance/benchmark figures remain historical baseline evidence.
The active API text and manual-deal example still contained the retired copied
enquiry/free-title flow despite the newer top-level warning. They now describe
explicit qualified conversion and manual creation, with three marked synthetic
request examples. A new pure test validates every marked example against the
actual NewEnquiry/ConvertLead/NewDeal models, without SQL or real IDs. The
qualification module passes43/43 in0.44s; all pure backend units pass218 with555
deselected in4.29s. Ruff/check/format317 files passes. Docs validation passes
22 specs/1167 links/41 mappings/13 Mermaid pairs/12 JSON samples. Only the three
qualification examples are model-validated; the other JSON samples are syntax
checks, not claimed runtime requests.

The live56-case browser run has completed its regular E2e segment and entered
the31 native review cases. The visible family/recovered-record review and real
200% general zoom pass with the current inline Lead/Deal forms and retained
Contact/Project sheets. Generic zoom's disposable profile cleanup executes in
that passing case. A native Deal-file case then waited for a clean scan while
the supervisor worker was stopped by a preceding recovery target switch.
Supervisor source confirms recovery-stop stops workers and starts only the API;
that test never started its own required worker. It now explicitly calls the
existing worker-start control before upload. Actual quarantine/clean verdict,
exact downloaded bytes and30-second bound remain unchanged. This collected
failure requires a corrected rerun; no scanner/application bypass is added.
The same ongoing writer subsequently passes the native development and discovery
cases. Its terminal result and the remaining named gates are still unproven.

The56-case continuation is now terminal, exit1:33 passed/3 failed/20 not run
in15.5m. Its report privacy audit finds33 JSON entries/36 step arrays and zero
detailed arrays. The native File test has the same missing worker prerequisite
as the Deal test: its first private-file scan preceded its own later worker
startup, while an earlier Discovery case stops that worker. It now starts the
worker before its initial upload; later stopped/unavailable/retry and EICAR
checks remain unchanged. The third failure expected retired login sign-in and
contact glyphs. The current owner-approved login uses forward/development with
duplicate footer glyphs; the test now checks that actual semantic inventory and
every no-JavaScript instance. No shipping login or authentication code changed.

Fresh frontend lint/direct TypeScript passes. Read-only last-failed discovery
proves23 selected cases:all3 failures plus20 never run. Their normal private/list/
HTML compiled Chrome continuation is running serially. Earlier57+19+33 passes
remain separately attributable; neither an all-green132-case command nor full
completion is claimed. Current dashboard-zoom/private-title extra cases,
cross-browser12, development-only case, backend aggregate and final audit remain.

The23-case continuation is terminal, exit1:8 passed/3 failed/12 not run7.7m.
Native Deal scan/private-file/desktop/mobile/actual200% and native Lead
duplicate/private/columns checks pass, as do import/intake/inventory and actual
login200% with its disposable-profile cleanup. Report privacy finds20 JSON entries/
11 step arrays/0 detailed arrays; read-only profile discovery finds zero retained
zoom profiles. Remaining failures expose separate test assumptions: scanner retry
had only the default5-second expectation, login's page-level Contact note was
omitted from the revised inventory, and outcome denial expected the banner
removed by the owner-approved D34 facts-edit permission change.

The retry expectation now uses the existing30-second real scan bound, without
changing worker code, quarantine, download or EICAR assertions. The exact login
glyph inventory includes the page-level Contact icon as well as shared footer
icons. The native outcome check now proves the permitted edit link and denied
stock action on the actual Offres tab, plus403 when that agent sends the same
real stock-reviewed body used by the manager. Private-deal404 remains. No app
permission or shipping login source changes. Fresh lint/direct types pass.

Read-only discovery selects all15 remaining cases:all3 failures plus12 never run.
Their normal compiled private/list/HTML run is now active. Earlier57+19+33+8
passes remain separate evidence. Extra current dashboard-zoom/private-title
cases,12 cross-browser journeys, the development-only case, full backend and
final requirement audit remain open. Independent fresh checks pass45 frontend
units; Ruff317 files, mypy182 modules and pip check; docs22 specs/1167 links/
41 mappings/13 Mermaid pairs/12 JSON samples; repository8250 indexed files/
0 forbidden/14 ignore probes;16 CI-policy units. Runtime audit0 vulnerabilities;
9 dev-only findings use the approved exception expiring2026-11-15, not a clean
full dependency audit.

In the live15-case continuation, the corrected login SSR/no-JavaScript case
passes. Native File retry still fails at30 seconds; that disproves the earlier
assumption that only the default5-second expectation was wrong. Source inspection
finds the actual90-second fenced job lease in files/worker.py and the existing
E2e stopped-worker recovery case's120-second bound. Native File now follows that
same protocol:stop worker, observe retry200 or409/FILE_SCAN_IN_PROGRESS, restart,
wait up to120 seconds for a real clean verdict, then verify exact download bytes.
No lease, scanner verdict, UI, quarantine or permission code is modified. The
already-collected failure remains in the current run and requires a later rerun.

## Current final-regression checkpoint (2026-10-17)

The15-case continuation is terminal13 passed/2 failed in12.4m. Native outcome
including fresh-agent external-stock403, ownership, actual restored stack,
reporting, requirements, reservations, scheduling, user administration, all nine
V3 compositions and antivirus-clean inventory image authority pass. Across the
57+19+33+8+13 separately recorded passing sets,130 of132 broad cases have passing
evidence; this is not a single all-green invocation. Report privacy13 JSON entries/
15 step arrays/0 detailed arrays. Remaining native cases are File recovery and
Work:the former used the disproved30-second bound before its source-confirmed
90-second-lease/120-second-recovery correction; the latter reports1.404 contrast
during a task-form resize sequence. No contrast threshold or app style is changed.
Its helper now emits bounded tag/action/classes/computed-colour diagnostics,
without text or input values, to identify the exact failing element.

A guarded4-case compiled run includes those2 failures plus the extra current
dashboard200% cleanup and exact derived-title/private denial cases. Both extras
pass. The current Work conflict capture is opened and legible; it is not proof
that the later failing measured state passes. File/Work corrected evidence is
still pending. Read-only cross-browser discovery again confirms12 cases across
Chromium, Edge, Firefox and WebKit; this remains collection, not execution.

The requirement audit also finds that the UI adds three project controls but
its edit case removes the third before saving. Backend persistence previously
covered one and two interests, while only validation rejected four. The existing
manual-create/replay test is now parameterized for1/2/3 actual project commits,
checking every ordered name/position and matching immutable history. No product
code changes. Ruff check and format pass; the expanded database cases must be
executed after the active browser releases the lease. The full backend aggregate,
development-only case,12 cross-browser journeys and final audit remain open.

The4-case corrected/extra command is terminal2 passed/2 failed in4.0m. Both
extra current-source cases pass:dashboard actual200% with disposable-profile
cleanup, and exact derived-title display/list/private denial. File now passes
its real90-second fenced-lease recovery, clean bytes and EICAR/preview checks,
then fails at its archive-modal capture guard. That guard used an active role
query for the background notification button, correctly hidden by Radix modal
isolation. It now uses includeHidden for the authenticated-shell marker while
retaining absent password/private-credential checks; no modal behavior changes.

Work diagnostics identify two paired-fact H2 headings with charcoal rgb(39,39,39)
on an OKLab muted/40 background. Its regex incorrectly interpreted OKLab numbers
as0–255 RGB, producing1.404 instead of measuring painted colours. The helper now
uses canvas sRGB pixels and ancestor alpha composition, retaining the4.5:1
threshold, control sizes, overflow checks and safe no-record-text diagnostics.
No shipping colour/style/component changes. Fresh lint/direct types pass;
report audit5 JSON entries/4 step arrays/0 detailed arrays. Read-only discovery
selects exactly the two remaining native cases, now running in the normal guarded
compiled workflow. Broad coverage stays130/132 until those cases pass; remaining
backend, cross-browser, dev-only and final-audit gates are unchanged.

The corrected final native File/Work command is terminal, exit0:2 passed in2.8m.
This closes all132 distinct broad Chrome cases through the recorded57+19+33+8+
13+2 continuation sets; no single all-green full invocation is claimed. File
verifies real scanner outage/retry/clean/EICAR/exact bytes/private denial, modal
capture, mobile/touch/keyboard and actual200%. Work verifies retained task edits,
stale/interrupted recovery, inbox/reminders, roles, mobile/touch/keyboard/200%
and the unchanged4.5:1 threshold using painted-colour measurement. Report privacy
3 JSON entries/2 step arrays/0 detailed arrays. Read-only discovery finds zero
retained zoom/profile directories.

After that browser writer terminated, the expanded manual1/2/3-project database
cases pass3/3 in3.63s under the isolated lease, verifying actual commit/replay,
each ordered name/position, canonical client counts and matching immutable
history. The12 relevant compiled Lead/manual-deal/catalogue journeys across
Chromium, Edge, Firefox and WebKit are now running serially, with opt-in captures
disabled for non-CDP profiles. The separate dev-only case, current full backend
aggregate and final requirement/security/artifact audit remain open. No release,
real-data migration, commit, push or deployment is claimed.

The12-case cross-browser command is terminal, exit1:11 passed/1 failed3.4m.
Chromium/Edge/Firefox all pass; WebKit manual-deal and catalogue cases pass.
WebKit Lead completes every create/edit/profile/conversion/scope assertion but
its retained page-error check reports one opaque APPLICATION_PAGE_ERROR. That
handler now keeps every error while recording only safe exception name, React
numeric code when present, and ID-redacted route. No message/query/credential
text, ignored-error filter or shipping app change. Its isolated diagnostic rerun
passes1/1 in32.8s; the original cause is not established. Three serial repetitions
are now running to check recurrence rather than treating one rerun as a fix.
Report privacy4 JSON entries/12 step arrays/0 detailed arrays for the12-case run;
2 JSON entries/1 step array/0 detailed arrays for the isolated rerun. Dev-only,
current backend aggregate and final requirement audit remain open.

WebKit's repeated diagnostic did reproduce fetch-transport page events, while all
Lead business assertions still passed. Safe request diagnostics identify cancelled
metadata/development and newly opened deal-history/outcome/document fetches around
rapid full-page transitions. The bundled Playwright WebKit adapter converts
JavaScript-source error-level console messages to pageerror; its colon splitter
also drops a slash from a fetch URL, so the safe classifier repairs that only for
path extraction. No full message/query/credential is recorded and no event ignored.
Independent caught HTTP abort, HTTPS abort/navigation and HTTPS partial-body-abort
probes produce0 page/console errors, so simple cancellation alone is not claimed
as a general browser root cause or a production CORS defect.

The workflow case now proves complete visible states before leaving:Lead record
and saved profile have no loading statuses; both modal openings have an enabled
programme chooser before keyboard cancellation or external selection; converted
deal has its exact derived heading and settled panels. These strengthen the
requested view/conversion verification instead of omitting errors. With these
explicit UI-readiness assertions, WebKit passes3 serial repetitions in1.1m,
0 page errors; lint/direct types pass. Report2 JSON entries/3 empty step arrays.
The strengthened same Lead case is now running on Chromium/Edge/Firefox; prior
manual/catalogue passes remain unchanged. Dev-only/full backend/final audit remain.

The strengthened Lead journey also passes Chromium/Edge/Firefox3/3 in1.1m.
Together with WebKit's3 passing repetitions and unchanged manual/catalogue
passes on all4 engines, all12 distinct cross-browser cases now have current
passing evidence through the recorded commands. The initial11/1 and failed
diagnostic repetitions remain retained; no clean first invocation or general
WebKit transport/CORS root cause is invented. Reports each have2 JSON entries/
3 empty step arrays. The development-only shadcn/RHF/Zod/table loading, empty,
invalid, error-boundary and recovery case passes1/1 in45.9s on the separate
`.next-e2e` harness; report2 JSON entries/1 empty step array/0 detailed arrays.

The final stronger Lead case is now running on installed visible Chrome before
the current full backend aggregate. Fresh docs validation passes22 specs/1167
links/41 acceptance mappings/13 Mermaid pairs/12 JSON samples; repository audit
8250 indexed files/0 forbidden/14 ignore probes and diff check pass. The complete
backend aggregate and final requirement/security/artifact audit remain open.

The final installed visible Chrome stronger Lead confirmation passes1/1 in27.8s.
The planned browser scope now has passing evidence through the recorded commands:
132 distinct broad Chrome cases,12 cross-browser core journeys plus repeated
WebKit diagnosis, and the separate development-only component case. The earlier
failures and corrected reruns are retained, not relabeled as a single clean full
invocation. Latest report2 JSON entries/1 empty step array/0 detailed arrays;
read-only zoom/profile directory discovery returns0.

With all browser writers terminal, the current full backend aggregate is now
running under its normal exclusive isolated test lease, including coverage:
`.venv/Scripts/python.exe -m pytest -q --tb=short --maxfail=3 --cov=app
--cov-report=term:skip-covered` from backend/. Its terminal result is not yet
claimed. The new1/2/3 persistence cases have a separate3/3 scoped pass. Full
requirement-by-requirement completion plus final security/artifact/source audit
still remain; the goal is active and no hosted rollout or production action is
authorized by this checkpoint.

## Requirement-by-requirement source/layout audit (2026-10-17)

The original request is rechecked against the current reference and target, not
only against test counts. Read-only catalogue comparison finds20 reference and20
KAY campaign keys, no missing/extra key after the explicit WhatsApp identity
mapping, and all five budget bands exactly matching both reference forms.
Reference conversion source still requires project, budget and buying reasons;
current KAY strict bodies and the actual versioned route enforce those facts.

Current-source proof was inspected at contacts/contracts.py, projections.py and
qualification.py; deals/contracts.py, commands.py, conversion.py, qualification.py,
project_models.py and router.py; and the corresponding frontend qualification
controls, Lead create/editor/list/record, manual create/form/list/history and
conversion/project picker. Name/selected calling code/countries/multiple languages
remain canonical client facts; project interests remain distinct from inventory
holds. Commands lock agency/current identity, reauthorize receipt replay, commit
qualified records and actor history atomically, and reject free-title/old enquiry
creation bypass. Converted Lead UI is read-only with its linked deal; original
legacy facts/history are not fabricated or deleted.

The current20-frame final layout set remains the bounded visual evidence. Main
reopens Lead list desktop, manual Deal create desktop, Lead create390px and
three-project Deal edit desktop during this final audit. They confirm compact
available-width content, readable rich columns, paired desktop fields, stacked
mobile controls and balanced additional-project rows using KAY's existing visual
system. The previously inspected detail/history pairs and current native/browser
checks supply the other surfaces and actual interactions. No new aesthetic-only
fix, detector run, token, dependency or reference-repository edit follows this
confirmation. AFTER024 still has0 new numbered findings; its reviewer/documenter
scope and wider product-review/design-format limits remain separate.

The acceptance matrix now distinguishes current verified source/browser/scoped SQL
evidence from the still-running complete backend aggregate. Its live handle has
continued producing passing progress after the source audit; no terminal result
is inferred from elapsed time. The post-run privacy/generated-artifact/ignore and
source-diff checks remain before the final completion decision. No new functional
implementation gap was identified by this audit, and no production action is
part of its completion boundary.

## Final completion audit (2026-10-17)

The full backend aggregate is terminal, exit0, not a wait or inferred result:
from `backend/`, `.venv/Scripts/python.exe -m pytest -q --tb=short --maxfail=3
--cov=app --cov-report=term:skip-covered` reports **775 passed in975.95s (16:15)**.
Configured application coverage is94% (9115 statements,592 missed). Existing
coverage exclusions still omit CLI modules; this is not a claim of full-code
coverage. Final independent Ruff check/format, mypy and pip checks pass:
317 formatted files,182 source modules and no broken installed requirements.

The browser gate has passing evidence for132 distinct broad compiled visible
Chrome cases through57+19+33+8+13+2 continuation sets, not one all-green full
invocation. The12 distinct cross-browser core journeys are Lead qualification/
conversion, manual Deal create/edit and catalogue interest/conversion across
Chromium, Edge, Firefox and WebKit. Their initial11-pass/1-failure result and
diagnostic failures remain above. The stronger current Lead case passes the
other3 profiles3/3, WebKit3 serial repetitions and final installed visible
Chrome1/1 (27.8s); the unchanged manual/catalogue cases passed all4 profiles.
Every page error remains fatal. The separate development-only component case
passes1/1 in45.9s on `.next-e2e`; the compiled production build is preserved.

Final frontend lint, direct nonincremental TypeScript,45 unit tests and security
checks pass. Semantic-icon checks cover43 icons/30 consumers/138 sites and report
0 violations; button checks cover296 buttons/96 files and report0 violations.
The dependency audit finds0 runtime vulnerabilities and retains9 existing
development-only findings under approved exception `GHSA-vfj7-8cjw-p6xm`, expiring
2026-11-15T00:00:00Z. It is not a clean full dependency audit. No package or lock
file was changed for this work.

With all writers terminal, a fresh inspection acquires the usual isolated-test
lease and explicitly verifies a READ ONLY transaction. It finds revision
`0024_deal_qualification_history` and0 users, contacts, leads, deals, jobs and
outbox rows. It neither cleans data nor inspects/migrates production. Migrations
0023/0024 are included and exercised with synthetic populated historical facts;
real-data rollout remains an explicitly authorized future operation.

Final artifact inspection examines4 client roots/395 JavaScript files and finds
0 matches for either configured facade or signing secret. The latest browser
report has2 JSON entries,1 empty step array and0 detailed arrays. There are0
retained test-owned zoom/profile directories and0 listeners on3100/8100/8101/8001.
All10 checked private/runtime/generated/report/coverage paths are ignored. No
user browser profile, pre-existing `.playwright-cli` directory or unrelated
login/project-permission work was removed. The repository check remains an
indexed-file check, not a certification of every untracked file.

The current source/reference comparison, actual conversion/manual persistence,
canonical identity/history/privacy/stock safeguards, full frontend surfaces and
20-frame final visual set satisfy each original requirement in the matrix. The
KAY palette/shared system and compact paired-desktop/stacked-mobile compositions
are retained. AFTER024 has0 new numbered findings; its bounded review does not
claim global design-format cleanup or human product approval. No new full-volume
load claim, real-data migration, commit, push or hosted deployment is part of
this local completion.

Final documentation/repository checks after closing the acceptance matrix pass:
`powershell -NoProfile -File docs/03-planning/validate-sprints.ps1 -RepositoryOnly`
reports22 sprint specifications,1167 local links/anchors,41 unique acceptance
mappings,13 synchronized Mermaid pairs and12 valid API JSON examples.
`node .github/scripts/repository-check.mjs` reports8250 indexed files,0 forbidden
or oversized files and14 ignore probes; `git diff --check` passes. The privacy
scan was first invoked from frontend/ despite its root-relative paths and exited
with ENOENT before scanning; rerunning the same command from the repository root
passes with the4-root/395-file/0-secret-match result above. The independent
coverage report still reads94%, latest browser `.last-run.json` is passed with
no failed tests, all10 explicit ignore paths pass, and the final test-port/profile
counts remain0. Both bounded review agents are terminal; no remaining worker,
browser or verification process is being treated as a completed result by timeout.

All requested local implementation, verification and documentation work is
complete. Product review, explicit real-data migration and hosted deployment are
handoff actions, not unfinished parts of this code-change objective.
