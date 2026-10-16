# SP-07 execution evidence

Status: technically_accepted; scoped local implementation/exit gates passed. Product/design review: pending Khalid.
Date: 2026-10-15.

## Focused E2E defined before implementation

Using only synthetic accounts and the leased, isolated PostgreSQL test database:
sign in as manager, open Projects → Biens indépendants, save a standalone apartment
with unknown facts, add two legal owners through the protected contact selector,
create separate sale and monthly rental drafts, reject availability without a
positive price/owner, supply valid facts and confirm availability. Read the asset
as an unrelated agent: safe marketing facts and original `1234.56 MAD/month`
with exact `14814.72 MAD/year` are visible, private contact identities are not.
The agent cannot see edit controls and direct writes fail. Withdraw a campaign,
create its replacement without losing the old price/conditions/history, and verify
idempotent retries, current-version conflicts and interrupted acknowledgement.
Repeat category coverage for villa, house, apartment and land (including land rent).
Visible isolated Chrome checks desktop/mobile, keyboard/touch, real 200% zoom,
loading/empty/error/denied states, no-attachment truthfulness and console errors.

## Scope and implementation proposals

- Only standalone physical assets and draft/available/withdrawn campaigns. No
  hierarchy, stock templates, reservation/disposition or attachment transfer.
- Proposal: additive `0007_standalone_inventory`, five typed tables (property,
  legal owner links, offering, immutable inventory events, command receipts).
  Aggregate property versions plus offering versions prevent lost updates; receipts
  contain result identifiers, not cached private owner data.
- Proposal: currency MAD; nullable draft price/area, bounded decimal strings,
  numeric storage, no floating point; current uniqueness enforced by PostgreSQL.
- Legal owner links preserve immutable original-contact provenance through the
  existing contact merge service. Marketing display is explicitly entered and is
  never copied from a private contact name. Inventory grants no contact scope.
- Technical input bounds are validation safeguards, not new business decisions.

### Implementation map

- Backend entry/authority: [inventory routes](../../../backend/app/inventory/router.py),
  [versioned commands](../../../backend/app/inventory/commands.py),
  [scoped read projections](../../../backend/app/inventory/queries.py), and
  [contact-merge adapter](../../../backend/app/inventory/contact_links.py).
- Reviewed schema: [0007 standalone inventory](../../../backend/alembic/versions/0007_standalone_inventory.py)
  and [0008 finite amounts](../../../backend/alembic/versions/0008_inventory_finite_amounts.py).
- French UI: [directory](../../../frontend/src/features/inventory/property-directory.tsx),
  [record and campaign tabs](../../../frontend/src/features/inventory/property-record.tsx),
  [wire contracts](../../../frontend/src/features/inventory/contracts.ts), and
  [allowlisted facade](../../../frontend/src/features/inventory/facade.ts).
- Executable evidence: [domain/API/race tests](../../../backend/tests/test_inventory.py),
  [edge cases](../../../backend/tests/test_inventory_edges.py),
  [populated migration test](../../../backend/tests/test_inventory_migration.py),
  [real-stack browser tests](../../../frontend/tests/e2e/inventory.spec.ts), and
  [visible Chrome review](../../../frontend/tests/review/inventory.chrome.spec.ts).
- Shared changes preserve existing contacts merge/impact, audit registration,
  auth return paths/session controls, literal query handling, strict facade
  method bounds and synthetic fixture cleanup/context switching. No dependency
  lock, real account, production configuration or later product module is added.

## UI skill applicability and design read

Main agent read antislop, design-system-ops (and four references) and
design-taste-frontend completely before implementation. Existing Khalid AFTER
choice is preserved; no onboarding wizard or aesthetic corrections selected.
Also using the applicable React performance, uncodixfy, copywriting and Playwright
guidance. Sprint explicitly requests test files, so the existing Playwright Test
harness is appropriate. No new component/chart library is proposed.

KAY is a French operational CRM: calm, legible inventory tables and small focused
forms for staff, not a marketing site. Energy/rhythm/motion: 1/1/1. Preserve
the charcoal/gold/light token system, existing shadcn controls, shared TanStack
table and Tailwind geometry. Reuse existing shell/header/status/error/pagination
and protected contact selector. No charts: Bklit N/A. Design-taste marketing
heroes, imagery, randomized layout and motion defaults are excluded for this
dashboard/table/admin/form surface. AFTER audit will follow completed UI work;
numbered aesthetic findings require Khalid's selection, not automatic fixes.

Installed Next 16.4 routing/route-handler documentation and RHF 7.90 README were
inspected. The official RHF getting-started URL returned 403; installed reference
is the fallback. Official TanStack v8 and SQLAlchemy 2.1 session references checked.

## Entry evidence

SP-06 technical acceptance recorded separately in `sp-06-evidence.md`; no product
approval inferred. Read-only `.venv/Scripts/python.exe -m app.cli.inspect_database`
in backend: development `kayrealestate`, OID109060, cluster7607060034405909976,
17 tables, revision0006_ownership_scope_guard; unrelated-catalog SHA256
`4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`.
No development records were changed. No SP-07 test/build/migration claimed yet.

## Results so far (not final acceptance)

- First focused backend run:18 passed17.40s. Expanded complete run:
  `.venv/Scripts/python.exe -m pytest --cov=app -q --tb=short -x`,147 passed,
  zero skipped,193.99s,97% coverage. Subsequent boundary/filter/read-snapshot
  changes and additional edge tests still require a final rerun.
- Ruff/mypy passed after formatting:80 Python files,51 app modules. Frontend
  `npm run typecheck` and `npm run lint` exit0; later pending-state correction
  still needs final checks. No new dependency installed.
- Both resolved databases now have22 tables, revision0007_standalone_inventory.
  `alembic check` found no new upgrade operations; unrelated development catalog
  hash unchanged. Development was additively migrated, not reset or populated.
  Replaced the old development API process and verified `.venv/Scripts/python.exe
  -m app.cli.smoke`: explicit CA/live/ready/direct denial/no-store/untrusted CA pass.
- Browser attempts are retained as failures, not passing evidence: first test
  timed out180s; narrower run45.0s and clean run43.8s localized detached rental
  form after owner save. Initial live-refresh suspicion was disproved by the
  source-frozen rerun. Actual cause: old success notice allowed fast progression
  while an owner command was pending; its eventual refresh removed the new form.
  Correction clears stale notices at command start and disables the aggregate
  record fieldset during every inventory mutation. Rerun is in progress.
- Input safeguards:128KiB bounded inventory request and2MiB bounded facade
  response accommodate100 permitted Unicode owners/full history events. Earlier
  contact/auth bounds stay unchanged. Reads use a consistent read-only snapshot.

Build, final regressions, visible browser review, privacy/security completion and
AFTER audit remain pending. No acceptance or Khalid product approval claimed.

## Verification continuation

- The aggregate-pending correction passed a held real committed response test:
  controls disabled and old success absent until acknowledgement. The complete
  manager→unrelated-agent→owner flow passed26.7s, including direct403, private
  owner IDs absent, both available campaigns, withdrawal/replacement and history.
- Later failures were test correctness, not additional business-success claims:
  switching an already authenticated synthetic context without clearing its
  cookie redirected away from login; a deliberately denied PATCH omitted required
  facade nullable fields and got422 before authorization; global alert lookup
  collided with Next's route announcer. Corrected context switching, valid probe
  bodies and scoped alert assertions. The remaining three Chrome E2E passed46.0s:
  all categories/draft/price validation, lost acknowledgement/real API outage,
  version comparison/draft retention and revoked role. Final combined runs pending.
- Updated complete backend run149/149 passed173.43s,97% coverage,zero skipped.
  Read-only runtime probe then proved numeric NaN satisfies `>0` in PostgreSQL.
  Added separate0008 finite checks rather than rewriting applied0007. Focused
  inventory/migration run24/24 passed28.68s; expanded final suite is running.
  Both OIDs/cluster/catalog hash unchanged,22 tables,head0008; Alembic check clean.
- `npm run build` passed:ID `wX-fws19-nPsoXOsz5Uph`,20 displayed routes (including
  four new Projects routes). Final strict types/lint passed. Runtime audit0;
  full npm audit still9 HIGH dev-only inherited entries. Both Python hash-lock
  audits and pip check passed. Interim client scan217JS/0 configured secret.

## Security boundary record

Task: SP-07; C04/C11/C13/C14, BR06/08/09/25. Read project scope, permissions,
workflows, API/data/architecture and security contracts/checklist. Inspected
facade/session/CSRF boundaries, inventory projections/commands/models, contact
merge preview/policy, migration DDL and guarded fixture cleanup.

Allowed M/A mutation and all-staff safe reads are exercised; agents cannot choose
owner contact IDs through inventory search or receive private names/coordinates/
origin links. Separate live contact collaboration/archive scope controls identities.
Marketing text is explicit, never copied from private contact identity. Inventory
retries return typed identifiers only and recheck current write authority. Real
waiting role revocation, independent current-offering races, strict malformed /
overlarge inputs, API direct denial, stale versions/preview links and interrupted
transaction rollback are covered. No arbitrary field/route/header proxy is added.

Legal-owner contact merges preserve true origin/creator/time, archive collisions,
retain survivor display and do not union staff access. Private merge reason/name
is not copied to shared inventory history. Aggregate versions advance on merge.
History, metadata-only audit and24h receipt commit together. API uses decimal
strings; numeric storage and explicit finite checks protect prices/area snapshots.
Local agency-first serialization is deliberate correctness, not a load-test claim.

Files, imports/exports, reservations/outcomes, other finance, website intake,
workers, backup/recovery and deployment remain outside this slice. No real data,
external message, default account, public file URL, JWT or broker is introduced.
Final privacy/report checks and complete security acceptance remain pending below.

## Final-backend and visual evidence

Complete `.venv/Scripts/python.exe -m pytest --cov=app -q --tb=short -x`:
150/150 passed,zero skipped,180.43s,97% coverage. Ruff/format82 files and strict
mypy51 app modules pass. Both targets are head0008;22 tables; separate identities
and unrelated-development catalog hash preserved. No development records seeded.

Visible Chrome155.0.8059.79 scoped run passes34.8s (46.0s including harness).
The earlier two-case corrected review plus punctuation-search check passed55.7s.
Client path traversal rejection now applies to pathname, not literal `..` in a
query; a real inventory search regression covers that shared-client correction.
The final optimized build passes,ID `eQL7SNEPHMbT_PfeujskE`,20 displayed routes.

Visual diagnostics were not silently accepted: a one-request GET abort was
consumed by React's development retry; the error probe now holds all real reads
failed until explicit recovery. A screenshot taken before hydration caused a
caret-style mismatch; captures wait for ready UI. Full-page capture cropped the
15px scrollbar width, falsely suggesting mobile clipping. Live ancestor bounds
proved correct gutters (320px:inputx16/right289,client305;360px:x16/right329,
client345). Native full-page capture also temporarily changed layout metrics;
that attempt was rejected. Final evidence uses native unmodified viewport
captures of scrolled sections, asserting client width stays unchanged. A temporary
capture-helper name collision failed type/lint/build and browser checks; renamed
the local variable, then all quality checks and the native review pass. No UI
layout/aesthetic rewrite was made on the basis of an artifact defect.

Review covers320/360/768/1024/1440,44px controls, long unbroken owner names,
keyboard tabs, touch owner/campaign cancellation, safe agent reads/denied edit,
loading/empty/error/retry, both campaigns, history and truthful no-file state.
Real200% uses disposable Chrome profile: DPR2→4,width1427→713,overflowfalse;
editing succeeds at200%; direct2854×1702 viewport capture. Profiles are closed
and removed only after explicit task-directory containment checks.

Contrast computed from existing tokens: success/canvas5.81:1,muted/canvas6.11,
danger/canvas7.29,link/canvas6.13. Existing primary/body/focus/outline pairs stay
unchanged. Status meaning is textual, not color-only. No chart/Bklit N/A.

The full180-case five-browser regression has started; final cumulative headed
Chrome, built-server smoke, AFTER audit/document reconciliation and guarded
synthetic cleanup are still pending. Product/design review remains pending Khalid.

Final quality rerun after the capture-readiness assertion: `npm run typecheck`,
`npm run lint` and `npm run build` pass. Current production build is
`1IqvRtnHVS4qBFlnBMzCa` (20 displayed routes,21 app-path entries). No application
source changed during the full regression run. Chromium/Chrome/Edge/Firefox have
completed their36 cases each; WebKit is in progress,150/180 cumulatively passed
as of2026-10-15 01:57:54UTC. This checkpoint is not final browser acceptance.
[AFTER audit007](../../../anti-slop/audit-007-2026-10-15.md) records0 HIGH/0 MEDIUM/
0 LOW; earlier optional findings remain unselected. Product/design review pending.

## Final regression correction

The complete five-target run stopped honestly at156 passed/1 failed/23 not run
(34.5m): all36 cases passed on Chromium,Chrome,Edge andFirefox; WebKit passed12
then failed the new literal-punctuation directory search. The inventory filter
form lacked the hydration readiness guard already used by LeadList. SSR controls
could accept input before React attached, losing the search on fast navigation.
Reused `useHydrated` and a disabled native fieldset; no timing delay or aesthetic
change. The regression now also asserts retained input, real q=`..` API200 and
total0, not only a possibly stale count. Focused WebKit rerun passes20.8s
(31.3s including harness). Lint and strict typecheck pass after this correction.
The complete WebKit suite and all changed SP07/shell cases on the other four
targets are being rerun; unaffected earlier cases retain their successful result.
Final headed Chrome and optimized-server smoke remain required.

Optimized build after the readiness correction passes,ID
`BnBqyTzt-P3QfsNvHmDvH`,20 displayed routes/21 app-path entries. Separate
`.next-e2e` development output prevents this build from disturbing browser tests.

The broader WebKit rerun stopped at3 passed/1 failed/32 not run on the earlier
Projects/logout permission case; it passed unchanged alone (17.0s). Investigation
did not dismiss it as flakiness: a new held-real-response case proves that a
pending inventory read can return401 after logout revokes the session, causing
the global expiry listener to navigate to `login?return_to=projects` before the
held successful logout response arrives. The deterministic pre-fix case fails
with that exact wrong navigation. Added browser-local logout intent so expiry
redirects wait for deliberate logout; intent resets on failure, including an
already-invalid session. Backend authority/cookie/session behavior is unchanged.
This functional preservation fix requires fresh cumulative browser verification.

Corrected original WebKit case and deterministic late-denial case both pass
(16.2s/7.3s;34.0s harness total). Added failure-path coverage: abort only the real
logout transport, observe the existing French failure, revoke the actual session,
then submit an inventory filter and require the ordinary expiry redirect401.
An initial test used a guessed French error substring; corrected it to the real
shared message. Also corrected an unused callback parameter caught by zero-warning
lint. No production copy or timeout was changed to satisfy these assertions.
Final application build after the logout correction is `PLmPxxeNkkGcFrn5eTJFr`,
20 displayed routes/21 app paths; lint/typecheck/build pass. Final matrix now has
38 cases per target (190), with the two additional logout-order/failure regressions.

The next complete matrix attempt stopped at59 passed/1 failed/130 not run
(10.0m). Chromium completed38/38; Chrome's manager Lead-assignment actor switch
hit `net::ERR_ABORTED` when navigating to login after clearing cookies. The old
actor page still had live reads/SessionMonitor, whose legitimate401 redirect
could race that test-only credential switch. Added shared `clearActorContext`:
detach all pages in that disposable context to about:blank before clearing its
cookies; all existing explicit actor-switch sites now reuse it. No application
code, product authorization or timeout changed. The unchanged production build
remains `PLmPxxeNkkGcFrn5eTJFr`. Affected Chrome assignment cases are rerunning.

Both corrected Chrome manager/administrator assignment cases pass13.9s/9.7s
(35.0s harness total). Lint/typecheck pass after the shared fixture correction.
Fresh unfiltered `npm run test:e2e` starts190 cases on frozen application source;
no failure or skipped check is converted into acceptance by this checkpoint.

## Final cumulative results

`npm run test:e2e` on frozen application source and corrected fixture lifecycle:
190/190 passed,zero skipped,42.1m,completed2026-10-15 03:06:15UTC. Each target
(Chromium,Chrome,Edge,Firefox,WebKit) passes38 cases, including all seven SP07
cases and every earlier accepted identity/staff/contact/ownership/shell workflow.
The earlier failed attempts remain above as defect evidence, not passing gates.
Production build remains `PLmPxxeNkkGcFrn5eTJFr`. Headed review, built-server
smoke and final guarded cleanup/document reconciliation remain pending.

Full-matrix report privacy check passes:9 JSON entries,190 result step arrays,
zero detailed input-bearing arrays. Latest development API was restarted from
the explicit venv; HTTPS smoke again passes explicit CA/live/ready/direct denial/
no-store/untrusted-CA refusal. Browser supervisor remains isolated on8100/3100.

Full headed Chrome run:43 passed/1 failed,zero skipped,9.0m. All functional and
earlier visual reviews passed; SP07's loading capture asserted client width1440
then observed1425 after capture. The capture itself shows loading, followed by a
real response changing content/scrollbar width. Its one-request gate could be
consumed by the development retry, as previously observed for error probes.
Hold all matching real reads through loading capture, then release and remove
that route handler before error/recovery checks. The unchanged application build
and190-case matrix remain valid; scoped corrected Chrome review is rerunning.
No screenshot was edited or treated as proof of an application layout defect.

Corrected scoped headed review passes36.8s (46.9s harness),zero skipped. Together
with the43 unchanged successful headed cases this covers all44 current cases;
the original full headed command is retained as43 passed/1 failed, not rewritten
as a clean single run. Corrected loading capture holds real retries; error/retry,
all15 refreshed captures, no application console/page errors and real200% edit
pass. Geometry stays305/345/753/1009/1425 client widths at320/360/768/1024/1440.
Actual zoom remainsDPR2→4,width1427→713,overflowfalse,2854×1702 direct viewport.
Scoped report privacy check:2 JSON entries,1 result array,0 detailed arrays.
Final optimized-server smoke is running on the unchanged production build.

Final optimized-server smoke passes31/31,zero skipped,4.9m on build
`PLmPxxeNkkGcFrn5eTJFr`,HTTPS3100/test API8100. KAY_E2E_PRODUCTION is restored
after the command. Main agent inspected all15 refreshed inventory captures;
AFTER007 remains0 HIGH/0 MEDIUM/0 LOW. Final test-source lint/typecheck pass.

Final report privacy:7 JSON entries,31 result step arrays,0 detailed arrays.
Client scan:4 static roots,223 JS,0 configured facade-secret occurrences.
Only .last-run.json remains in test-results; no failure/profile/trace/video.
Verified test ports3100/8100 closed before acquiring the test advisory lease and
running guarded clear_identity on the isolated target only. Final read-only
counts: all20 record tables0,bootstrapunset on both targets. Development was
inspected,never reset; synthetic test fixtures are reproducible from tests.
Both identities/OIDs/cluster remain unchanged,22 tables/head0008; unrelated
development catalog SHA256 remains the entry value. Alembic check again reports
no new operations. Latest API8000 and frontend3000 have been restarted.

Technical acceptance is limited to this sprint's named variants. Product/design
review,actual Safari/iPhone/assistive-technology users, later core modules and
full-product/load/recovery/production acceptance remain separate. Nine inherited
HIGH development-tool audit entries remain unresolved; runtime npm/Python audits
are clean. No forced downgrade,new dependency,real/default account or real-data
operation occurred. SP08 is not started. Final documentation validation follows.

Restored-stack smoke passes with the explicit CA: frontend3000 login200, protected
Projects login redirect, facade readiness200, anonymous inventory401/no-store.
The first ad-hoc probe incorrectly required an HTTP307; local Next16.4 documents
and the actual response confirm a streaming200/meta redirect here. Corrected the
probe, not application authorization; no private inventory UI is rendered. The
real browser redirect behavior also passes in the190-case matrix/built smoke.
After restored dev routes compile, the final client scan covers226 JS across4
roots with0 configured secrets (supersedes the earlier223-file count). Final
privacy report remains7 JSON/31 result arrays/0 detailed; private paths ignored,
0 private tracked files; only.last-run.json in test-results. No test profile or
failure/trace/video remains. Development/bootstrap counts were inspected before
this read-only smoke; no real/default user or asset was created.

Final documentation validator passes:1018 local file links/anchors including70
approved skill links;22 sprints,41 AT mappings,13 synchronized Mermaid pairs,
9 valid JSON examples. SP07 has22/22 checked task/acceptance/exit items and0
unchecked. API/data/architecture/screens,READMEs,sprint index,QA/security,
acceptance/traceability and lessons reflect the implemented boundary. This is a
documentation check,not an extra application test. Technical acceptance is
recorded2026-10-15; Khalid's product/design review remains pending.
