# SP-05 execution evidence

Status: technically_accepted for local SP-05; product/design review pending  
Date: 2026-10-14  
Product review: pending Khalid

## Task and focused E2E, defined before implementation

Implement C02/C11/C13/C14, BR-03/04/06/21/29 and the SP-05 portions of
AT-03/04/22/23/39. SP-04 is technically accepted. The inspected development
database was on 0003_user_administration at sprint entry, cluster 7607060034405909976,
OID 109060, unrelated catalogue SHA-256
4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945.
Only isolated synthetic fixtures may be cleaned. No real accounts or records.

Focused real-stack scenario: agent A creates a person with Moroccan and foreign
phones, primary phone/email, multiple contact roles and an enquiry; opens,
edits and finds that Lead through scoped search/status/source/date filters and
numbered pages; changes visible column IDs/order and reloads without persisting
record data. A second request with the accessible phone requires explicit reuse
and creates a separate enquiry, not another contact. Agent B's private phone
blocks creation and discloses only B's display name. Manager/admin can select an
active responsible agent; agents cannot assign another owner. Copied IDs, counts,
search, stale versions, restricted/revoked sessions and forged fields must fail
at the backend. Concurrent phone claims, interrupted atomic creation and same-key
retries must leave no partial identity or duplicate enquiry.

Required checks: explicit backend/.venv Ruff/format/mypy/pytest with real
PostgreSQL, isolated Alembic up/down/up, lint/typecheck/build, real-stack
Playwright, interacting headed isolated Chrome, desktop/mobile/keyboard/touch/
200% zoom and states; security/privacy checks and documentation validator.
Checks not yet executed are not passes. No SP-06 transfer/merge/timeline UI,
deal creation, imports, website connector, deployment or real-data work.

## Read-first and UI applicability

Read root/backend/frontend AGENTS, sprint/index/local roadmap, README, scope,
decisions, business rules, permissions, workflows, data/API/architecture/acceptance,
glossary, coding/repository rules, HARNESS, QA commands, agent lessons, security,
DESIGN, design system, screen map, component/styling and UI skill rules.
Read the installed antislop, design-system-ops (all four applicable references)
and design-taste-frontend completely. Antislop stays AFTER, no new timing or
bundle installation. Design-taste's section 13 excludes the dense Leads table,
contact selector and product forms; marketing layouts/assets/motion do not apply.
Additional guidance: responsive standards, uncodixfy, React best practices and
Playwright. The requested reproducible sprint tests use the existing test suite.
Impeccable is limited to Operate-mode extension of the established workspace;
its missing PRODUCT.md must not replace existing authoritative KAY contracts.

Design read: French operational Leads/contact workflow for KAY staff, preserving
the quiet white/ivory, charcoal, restrained gold system; ENERGY/RHYTHM/MOTION 1/1/1.
Geometry reuses shared shell, header, controls, table, dialogs, 16/24/32 gutters,
4/8 rhythm, 48px fields, 44px controls and readable form width. No charts needed.
The prior SP-04 LOW audit finding is unselected and remains untouched.

## Implementation proposals to verify

- Canonical E.164 via maintained phonenumbers; explicit +/00 international input,
  separators allowed, no guessed country or extensions. Max 10 phones/emails.
- Local manual source vocabulary: manual, phone, email, in_person, referral.
  Website provenance cannot be forged through staff commands. Received time and
  actor are server-owned; source/submission provenance is immutable on edit.
- Enquiry statuses new/in_progress/closed are local technical state codes, not
  deal stages. Dedicated assignment/merge/history actions remain SP-06.
- Actor/key/route retry receipts last 24h; replay rechecks current resource scope.
  Serialize local identity commands using the existing agency row before ordered
  user/contact locks; phone uniqueness remains independently database-enforced.
  This favors correctness at this stage, not a claim of load acceptance.

## Implemented slice

- Backend `app/contacts`: strict contracts, current-scope access, canonical
  phonenumbers, batched projections, repeatable-read lists, agency-first locked
  commands and ten explicit routes. NewContact/Enquiry atomic creation, full
  contact identity replacement with archived value provenance, enquiry
  message/status editing, safe duplicate/private/version errors, current-scope
  idempotency replay and source uniqueness. M/A assignment options expose only
  active staff-agent UUID/display name; agent ownership is server-owned.
- Migration `0004_contacts_enquiries`: seven business/context/retry tables,
  partial phone/primary uniqueness, retained provenance, typed contact/enquiry
  audit FKs, deferred collection and assignment guards. Shared ORM registry
  loads cross-module FK metadata in HTTP and standalone bootstrap entry points.
- Frontend `features/contacts` and five protected route files: French real list,
  contact directory/detail/inline edit, Lead create/detail/edit, shared phone/
  email/role form, explicit accessible reuse, private denial, recoverable draft
  and current-version choices. TanStack/shadcn columns Sheet stores only version,
  list ID and whitelisted visible-column IDs/order. No record/auth persistence.
- Existing facade catch-all now explicitly admits contacts/enquiries only for
  known methods, projects schemas, limits body32KiB/response512KiB for this module
  and retains TLS/Origin/CSRF/current session. Other limits remain unchanged.
- Test harness: shared session-level PostgreSQL advisory lease, acquired before
  synthetic cleanup and retained across API stop/start. Lost/unavailable lease
  fails closed. No product test endpoint or development fixture reset.
- Shared UI additions: pinned shadcn New York Checkbox/RadioGroup/Textarea using
  existing Radix/Lucide dependencies. FormControl can add help without losing
  the validation description. Table/DataTable optional scrollLabel focuses the
  actual overflow element; defaults preserve older tables. Semantic
  layoutPx.tableMinWidth896 / Tailwind spacing-table contain the intentionally
  wide configurable Leads table. No chart (Bklit N/A), new palette or kit.

## Verification record

Commands below run in frontend/ or backend/ as indicated. Backend executables
always use `.venv/Scripts/python.exe`, never global Python. Synthetic actors,
contacts and demands exist only in the verified isolated target.

| Check | Actual command / result |
|---|---|
| Backend lint/format/types | `-m ruff check .`; `-m ruff format --check .`; `-m mypy app`: exit0, 56 files formatted, 35 app modules, strict types. |
| Full backend regression | `-m pytest --cov=app -q --tb=short`: **100/100 passed, zero skipped, 110.07s, 98% runtime coverage**. Includes all earlier62, 31 contacts, six edges and lease guard. CLI excluded from coverage but exercised with real ConPTY. |
| Focused checks/corrections | Contacts31/31 (21.11s), edges6/6 (5.91s), standalone bootstrap14/14 (28.98s) after shared metadata correction. Final100 subsumes them. |
| Migration / database | Guarded isolated up/down/base/up through0004, metadata/unknown/unversioned/development-alias checks passed in full suite. Development/test at0004; `-m alembic check`: no new operations. No development downgrade/reset. |
| Concurrent/interrupt/retry | Real independent PostgreSQL transactions contend on one normalized phone; exactly one succeeds. Observed waiting-actor revocation and contact-version race, post-flush rollback, invalid assignee rollback, same-key replay/changed-body/source-UUID conflict and replay after scope loss pass. No mocked uniqueness or SQLite. |
| Test isolation | Deliberate second supervisor during pytest exited1 with fixed “in use or unavailable; no fixture cleanup performed” refusal. This is the expected guard result, not a failed product check. Clean100 run passed afterward. |
| Python dependency integrity | venv `-m pip check` passed; `-m pip_audit --no-deps --disable-pip -r requirements.lock` and dev lock both passed, no known vulnerabilities. phonenumbers9.0.41 is the only added runtime dependency, hash-pinned. |
| Frontend lint/types/build | `npm run lint`; `npm run typecheck`; `npm run build`: final accessibility-edit rerun all exit0. Build manifest includes16 routes (five new protected contact/Lead placements). |
| Browser regression | Full `npm run test:e2e`: **130/130 passed, zero skipped,25.9m**,26 per target (Chromium/Chrome/Edge/Firefox/WebKit). All earlier19 plus seven SP05 variants per browser. Earlier focused Chrome5/5 passed54.1s (SP05 outage plus shell regressions). |
| Visible Chrome | Full `npm run test:chrome`: **30/30 passed,zero skipped,5.6m**:26 functional cases plus four visual reviews. Includes current phone help/error association, actual ArrowRight scrolling, long picker, agent/M/A workflows, desktop/mobile and actual200% zoom. Earlier focused2/2 passed57.8s. Capture-only followups: zoom1/1 passed33.6s, mobile1/1 passed48.7s and final settled mobile1/1 passed49.4s. |
| Runtime dependency audit | `npm audit --omit=dev`: exit0, zero runtime findings. Full `npm audit --json`: exit1, nine HIGH inherited development-tree entries (GHSA-vfj7-8cjw-p6xm); not called clean or force-downgraded. |
| Production HTTPS/browser | After the final successful build, set KAY_E2E_PRODUCTION=1 and run `npm run test:e2e -- --project=chrome --grep 'SP05\|SP04\|protected redirect\|restricted change\|auth outage\|@shell'`, restoring the variable afterward: **19/19 passed, zero skipped, 3.3m**. Real HTTPS built app/API/PostgreSQL, not deployment. |
| Final privacy/security | Expanded four-root client scan: **203 JS files**, no configured facade secret and no value printed. HTML embedded ZIP:5 JSON entries, **19 result step arrays, zero detailed arrays**. test-results contains only .last-run.json; no profile, trace, video or failure context. Private paths ignored/not tracked. |
| Documentation | Sprint/backlog/QA/API/data/architecture/screens/reuse/traceability/lessons reconciled; final validator below. Product review remains pending. |

Database identity: development `kayrealestate`, cluster7607060034405909976 /
OID109060; test OID109061, distinct live identity. Development catalogue probe
before/after0004: unrelated SHA-256
`4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
unchanged; user_table_count8→15 is a table count, not account count. Only reviewed
DDL was applied; no real/default account or record was created.

Production build ID: `beKkysVJGb2_we9kOxpr0`, generated by the final successful
`next build` after UI corrections. Later edits affect tests/documentation only.

## Acceptance and state coverage

Executable versions verified from the actual installed manifests/venv:
Node24.13.1/npm11.8.0, Next16.4.0, React19.3.1, Tailwind4.3.3,
TypeScript5.9.3, Playwright1.64.1, RHF7.90.0, Zod4.6.7,
TanStack8.21.3, Radix1.8.1; Python3.14.3, FastAPI0.143.1,
SQLAlchemy2.1.4, Alembic1.20.0, Pydantic2.14.1, Argon2-cffi25.1.0,
Psycopg3.3.6, pytest9.1.1, Ruff0.17.0, mypy1.20.2,
phonenumbers9.0.41; PostgreSQL18.2. Frontend dependencies are unchanged.
Fresh isolated binary launches verify Chromium 156.0.8078.4,
Chrome 155.0.8059.79, Edge 155.0.4283.45, Firefox 157.0 and WebKit 27.2.
Native Windows WebKit reports SameSite=None for the actual Lax cookie: the
existing narrow reporting caveat is annotated, not skipped or used to weaken
cookie policy. All targets verify wire Secure/HttpOnly/SameSite=Lax/Path=/;
the four other engines verify Lax in the cookie API too. This is not Safari proof.

AT-03: maintained Morocco/international canonicalization, explicit +/00 prefix,
valid/invalid/missing phone/name, same name with different numbers, organizations,
all five independent contact roles, multiple primary phone/email choices, edit
and retained provenance. Collection validation also has direct PostgreSQL guards.

AT-04 SP05: normalized accessible duplicate requires deliberate cancel/reuse;
each confirmed enquiry remains separate. Any private requested phone takes
priority and reveals only responsible_agent.display_name; copied contact/Lead
IDs and search/count/page stay scoped. Merge belongs to SP06, not this pass.

AT-22/39 list portions: true scoped totals, literal search, status/source/agent/
Casablanca-date filters, stable tie-breaks, actual51-row next/previous/numbered
pages and filtered-empty; column visibility/reorder/reload persists no records.
Signed intake, imports/exports, deals and dashboard metrics remain future work.

AT-23 SP05: real-stack create/read/edit/find; validation/draft retention,
outage/loading/retry, missing/private404, expired/revoked/restricted proof,
manager/admin owner selection and unassigned queue, agent denial, explicit
duplicate modal focus/cancel/Escape, columns focus return, touch, long French
text,320/360/768/1024/1440 and actual200% zoom. Full headed30 and supplemental
checks pass; production/privacy/reviewer gates are recorded below as passed.
No delete/destructive business action exists in SP05.

Final safe captures opened individually under ignored frontend/output/playwright:
sp05-list-desktop-viewport, sp05-columns-desktop-viewport, sp05-detail-desktop,
sp05-list-mobile, sp05-detail-mobile, sp05-create-mobile, sp05-edit-mobile,
sp05-private-mobile, sp05-duplicate-mobile-viewport, sp05-selector-mobile-viewport
and sp05-zoom-200-viewport (PNG). Desktop1440x900; mobile360x800 plus full-document
views. Columns capture deliberately shows the scrolled ordering controls; the
duplicate capture is the actual bounded viewport, not fullPage overlay geometry.
Detail waits on the loaded message. The final picker view includes the wrapping
long choice button, width<=328px. Forms validate, primary radio choices work,
remove-primary restores one remaining choice, and error descriptions retain both
international help and actual validation message. Actual200%: DPR2→4,
CSS width1427→713,overflow false; valid viewport PNG2854x1702 after bringToFront.
Legacy CSS/surface crops are not accepted evidence. No screenshot was edited.
No unexpected application console/page error; expected401/403/404/409/422/503
responses are asserted in denial/conflict/validation/outage cases.

Contrast recalculated from actual token JSON: body/ivory14.08:1,
secondary/ivory6.11, primary-button14.94, focus/white6.50, input-border/white4.54.
Status foreground/background pairs: success5.50,warning5.67,danger6.73,info6.16,
neutral6.81. Labels carry state, not color alone. [AFTER audit005](../../../anti-slop/audit-005-2026-10-14.md)
records0 HIGH/0 MEDIUM/1 LOW mobile filter-density proposal pending Khalid's
selection. No audit-only fix or product/design approval. SP04 finding stays untouched.

## Corrections and discarded runs

- The first focused backend run was30pass/1fail: maintained metadata correctly
  rejected a reserved UK example. Replaced it with a valid synthetic-format
  fixture; final31 passed. Did not weaken metadata validation.
- Typed audit FKs broke standalone bootstrap, whose imports omitted contacts.
  Shared metadata registry fixed the cause; realTTY14 and full100 passed.
- A mistakenly overlapped pytest/browser run altered a fixture count. Stopped
  exactly the owned browser process tree, discarded both overlapped results,
  added the exclusive test lease and reran clean. Development was never reset.
- RHF field-array random IDs in HTML labels caused hydration warnings; useId
  plus collection index now provides stable label IDs, keys remain RHF IDs.
- Two initial browser assertions matched Next's empty route announcer; selectors
  now target the actual alertdialog/status text. A manual outage retry originally
  ran before API startup completed; wait on real ready200, then click retry.
- Visible inspection found focus on a non-scrolling wrapper; the actual table
  scroller now receives region/tabIndex. Reviewer source checks also prompted
  preserving phone error associations and wrapping long contact choices. These
  are authorized functional/accessibility corrections, not AFTER aesthetic fixes.
- The initial CSS-scale zoom screenshot and first clipped CDP surface capture
  were invalid Windows high-DPI crops despite passing live zoom measurements.
  Opened/rejected them; direct CDP live-viewport capture after bringToFront now
  shows the actual scrolled validation form at2854x1702. No screenshot editing
  or synthetic CSS zoom. Discarded the invalid experimental full-page zoom PNG.
  The mobile detail capture also initially raced loading; wait on the actual
  loaded enquiry message, not just the heading, before the final capture.

## Security boundary record

Security checked: **yes, for implemented SP-05 boundaries**; implementation review,
backend/browser negatives and final bundle/report/exclusion checks passed. Read SECURITY_CHECK, current
identity/permissions/business rules and API/data contracts. Inspected routers,
facade, commands, scope/projections, migration, test cleanup and browser storage.

- Backend authorization is authoritative: current full session/role/credential,
  missing facade proof, forged Origin/CSRF, restricted/revoked proof, owner and
  assignee forgery, private IDs, private-first phone errors, scoped totals and
  current-scope receipt replay. M/A safe options do not grant `/users` access.
- Strict whitelists reject provenance/contact reassignment, unknown fields,
  repeated/unknown queries, invalid versions/IDs, oversized/non-JSON writes.
  UTF-8 full4000-character messages pass within the actual32KiB bound.
- Independent unique indexes, deferred collection/scope constraints, actual
  contention/rollback and atomic typed audit/receipt defend DB invariants.
  Logs/errors never include submitted phone/email/message, proof or DB URL.
- TLS verification remains enabled with explicit local CA. Synthetic browser
  contexts alone accept its private cert. No JWT, public file URL, generic proxy,
  service failure route or browser record cache is introduced.
- Diagnostic privacy: no trace/video/automatic screenshot/storage-state; private
  reporter strips input-bearing steps, password fields cleared at teardown.
  Explicit screenshots contain synthetic post-login contact UI or empty fields.
- N/A: inventory/reservations/finance, file transfer/AV, import/export, website
  signatures/outbox/workers, production provisioning/real retention and restore.
  Their later tests are not accepted through contact/identity checks.

## Remaining boundary

Development handoff checks already pass after restarting the API with the new
routes: `-m app.cli.smoke` verifies live/ready, explicit CA, direct denial,
no-store and untrusted-CA refusal. An explicit-CA HTTP probe on3000 verifies
login200, four signed-out protected Leads/contact redirects and contacts401/
no-store. Next streamed redirect bodies may use HTTP200; actual marker and
destination are checked, not an assumed307. The initial HTTP probe used a
non-v4 zero UUID and correctly reached unavailable instead; the corrected valid
v4 synthetic ID passed. Browser navigation is separately exercised.
Read-only development counts:0 users/0 sessions/0 contacts/0 enquiries,
bootstrap marker unset; no development reset. The first private expanded client
scan after restart found200 JavaScript chunks across production and nested-dev
roots, no configured facade secret; no value printed. Final scan follows the
last browser/build run. Private configuration/certificates/venv/credential note/
reports/captures are ignored and not tracked. Preliminary documentation check
passed997 local links/70 skill links,22 sprints,41 AT mappings,13 Mermaid pairs,
nine JSON examples; final count will reflect the final evidence links.

Product/design acceptance remains Khalid's. SP06 assignment/collaboration/merge/
history and SP11 Create Deal are not started. No production, real-data import,
external message, device/iPhone/Safari, assistive-technology user study,
100-concurrent-user benchmark or recovery/RPO/RTO claim. Local agency-wide write
serialization and inherited development advisories remain explicit risks.
Read-only Impeccable documenter review found SP-05 preserves the incumbent KAY
visual system. Scoped additions are the semantic table minimum width, optional
accessible scroller label, composed form descriptions and wrapping contact-choice
labels. Existing design-system.md:97/115 and token meta.note installation-tense
drift was reported without rewriting DESIGN.md or generating extra design files.
No new world, PRODUCT.md interview, imagery or sidecar is warranted. The documenter
checked root/frontend AGENTS, sprint/evidence, DESIGN, design system/tokens,
theme/global CSS, shell/shared controls, contacts and supplied initial captures;
it did not run browser/DB commands or substitute for final independent review.

The fresh finish reviewer completed a full second evidence review (not a narrow
fix-score pass) after the requested recaptures: **ship for the reviewed SP-05 UI
scope**, no remaining identified material functional/accessibility findings.
It viewed all11 final captures, rechecked shared scroller/FormControl, contact
selector/fields and executable assertions, and retained only audit005 LOW1.
The first recapture disposition was not represented as a pass. No new world,
redesign/rebuild, second detector or aesthetic fix was performed. This reviewer
did not run tests/DB itself; actual results above were run by the implementing
agent. Its scoped verdict does not imply Khalid's product/design acceptance.

## Final handoff

All25 applicable task/acceptance/technical-exit boxes are completed in the sprint.
Full backend100, five-browser130, headed30 and built HTTPS19 checks passed with
zero skipped. Source UI is unchanged since the final successful build; later
test-only edits improve capture settling/framing, not production behavior.
All affected checks were rerun, invalid captures rejected, and previous accepted
auth/staff workflows retained. No remaining known in-scope functional defect.
Final `powershell -NoProfile -File docs/03-planning/validate-sprints.ps1` passes:
1003 local file links/anchors,70 approved skill links,22 sprints,41 AT mappings,
13 synchronized Mermaid pairs and nine valid API JSON examples. This validates
documentation only, not app behavior. Sprint unchecked criteria count is0.

Guarded final synthetic cleanup acquired the exclusive test lease after browser
ports stopped. Actor teardown had already left0 users/sessions/contacts/enquiries;
the helper also cleared residual synthetic test bootstrap/rate state. Final
development AND test:0 users/0 sessions/0 contacts/0 enquiries,bootstrap unset.
Development was not reset or seeded. Development/test remain on0004, distinct
OIDs109060/109061, unchanged unrelated development catalogue; final Alembic check
reports no new operations. API/Next remain on HTTPS localhost8000/3000; test ports
3100/8100/8101 are stopped. Expanded final scan/report results are in the table.

First safe human action, if not initialized: run
`backend/scripts/kay.ps1 -Task bootstrap` in an interactive terminal, choose your
administrator password privately at hidden prompts, sign in at
[local KAY](https://localhost:3000), and open Prospects. Reuse an initialized
account; never reset development to bootstrap again. No real/default account,
private record, external send, production access, commit or push occurred.
SP-06 is not started. Khalid's product/design review and optional audit005 LOW1
selection remain pending, along with real-device/AT-user/full-product/load/
recovery gates and the nine inherited HIGH development-tool advisories.
