# Lead and Deal activity histories

2026-10-18. Status: scoped implementation and technical checks passed;
development migration0025 approved/applied; product review pending.

Owner request: record notes/interactions in a Lead history, preserve that history
when converting, and show it separately from the Deal's own activity history.
The supplied images are layout references only; no client details are imported.
This extends C05/C08/C13 using the existing append-only contact timeline, current
contact scope and explicit Lead-to-Deal relationship. Port8000 is excluded.

## Acceptance

- Separate numbered, filterable activity tables on Leads and Deals, with date,
  type, duration, direction, projects discussed, notes and true author.
- Manual notes append immutably to exactly one explicit Lead or Deal. Conversion
  neither copies nor relabels Lead events; the Deal shows its exact origin Lead
  in a separate read-only table, not every Lead belonging to the same contact.
- Existing contact-only notes stay contact-only; unknown historical context is
  not invented. Existing Deal version/proposal/outcome history remains.
- Current scope controls read, append and same-key replay. Archived contacts are
  not writable; private/missing IDs deny without disclosure. Concurrent/retried
  commands append one event/receipt per successful intent, with atomic rollback.
- Additive migration preserves old rows, authors, times and immutability. Tests
  cover schema constraints, preservation, conversion, merge, authorization,
  invalid bodies/query, concurrency, rollback and response-loss retry.
- Real PostgreSQL tests and real-stack visible Chrome, desktop/mobile/keyboard/
  zoom/state checks; lint/typecheck/build and scoped security/privacy evidence.

## Implementation proposals within the existing contracts

Optional duration is whole minutes (1–1440); direction is inbound/outbound.
Projects discussed are up to3 immutable historical text labels (160 characters
each), not new inventory records or privileged project/contact links. New entries
use the authoritative server timestamp; no backdating, editing or deleting
history is added. Manual entries do not send a message or schedule a visit.
The existing Contact timeline remains compatible. The same existing task/visit
and Deal business rules remain authoritative; no screenshot stage or destructive
control is imported as a new business decision.

The UI reuses KAY Riviera, shadcn/Tailwind, the existing table/form/dialog/page
components and typed Iconsax. Design-system-ops and responsive guidance govern
geometry; Impeccable Operate preserves the current world. Dense CRM tables/forms
are outside design-taste-frontend's marketing workflow. Antislop remains AFTER;
no unrelated audit-only fix, palette, chart, dependency or image is introduced.

Migrations and data-writing tests use the explicit backend/.venv and isolated
PostgreSQL guard/serial lease. No production access, real-data import, external
send, commit or deployment. Applying to populated development is assessed only
after isolated migration and regression evidence; existing revisions are never
silently stamped or destructively downgraded.

## Implemented boundary

`app/activities` reads/appends the existing immutable `timeline_event` through
current parent scope. Revision0025 adds three metadata columns, SQL bounds,
context/contact guard and two indexes; it neither copies nor backfills history.
The existing agency/current-identity lock and receipt transaction serialize
retries, with an audit event in the same commit. Lead and Deal automatic status
changes now keep their from/to text in their new timeline entry; old entries
are not rewritten. Existing version history remains authoritative.

The frontend has a strict allowlisted server facade and a shared activity table
plus inline form. Separate queries/page/filter state keep Lead origin and Deal
activities apart. A committed-but-lost-response retry retains the exact key/body.
Data is rendered as text, not HTML. The response cap is4MiB to accommodate a
bounded100-row page even with JSON-escaped user text; no unbounded response is
introduced. Contact-only historical notes remain available on the Contact tab,
not guessed into an enquiry or deal.

### UI decisions and skills

Reading this as: existing French operational CRM for KAY staff, in the supplied
Riviera world, ENERGY1/RHYTHM1/MOTION1. Existing Fraunces headings, Manrope UI,
warm surfaces and honey creation actions retain the owner's brand rather than
copying the example CRM's typography or client content. No new token, CSS,
dependency, chart or shipping raster is needed.

| Reference observation | Role / existing system | Action |
|---|---|---|
| Wide note histories, separate origin | Full-width record section, existing record-stack and shadcn DataTable | Reuse; no new sidebar or narrow rail |
| Add activity above the table | Iconsax creation Button and inline form | Reuse; focused textarea without a modal |
| Columns and long notes | Existing min-w-table-text and named ScrollableResultsTable | Reuse; wrap text, scroll only the table |
| Filter, total and latest activity | NativeSelect, NumberedPages, current API metadata | Reuse; no illustrative counts |
| Compact form geometry | gap2/4, p4, md three-column grids,48px fields/44px actions | Reuse; single-column mobile |

Main agent read antislop, design-system-ops and its four geometry references,
design-taste-frontend, responsive, Impeccable Operate/craft-floor, uncodixfy,
React and Playwright guidance. Design-taste's marketing/asset workflow excludes
this dense product table/form; KAY's existing design system wins. Antislop
remains AFTER: [audit029](../../anti-slop/audit-029-2026-10-18.md) records the
finished slice, with no audit-only changes. Surface context was inspected;
its historical black/system-font/256px notes do not override newer Riviera and
reference-fidelity authority. No global metadata drift was silently repaired.

## Actual verification

All Python commands below use `backend/.venv/Scripts/python.exe` from backend,
`APP_ENVIRONMENT=test`; database writers and browser fixtures ran serially.

| Command / case | Observed result |
|---|---|
| `-m pytest tests/test_scoped_activities.py -q --tb=short` | Final22 passed35.41s: metadata, conversion, current-scope/replay/archive, missing origin, merge, HTTP/CSRF/query guards, spoofing/NUL, SQL immutability/context, concurrency/rollback and populated migration preservation/refused downgrade/drift |
| `-m pytest tests/test_lead_conversion.py tests/test_qualification_history.py tests/test_ownership.py tests/test_isolation_migrations.py tests/test_reports.py -q --tb=short` |55 passed94.40s; final distinct PostgreSQL coverage77 cases, not the full backend suite |
| scoped `-m mypy app/activities app/contacts/history.py app/contacts/history_models.py app/deals/history.py` | Pass,7 source files |
| scoped Ruff including migration/new tests | Pass |
| frontend `npx.cmd tsc --noEmit`, `npm.cmd run lint`, `npm.cmd run test:unit` | Pass;53/53 units; icon/button inventory0 violations |
| frontend `KAY_UI_CHECKS=1 npm.cmd run build` | Pass, separate.next-e2e output; live.next dev chunks untouched |
| `PLAYWRIGHT_BASE_URL=https://localhost:3100 npm.cmd run test:chrome -- tests/e2e/scoped-activities.spec.ts tests/e2e/record-facts.spec.ts --grep 'activities:|native 200%'` | Final4/4 passed1.2m, visible installed Chrome against real HTTPS API/isolated PostgreSQL |

Click-through: Add activity opens/focuses the inline form; type/duration/sense/
project/note fields save real metadata; Cancel returns focus; conversion preserves
the exact original DTO/IDs; Deal note appears only in own history; filters show
matching/empty rows;22 notes paginate20+2; Previous returns; refresh and503 Retry
recover; invalid required input stays; lost POST response retries one committed
entry with the same key; outsider read/write404; archived manager read has no
Add action. Literal script text is displayed without execution.

Six settled geometry measurements at320/390/768/1024/1440/1600px report no page
overflow,0 undersized measured controls and minimum sampled contrast5.6407:1.
Actual Chrome200% zoom reflows both records; keyboard/focus, native touch and
keyboard horizontal table scrolling pass. No pageerror in the activity journey.
First batched inspection opened four native captures; final confirmation opened
Lead/Deal/origin desktop and mobile table/form captures, plus the archived state.
All live under ignored `frontend/output/playwright/scoped-activities/`; the final
geometry JSON is there. This is scoped browser evidence, not physical-device,
all-browser/full-CRM or Khalid's design acceptance.

One detector invocation used incorrect cwd-prefixed paths and inspected nothing;
it is not a pass. The corrected four-target invocation inspected the actual UI
sources and returned `[]`. No visual source change followed confirmation.

### Retained initial failures and operational boundary

The first isolated upgrade was issued before checking the preview's held lease;
it was additive and succeeded, but the subsequent17 tests all stopped at the
exclusive-run guard without fixture cleanup. The guard was not bypassed. After
Khalid approved stopping/restarting the test server, its exact supervisor tree
was stopped; migration round-trip and writing suites then ran under pytest's
normal lease. [Lesson](../AGENT_LESSONS.md) records the coordination correction.

Initial scope-test expectations incorrectly assumed a contact transfer also
assigned the now-unassigned Lead. The test now explicitly reassigns it under
the existing contract. Fresh archived appends return a clear409. Final22 pass.
The first expanded pytest command used nonexistent test_reporting.py and ran
no tests; the corrected test_reports.py command passed55. Initial browser
fixtures omitted strict contact fields and then used a selector matching both
saved/loading status; the fixture and specific-status assertion were corrected,
without weakening application guards. Final complete4-case command passes.

The later explicit approval applied revision0025 locally. Reflected original-column
fingerprints across69 tables match before/after; no original row was changed.
The subsequent account task separately applied approved0026. No production access/import, real record rewrite, seed, deployment,
commit or publication. The existing frontend3100 remains; the isolated backend
and supervisor8100/8101 were restarted. Port8000 and its unrelated process were
not stopped or changed. Normal test fixtures are synthetic and cleaned by their
guarded teardown; the restarted supervisor retains its isolation lease.

Final read-only isolated inspection through the actual ORM table mappings finds
0 users, contacts, enquiries, deals and timeline entries. An earlier diagnostic
used an incorrect guessed table name and made no change; the mapped inspection
above is the verified result. Final client privacy scan checks4 roots/540 JS
with0 configured facade/signing-secret matches; the final report contains3 JSON
entries/4 empty result-step arrays/0 detailed arrays. Documentation validation
passes22 sprints,1283 links,41 acceptance mappings,13 diagrams and12 API examples
before the final evidence links were added; the final invocation is recorded
in the QA register. Scoped source `git diff --check` passes.
