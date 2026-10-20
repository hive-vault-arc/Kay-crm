# KAY security check for changes

## Inventory record and shell presentation (2026-10-19)

This follow-up changes icons, layout and sidebar positioning only. The shared
attachment component retains its existing query, permitted upload/download,
quarantine, authorization and archive controls; owner identities remain guarded
by the same API scope. No authentication, CSRF, file permit, backend, schema or
role rule changed. Browser checks used synthetic isolated records and safe
post-login captures without traces or credential-bearing artifacts. No real
data, remote migration, retention command or deployment occurred.

## Property photographs (2026-10-19)

New property images use the existing private document metadata, transfer-permit,
ClamAV scan, and clean-only download flow. The browser decodes JPEG/PNG/WebP and
uploads freshly encoded WebP bytes; this is a space-saving UX path, not a security
boundary. Backend metadata and byte validation independently require a WebP
property photo and cap active property images at ten under the existing
serialized agency lock. Legacy JPEG/PNG documents remain private, visible and
counted toward that cap; no real image is rewritten or deleted by migration
0029. The photo list and archive actions retain the file service's role and
parent-scope checks, with agent denial covered in isolated tests. Only synthetic
browser fixtures and test-database images were used. The additive migration was
applied to local development after target/OID inspection; no production service,
database, export, credential or external message was touched.

## Inventory presentation only (2026-10-19)

Creation-wizard follow-up: client-side step validation and category-specific
field visibility add no authorization path, API field, migration or data copy.
Final submission still uses the existing strict property/development schemas and
server authorization. Apartment programme placement is checked before submit;
the backend remains authoritative. The review summary uses only shared entered
facts, and a linked promoter is shown as “Contact lié”, never by a protected
private name. A headed synthetic Chrome case selects the promoter, confirms its
private name is absent from review, then dissociates it. Browser evidence uses
isolated synthetic records only. No
production service, real database, retention command or external message was
used for this follow-up.

The [inventory design refresh](03-planning/inventory-design-refresh-2026-10-19.md) changes no API, schema, auth, file transfer, stock transition or backend authorization. The live form preview contains only the same shared fields already entered on that form; it never reads protected promoter/owner identities. Existing private file permits, role-scoped owner/campaign commands, session handling and archived-state guards remain. The visible shared-fact edit link was retained for agents after the existing permission test caught an over-restrictive UI condition. Browser checks used the guarded isolated synthetic target, with post-login captures only and no credential-bearing traces, videos or automatic snapshots. No production access, real import/export, retention command, deployment or external message occurred.

## Commercial property category (2026-10-19)

D40 extends only the allowed category vocabulary in existing property,
development, unit-type and requirement-criterion constraints. Existing manager/
administrator writes, agent denial, current-session reads, protected ownership,
stock commands, archive and audit paths remain unchanged. There is no public
file URL, new personal field, real seed/import/export, credential change or
retention execution. Migration 0028 was applied only to the inspected isolated
`kayrealestate_test` database (OID 109061), never development or production;
its populated-upgrade test preserves legacy rows and refuses lossy downgrade.

Focused PostgreSQL: 77 pass; frontend units: 72 pass; visible Chrome commercial
creation/filter: 1 pass. Ruff, format, mypy, lint, TypeScript, build and runtime
dependency audit pass. The dev-only dependency advisory still uses the existing
time-limited exception. `alembic check` reports pre-existing 0027 Lead/Deal
archive model drift (archive columns/indexes absent from ORM metadata), not a
0028 category discrepancy. The full backend attempts are not green: 241 pass/3
fail initially, then 556 pass/3 fail/1 deselected with healthy ClamAV; all
remaining failures call that same 0027 check. Release must track this separately. Production
migration/access and human review have not occurred. See the
[D40 ledger](03-planning/commercial-properties-2026-10-19.md).

Follow-up: ORM metadata now matches the already-approved 0027 schema and the
isolated Alembic drift check passes. The complete isolated PostgreSQL/real
ClamAV suite passes 843 tests at 94% coverage. The owner separately authorized
production migration: live code 707c9ae contained 0027, managed PostgreSQL
reported 0026, point-in-time restore was available, and the targeted upgrade
confirmed 0027. No production test fixture, retention command, credential
exposure or record export was used. Authenticated read-only dashboard/Lead/Deal
smoke passed. This is not evidence that 0028 or the commercial UI is deployed.

## Combined CRM regression/publication (2026-10-18)

[Execution and retained failures](03-planning/full-regression-publication-2026-10-18.md)
cover the combined qualification, scoped histories, staff onboarding/deletion and
Riviera/Projects/calendar candidate. Real isolated PostgreSQL, ClamAV, recovery,
permission, concurrent/retry and session-revocation cases are exercised. Final
Lead totals sum the same complete scoped status aggregation in repeatable read;
no authorization predicate, timeout, pool limit or business rule is weakened.

Benchmark tooling accepts only independently counted exact old/new synthetic
distributions, retains failed logins/requests and the100-user/60s/p95 gates.
Its initial load gate fails latency; the owner-directed read-only SQL repair
subsequently passes unchanged100-user/60s/p95 limits (latest322.455ms ordinary/
574.745ms dashboard,7026 completed/0 failures). Agent scopes materialize only
inside one current-identity-validated read-only repeatable-read statement; no
cross-request authority/count cache, schema, pool or timeout change. Populated
three-role drill parity, private counts, decimal corrections and concurrent
transfer pass. Unexpected benchmark-user errors now explicitly fail the gate;
startup diagnostics expose phase counts/error classes, never raw tracebacks or
credential inputs. Intermediate setup failures remain disclosed. Final exact-
head functional/security gates are still required before merge. Only the guarded local
synthetic benchmark was migrated0022→0026; no development/remote DB migration,
real account/password change, retention CLI, real import/export or external
message occurred. Main's automatic demo deployment is owner-approved only after
tests pass; no remote data authority is inferred.

Test-supervisor diagnostics expose only whitelisted process codes/role/status/
numeric state, not raw stderr, credentials, tokens or records. Auth traces,
videos, automatic screenshots and AI snapshots remain off; explicit captures
use empty credentials or safe post-login synthetic UI. Browser profiles, reports,
private notes/runtime settings and raw output remain ignored. Public fixture
copies are unchanged generated synthetic test images, outside runtime assets.
Final local index/private-value/pattern/bundle/report checks are recorded below;
exact-head hosted aggregates still require execution. A functional pass does not erase the load
failure or imply production certification. Final local checks find0 known-value
matches across8404 indexed blobs/7 private values, no staged/history Gitleaks
leaks,0 configured secrets in586 browser JS files and0 detailed report steps.
Port8000 remains untouched.

## Projects categories/facets and photo directory (2026-10-18)

D39 is a read-only inventory projection/filter extension, not a new authority or
stock command. Only properties accepts bounded exact unique CSV categories;
explicit-none, legacy single category and ambiguous/duplicate/unknown rejection
are tested. Existing non-category filters precede whole-result facets, category
selection and numbered pages in one repeatable-read snapshot. Canonical counts
contain no private owners. Other routes reject the new selection parameter.

Current-session and strict no-store facade/response validation remain. Literal
multiword search uses%20 rather than weakening the existing API target allowlist.
Category controls wait for current facets during requests, preventing a hidden
zero-count category from surviving rapid clearing. Current errors and retries
remain visible. No TLS/cookie/CSRF/origin/session/permission guard was weakened.

Existing protected clean-file thumbnails retain real permits/object URLs and
cleanup. Eight generated PNGs are synthetic isolated fixtures with exact prompt/
hash provenance, uploaded through real metadata/binary transfer/ClamAV flows;
they are not public assets or development inventory covers. No migration, real
seed/import/export, production access, external message or retention CLI ran.

51 focused PostgreSQL and66 frontend unit checks pass, with Ruff/mypy/lint/types/
build. Real headed Chrome covers owner privacy, role/version denial, prices,
House/pages, actual outage/retry, interrupted acknowledgements, late logout and
revoked sessions. The ledger retains early failures and final confirmation.
Captures are explicit synthetic post-login UI; no traces/videos/input-bearing
diagnostics are enabled. Final bundle/report/cleanup evidence is in the
[ledger](03-planning/projects-reference-refresh.md). No commit/push, full-release
or all-browser security certification is implied.

Final Projects confirmation2/2 passes1.4m after the in-flight selection fix.
Client scan4 roots/577 JS/0 configured secret matches; HTML report2 JSON/2 empty
result-step arrays/0 detailed. Read-only isolated checks find0 user/contact/
enquiry/property/offering/document/job/notification rows. The test worker and
temporarily started ClamAV are stopped, original assets/signatures preserved;
frontend/test API remain CA-verified200. Port8000 untouched. No development
cleanup, real import/export, commit or push. See ledger for retained failures.

## Calendar selection/facets and reference (2026-10-18)

D38 adds read-only bounded type/status filters and scoped facets, not a new
authority or data store. Details retain contact/participant/current-session
scope before facets; type/status filters run before numbered paging. Facets and
items share a repeatable-read snapshot. Empty selection is explicit; unknown,
duplicate, whitespace and ambiguous queries fail. Outsider facets are zero.
Metadata-free colleague busy rejects all type/status selections and returns no
counts, titles, contacts or locations. Existing timezone, booking capacity,
lunch, overlap, optimistic versions and interrupted-retry guards remain tested.

No identity/TLS/CSRF/cookie/command guard was weakened. The existing private
facade still forwards only current authority. Strict response validation fails
closed without complete facets. No migration, real record import/seed/export,
fleet assignment, external message, retention CLI or production operation.
Verified selected Free Iconsax assets are inline functional glyphs; no new
runtime/dependency/remote asset request. Temporary source archive was removed.

40 focused PostgreSQL tests and61 frontend units pass. Serial real-stack headed
checks cover roles/copied IDs/free-busy plus actual outage/retry, mobile touch,
keyboard/native200%, type/status filters and reference images. All fixtures are
isolated synthetic; captures contain no source client data or secret fields.
Final build scan:4 browser roots/561 JS/0 configured facade/signing-secret matches.
No trace/video/input-bearing diagnostic capture is enabled. Final report/cleanup
evidence is in the [ledger](03-planning/calendar-reference-refresh.md).
This scoped check is not full-release, all-browser or production certification.

## Staff setup/deletion (2026-10-18)

D37 changes only later-account setup/reset/deletion. Initial passwords enter as
SecretStr, persist only as Argon2id hashes and participate only in keyed receipt
fingerprints; API/GET/receipt results contain no plaintext. Immediate active
accounts still have24-hour restricted credentials and must choose a different
own password then sign in freshly. Current-admin-password reset remains required.
Existing staff credentials/flags/sessions are not bulk-changed. Legacy pending/
disabled accounts require explicit reset; deleted accounts deny login/session/
detail/edit/reset. Removed handoff/disable routes fail404.

DELETE uses ordered agency/user locks, fresh authority after waits, optimistic
version, last-final-admin protection and atomic marker/revocation/audit/receipt.
No physical identity/history deletion, restore, email reuse or automatic external
delivery is added. The security audit family includes users.delete while keeping
historical actions. No retention CLI ran. Approved local0025/0026 upgrades each
preserve original-column fingerprints across69 tables;0 real accounts deleted.

51 focused and46 related PostgreSQL checks pass.56 frontend units, lint/types/
build and7 visible Chrome cases pass; the final two-case confirmation follows
copy/capture corrections. Client scan4 roots/549 JS finds0 configured facade/
signing-secret matches. Initial seven-case HTML report has3 JSON/7 empty step
arrays/0 detailed arrays; no trace/video/raw credential diagnostics. Dependency
check reports0 runtime vulnerabilities and9 inherited dev-only findings covered
by the existing approved exception through2026-11-15, not a clean full audit.
Final privacy evidence and commands are in the
[ledger](03-planning/staff-onboarding-deletion.md). Human product review and
full-release/all-browser/production security verification remain outside scope.

## Lead/Deal activities (2026-10-18)

The [activity ledger](03-planning/lead-deal-activities.md) records an additive
history extension, not a replacement permission model. Every target/history/
origin/count/replay checks the current session and parent scope; origin uses
only the explicitly linked Lead, not contact-wide notes. Global identity lock,
one immutable event, audit and same-key receipt commit atomically. No caller
actor/time/context, HTML rendering, backdating, edit/delete, external message,
visit scheduling or inventory mutation is exposed. Schema0025 bounds metadata
and validates manual parent/contact context; existing history triggers remain.
The strict no-store facade retains verified HTTPS, secure cookie, exact origin,
CSRF, query/payload allowlists and bounded4MiB responses. NUL is rejected.

Final22 new PostgreSQL and55 scoped regressions pass, covering privacy/current
authority, transfer/replay, archive, merge, guards, concurrent/retried/rolled-back
intent, immutable rows and populated migration preservation/refused downgrade.
Final4/4 visible Chrome cases include actual committed-but-lost-response retry
without duplicate entry, literal script-text rendering,403/404 boundaries,
loading/error recovery and read-only archive.53 frontend units, types/lint/build,
scoped Ruff/mypy pass. These are necessary scoped checks, not a new full-backend,
all-browser, production penetration or human acceptance claim.

Privacy scan:4 browser roots/540 JS,0 configured facade-secret or signing-key
matches. Final report3 JSON/4 empty result-step arrays/0 detailed arrays. Explicit
captures are guarded post-login synthetic UI; no raw credentials/client examples
from the supplied images were imported. No dependency or shipping raster added.
The initial test lease refusal was respected; owner-approved exact KAY supervisor
shutdown enabled serial checks, then8100/8101 were restarted. Port8000 was never
stopped. The later explicit approval applied0025 locally with unchanged original
row fingerprints across69 tables; the separate staff change then applied0026.
no real-data rewrite, production operation, deployment or publication occurred.

## CRM screenshot fidelity correction (2026-10-18)

The current [reference ledger](03-planning/crm-reference-fidelity.md) separates
visual correction from prior qualification/backend work in this dirty tree.
The new UI composes existing scoped metadata/list/detail/task/assignment APIs;
it does not change authorization, sessions, HTTPS, command identity or schema.
Read-only status tiles do not bypass transitions. Filter counts remain backend
projections; selection is current-page presentation, not a bulk mutation.
The compact follow-up uses the existing eligible-owner list and Casablanca
resolver, preserving versioned/retry behavior. `tel:`/`mailto:` actions require
the user's external application; no external message is sent by this task.
Initial guarded Chrome checks create synthetic records and a real internal task,
then use existing test cleanup. No development database reset, real staff/client
capture, credentials in screenshots or production access. Final broad browser
checks pass24/25; the remaining hidden-checkbox hit-area measurement is corrected
and the full filter suite rerun passes2/2. All25 distinct selected cases have
passing final-source evidence, including denial, revoked session, outage/retry
and stale-version cases. Client privacy:4 roots/531 JS/0 configured secret
matches; report2 JSON/2 empty result arrays/0 detailed arrays. Three interrupted
synthetic fixture actors are removed individually through the guarded supervisor;
read-only verification finds0 of those IDs remaining. These checks are not
full-product security certification.

## Lead/Deal interface-only refinement (2026-10-17)

Scope: eight list/detail/create/edit surfaces, explicitly confirmed by the owner.
Only presentation, affected existing tests and scoped documentation are changed
for this request. No backend/auth/session/CSRF/TLS/file-quarantine rule, request
contract, environment, database configuration or permission check is changed.
Deal email is rendered from the existing authorized contact projection; no new
lookup or private-data cache is introduced. Non-target routes keep their shell
width and default shared component behavior.

Current lint/direct types/production build and45 units pass. The20-case compiled
headed Chrome run passes6.6m, covering actual create/edit/conversion, scoped
reuse/private denial/copied IDs, agent/manager/admin authority, immutable retry
identity, validation, outage/conflict drafts and recovery. Actual200% zoom,
keyboard/touch and narrow layouts retain the guards. Six additional qualification
journeys pass across Edge/Firefox/WebKit in1.9m. These are scoped frontend
regressions, not a newly executed backend aggregate or broad security penetration
test. No check or failure handler is removed to obtain a pass.

Client scan4 roots/416 JS has0 configured facade/signing-secret occurrences.
The20-case report has9 JSON/20 empty step arrays/0 input-bearing detailed arrays.
The final6-case report has3 JSON/6 empty arrays/0 detailed arrays, with only
`.last-run.json` retained and0 temporary profiles/zoom directories or isolated
test listeners on3100/8100/8101/8001.
Captures are opt-in post-login synthetic UI with password/private-field guards,
ignored along with reports/configs;0 such generated/config paths are tracked.
No new shipping raster/dependency. A fresh read-only full finish reviewer opens
all36 exact capture files and returns `ship` for this slice. Fresh documentation
comparison and final report/artifact inspection are complete and recorded in
the linked ledger; no global design metadata drift was repaired as a side effect.

No real staff/client records, production access, publication or deployment.
The populated local database's earlier owner-requested migration is separate
completed work, not rerun or changed by this frontend task.
[Current evidence](03-planning/leads-deals-interface-refresh.md).

## Lead/deal qualification replacement (2026-10-17, local verification complete)

Final complete isolated backend command exits0:775 passed975.95s,94% configured
application coverage. Current request/authority/history/stock/migration rules join
the132 distinct broad Chrome cases,12 cross-browser core journeys, dev-only and
stronger installed-Chrome checks through the recorded passing commands and retained
failures. No test/CI/permission/TLS/quarantine guard is removed to obtain a pass.

Post-run READ ONLY inspection under the normal isolated lease confirms revision
0024_deal_qualification_history and0 users, contacts, leads, deals, jobs and outbox
rows. Client scan4 roots/395 JS has0 matches for either configured facade or signing
secret; latest report2 JSON entries/1 empty step array/0 detailed arrays. No retained
zoom/profile directory or listener on3100/8100/8101/8001. Runtime/config/certificate/
capture/report/coverage paths remain ignored. No dependency/lockfile changes.
Final lint/direct types/45 frontend units, Ruff317/mypy182/pip and dependency audit
pass; the audit retains9 dev-only findings under the approved exception through
2026-11-15, with0 runtime vulnerabilities, not a clean full audit. Source/layout
requirements are checked individually. No real-data migration, publication or
deployment; no new full-volume performance or human product-approval claim.

### Retained verification checkpoints (historical)

Final visible Chrome stronger Lead confirmation passes1/1 in27.8s. Planned
browser scope now has passing evidence:132 distinct broad Chrome,12 cross-browser
core journeys and dev-only component check, through the recorded commands and
retained prior failures. Latest report2 JSON/1 empty step array/0 detailed arrays;
no retained zoom/profile directories. The complete guarded isolated backend suite
with coverage is now live, with no concurrent browser writer. Its terminal result
and final requirement/privacy/artifact audit remain required before completion.

Strong current Lead journeys pass3/3 Chromium/Edge/Firefox1.1m and3 WebKit
repetitions1.1m, with page errors still fatal. Earlier unchanged manual/catalogue
cases pass all4 profiles, completing12 distinct cross-browser journeys through
recorded commands, not a claimed clean initial12-case run. Dev-only component
loading/empty/invalid/error/recovery passes1/1 in45.9s. Both reports have2 JSON
entries/3 or1 empty step arrays/0 detailed arrays. Final native Chrome stronger
Lead confirmation is live; full backend aggregate and final audit remain open.

Current strengthened WebKit Lead journey passes3 serial repetitions1.1m,0 page
errors. It waits for actual visible record/profile/dialog/deal readiness instead
of abandoning initial background loads; every page-error event still fails. The
safe classifier uses allowlisted kinds and URL-path extraction only (UUIDs redacted,
no query/body/message). Transport failures correlated with cancelled background
requests, but standalone HTTP/HTTPS/partial-body abort probes did not reproduce;
no claimed general CORS/root-cause fix. No app code change. Report2 JSON/3 arrays/
0 detailed arrays, lint/direct types pass. Other3 current Lead profiles are live;
prior manual/catalogue evidence is unchanged. Remaining final gates stay open.

Cross-browser12-case command is terminal11 passed/1 opaque WebKit Lead page-error
failure3.4m, after its full business assertions passed. A safe classifier retains
all page errors but records only exception name/React number/ID-redacted route;
no raw error message, password, URL query or session. No app change/exception
suppression. Single corrected-diagnostic rerun passes1/1 in32.8s;3 repetitions
remain live. Report privacy4 JSON/12 arrays/0 detailed and2 JSON/1 array/0 detailed.
The original error's cause is not established by a passing rerun.

Final native File/Work rerun passes2/2 in2.8m, closing all132 distinct broad
Chrome cases through the documented continuation chain. No single all-green
invocation is claimed. Real quarantine/recovery/verdict/bytes and private denial,
task/inbox authority, native touch/keyboard/200% and4.5:1 remain asserted. Report
privacy3 JSON/2 step arrays/0 detailed arrays; no retained zoom/profile directory.
Actual manual1/2/3 project commits, replay and ordered history pass3/3 in3.63s.
The12 cross-browser core journeys are live; dev-only/full backend/final audit
remain pending. No production data, publication or app-security bypass.

Latest4-case rerun is terminal2 passed/2 failed4.0m. Extra dashboard-profile
cleanup and exact private-derived-title denial pass. File's actual fenced scan
recovery/byte/EICAR checks progress to the modal capture, where an accessibility
role query incorrectly excluded the hidden background shell. The guard now uses
includeHidden while keeping password/private-field absence. Work's safe diagnostic
identifies OKLab/alpha misparsed as RGB, not a proven UI colour defect. Canvas
sRGB resolution/ancestor alpha composition retains4.5:1 and all geometry/control
assertions. No app or modal-isolation change. Fresh lint/direct types pass;
report5 JSON/4 step arrays/0 detailed arrays. The corrected2-case run is active.

The15-case continuation is terminal13 passed/2 failed12.4m. Native outcome API403,
ownership, restore, reporting, qualifications, reservations, scheduling, user
administration and V3 clean-image authority pass. Report13 JSON/15 step arrays/
0 detailed arrays. Both remaining native File/Work failures are retained in a
4-case run with the extra dashboard cleanup and exact private-label cases; both
extras pass. Work contrast remains4.5:1 with safe tag/action/computed-colour
diagnostics, no record text. Actual1/2/3 project persistence/replay assertions
are added to the backend manual-deal test, not yet executed; no app code changes.

Live15-case update: exact login SSR/no-JavaScript and strengthened native outcome
denial pass, along with ownership/restore/reporting. The retained File retry
failure persists at30s because forced termination can leave the90-second fenced
lease. Native verification now follows the existing E2e200-or409 retry response
and120-second recovery bound; no lease/scanner/fencing code changes. Its corrected
rerun is pending. Fresh client audit4 roots/391 JS has0 configured facade-secret
matches and0 signing-secret matches (one distinct configured value of each).

Latest23-case continuation is terminal8 passed/3 failed/12 not run7.7m. Its
report has20 JSON entries/11 step arrays/0 detailed arrays; no disposable zoom
profile remains after the passing login-zoom case. The next test-only corrections
retain actual scanner completion within30 seconds, the page-level Contact glyph,
and current D34 facts-edit rights. Native external-stock denial is strengthened:
the agent sees the permitted edit link, no external-outcome control in Offres,
and gets403 replaying the real manager-reviewed body with fresh actor protection.
Lint/direct types pass; all15 remaining cases are selected in a guarded run.
Fresh runtime dependency audit is0 vulnerabilities;9 existing dev-only findings
use the approved exception through2026-11-15. CI-policy units16/16 pass.

Current56-case continuation is terminal33 passed/3 failed/20 not run15.5m;
its report has33 JSON entries/36 step arrays/0 detailed arrays. Native Deal and
File tests now start their required worker explicitly, preserving real scanner
verdicts, quarantine/denial and byte assertions. The login test follows the
owner-approved glyph inventory without changing auth or the shipping login.
Fresh lint/direct types pass. All3 failures plus20 unexecuted cases are selected
in a fresh guarded23-case compiled continuation; its results remain pending.

Latest75-case writer is terminal19 passed/3 failed/53 not run10.5m; its report
has42 JSON/22 step arrays/0 detailed arrays. Those three stale title/icon test
expectations are corrected and all pass in the live56-case continuation. Actual
restored session/permit denial and current scoped data/worker reconciliation pass
with exact budget/profile/project assertions. The native200% record test passes
with zero retained record-facts profile directories. No application permission,
stock, history or authentication rule is weakened. Remaining56-case results,
extra current cleanup/private-label reruns and final artifact audit are pending.

Current broad command is terminal:57 passed/3 failed/72 not run17.9m. All three
test-only corrections pass at the start of the75 remaining-case continuation,
which is still active. The132-case report contains61 JSON entries/60 step arrays/
0 detailed arrays. Four persistent-context tests now close and remove only their
validated disposable test profiles in finally, including first-launch failures.
A manual deletion attempt was blocked and not retried. Read-only inspection
after normal harness startup finds the former disposable profile absent. New
cleanup branches still need their actual zoom-case execution; no user profile
or development/production record is a cleanup target. Lint/direct types pass.

Latest functional regression correction: the enquiries list adds complete status
counts after current-contact/assignment authority, archive and all ordinary
filters, before pagination in its existing read-only repeatable-read transaction.
No new operation, role, private projection, grant, stock mutation or authentication
bypass.43 affected backend cases pass44.47s, including private counts, filtered
pages and converted exclusion.45 frontend units/lint/direct types pass; the
facade requires every bounded nonnegative status key. Restored technical
Provenance remains distinct from marketing campaign attribution. Prior full
Chrome terminated39 passed/5 failed/88 not run; corrected browser verification
is pending, not a release claim.

Corrected focused rerun:3/3 compiled native Chrome cases pass2.0m after8 other
focused passes. Signed intake, exact source attribution, worker restarts,
private/actor denials, nine-state counters and stop/restart recovery remain.
The added archived/all count assertions pass1/1 in2.25s. Report privacy is
4 JSON/3 step arrays/0 detailed arrays, current client scan391 JS/0 configured
secret matches. Full132-case compiled Chrome is running; no full pass inferred.

Owner-authorized IMMO World alignment replaces free-title manual creation and
enquiry linking with explicit qualified creation/conversion. Existing canonical
phone uniqueness, current contact/collaborator scope, archive restrictions,
agency→identity lock order, Origin/CSRF/facade/TLS, version checks and hashed
idempotency receipts remain. New contact plus deal, or profile edit plus deal
edit, commits in one transaction. A private duplicate returns only the existing
approved responsible-agent disclosure; the facade validates its bounded shape.
No new unauthenticated endpoint, ownership grant or stock mutation is introduced.

The additive0023 client/qualification/project migration preserves legacy rows.
Additive0024 binds budget/source/rating/buying-intent/client snapshot/notes/
financing/rooms and ordered project interests to the immutable latest deal
revision. New rows require qualified facts; untouched legacy defaults and empty
historical snapshots are retained without fabrication. Ordinary SQL changes to
qualification or project sets fail without matching history. Case-insensitive
trimmed duplicate external projects are refused at the database boundary.
Existing stock, outcome, proposal, merge-origin and actor guards remain separate.

Observed:32 real PostgreSQL cases pass across new history guards, populated
legacy upgrade, manual workflow and conversion;93 broader reservations/outcomes/
finance/reporting/deal-edge/merge/private-file cases pass after0024.196 pure
backend units pass with565 integration cases deselected, not
passed. Fresh pure backend selection passes196 cases4.06s; mypy passes182
source files. Frontend44 units, lint/typecheck and the production build pass.
The final compiled visible Chrome selection passes8/8 in4.7m: new qualified
manual creation/edit/history, real lead conversion, current inline filters and
retained contact/project rails, shared actions, native Lead/Deal states, private
duplicates/files, interrupted service recovery, conflict reload, touch and real
200% zoom. The first broad attempt retained one test-helper load-timing failure
(5 passed/1 failed); the corrected complete selection passes without dropping
the check. The earlier6-case deal selection also covers exact offering context,
proposal/stage behavior, scoped counts/pages and committed-response retry.

Client scan checks391 browser JavaScript files across4 build roots:0 configured
facade-secret matches and0 matches for the1 configured signing key. The private
report audit finds4 JSON entries/4 step arrays/0 detailed step arrays. Synthetic
post-login captures contain no credential inputs. Fresh generic-subagent finish
review scored its3 material fixes resolved; that ship verdict covers the scored
fixes, not whole-product or release acceptance. Catalogue-project positive
browser verification passes1/1 in29.2s. Ordinary-extension documentation and
AFTER024 are complete; pre-existing global design format drift is preserved.

Full backend attempts retained39 passes/1 overly specific scanner-send assertion
and171 passes/1 stale D34 test denial. Corrections preserve exact wire bytes,
endpoint/signature/verdict guards and the already-approved project operation
allowlist; no application scanner or permission behavior changed. Focused
development-edge/manual qualification verification passes11/11 in28.41s.
The reviewed-unit selector now parses module paths before slash-containing
parameters; its explicit allowlist/DB-connection refusal remain. Current pure
selection passes217/552 deselected in3.53s, including6 new selector cases. Earlier
196/565 counts are historical, not proof all deselections were database tests.
The complete backend attempt next stopped213 passed/3 stale title/migration
fixture failures; the corrected three cases pass3/3 in26.14s. Historical
migration cases now insert explicit legacy facts after an empty isolated schema
downgrade, then prove upgrade preservation and current downgrade refusal.
Qualification/history constraints, triggers, authority and lease are unchanged.
A broader migration-focused run passes13/14; its sole phone comparison omitted
the later nullable website-source column on one side and is corrected. The full
769-case run collected that test before its final correction and remains live;
its terminal result and corrected affected rerun are required. Fresh Ruff315
files/mypy182 modules and frontend lint/typecheck/44 units pass. Client/report
privacy scans remain391 JS/0 configured-secret matches and4 JSON/4 arrays/0
detailed arrays; runtime/capture/report paths are ignored and untracked.
The complete backend run terminated768 passed/1 stale import comparison failure
in957.68s. The corrected affected run passes30/30 in75.08s, including the rebuilt
draft migration, both bounded generator SQL branches, conversion/history, import
and actual70-table restore. The conversion cleanup exception is now test-DB-only;
a restored converted Lead cannot be detached in the distinct recovery DB even
with the synthetic flag set. No trigger, retention or authority guard was disabled.
Fresh pure units217/554 deselected, Ruff316 files/mypy182 modules and the production
frontend build pass. Generator samples prove qualification compatibility, not a
renewed full-volume load claim. Complete compiled Chrome is running serially;
the separate development-only component case and final browser/privacy audit
remain open.
Only the guarded isolated test database was migrated. No development/production
migration, credentials, real records, push or deployment are included.

## D34: agent project creation/editing (2026-10-17)

Explicit operation allowlist grants only project facts/briefing, hierarchy/types
and property/unit create/edit. Current identity after locks and before receipt
replay, strict bodies, CSRF/Origin/facade, stock constraints and true-actor audit
remain. Owner/file/offering/availability/external-outcome/archive/restore commands
remain M/A-only. Agent developer changes require current contact scope; missing/
private IDs share NOT_FOUND. Omitted IDs preserve hidden links; retry hashes
distinguish omission from explicit removal. No schema or production data change.
Final isolated53 backend cases and4 compiled visible Chrome cases pass; full
release matrix is not executed/not passed for this change. [Actual commands,
retained fixture failure and boundaries](06-delivery-and-operations/agent-project-permissions.md).

## Production server-only frontend facade (2026-10-16)

Owner-authorized remote HTTPS support replaces only the unconditional localhost/
local-CA requirement. Remote origins omit the custom `ca` option and keep
`rejectUnauthorized: true`, default trusted roots, hostname verification and no
redirect following. Local HTTPS still requires the local CA, including compiled
local mode. Base URL credentials, non-root paths, HTTP, query and fragment remain
refused. Request targets additionally must stay on that exact origin under
`/api/v1/`; caller paths cannot redirect facade/session/CSRF headers elsewhere.

The `server-only` boundary, minimum facade-secret length, secure host-only HttpOnly
SameSite cookie, auth-origin checks, CSRF forwarding, private no-store responses,
bounded JSON/timeout limits and backend authorization remain. No browser config,
TLS bypass, runtime dependency, database change or production access. Vercel
server-side guidance informed the branch-local CA read and request-local state;
no interface or visual redesign is included.

39 isolated tests pass, including real local TLS handshakes for production-style
synthetic DNS, untrusted/wrong-host certificates, explicit local CA, redirects,
timeouts, interrupted/oversized/malformed responses, URL rejection and auth-cookie/
origin/CSRF contracts. Only test DNS maps to loopback; only the disposable test
child extends its default roots with an ephemeral synthetic certificate. Product
code does neither. Browser bundle scan: 349 JS files, 0 configured facade/
signing-secret matches. Full database/browser integration is not executed/not
passed for this patch; it remains mandatory before real customer data. Actual
hosted Vercel → DigitalOcean connectivity is not claimed. [Evidence and settings](06-delivery-and-operations/production-api-facade.md).

## Production private antivirus endpoint (2026-10-16)

Owner-authorized production settings fix: valid configured DNS names (including
single-label private names) and IP addresses replace the unconditional loopback
literal only in production. Local/isolated defaults and endpoint restrictions
remain. Malformed hosts/URLs and out-of-range ports fail with variable/code-only
diagnostics, without exposing inputs or exception chains. No startup DNS probe,
secret input, production connection, schema, authorization, TLS/database isolation
or migration change. ClamD must stay on the operator's trusted private network;
this task does not add encrypted/authenticated scanner transport or provisioning.

The scanner algorithm is unchanged: signature/version and INSTREAM checks remain,
infection rejects, DNS/refusal/timeout/protocol failures return503
`ANTIVIRUS_UNAVAILABLE`; no fallback marks a file clean. Database-backed quarantine,
lease, retry and download authorization paths are untouched. The current pure unit
selection passes154 cases,513 integration cases deselected, not passed. New tests
deny real scanner connections/DNS, exercise controlled transport and inspect API
lifespan/worker configuration with synthetic private DNS. Linux CI startup probes
also explicitly configure that synthetic private scanner host. Complete manual
database/browser/real-scanner release suites remain required before customer data,
not executed for this patch. [Commands and limits](06-delivery-and-operations/production-antivirus.md).

## DigitalOcean public PostgreSQL CA (2026-10-16)

Owner-provided file is one parseable public X.509 CA, no key or extra content;
byte/hash equality and self-signature verified. Public `.crt` is intentionally
bundled, not a private-key ignore exception. Both managed launchers preflight
readability/public-only content before settings; failures expose only
`DATABASE_URL:TLS_ROOT_INVALID`. Existing production `verify-full`, exact managed
host, absolute root parsing, authorization and database/migration/isolated-test
guards are unchanged. No secrets read, URLs printed, trust roots installed,
production connection or deployment. Public CA/launchers enter recovery code
artifacts; old restore points and database safeguards are not modified.
105 connection-forbidden unit cases pass;503 deselected are not passed. Two
non-root read-only/network-disabled Linux probes verify the intended file path,
API startup and worker configuration only, not actual managed TLS/queue activity.
Invalid-CA launchers fail before settings, public-bundle redacted scan0 findings.
Live container readbacks and the full pre-customer-data release gate remain
pending. [Evidence and safe console check](06-delivery-and-operations/digitalocean-postgres-ca.md).

## Dashboard header controls (2026-10-16)

Owner-requested UI-only removal of the audit shortcut; the local readiness/retry
widget was already removed. The direct audit view, server role guard and API
authorization remain unchanged. No backend, health/TLS, database, migration,
credential or permission change. Tests retain privileged access and agent403
checks using the isolated synthetic harness, never production.

## Performance-dashboard presentation (2026-10-16)

UI-only use of existing report/enquiry/deal projections: no new backend metric,
route, permission, database table, migration or configuration. Current snapshot
pipelines are not presented as conversion cohorts; activity counts are not
invented unique worked-Lead/Deal totals. Money remains an exact backend decimal
string, finance is absent/denied for agents, and drill-down retains the same
attribution/period intersection. Neutral KPI styling, Bklit funnel composition
and stacked agent contributions preserve the complete numeric legends/tables.
Existing APIs still apply scope before count/group/page. No client role or
unrestricted-data aggregation is introduced. No new package or remote loader.

Browser setup/cleanup uses the existing exclusive synthetic-database lease,
versioned authenticated commands and disposable actors. The11-contributor page
edge case uses an explicitly synthetic browser response after real API parity
checks; it is not represented as an application feature or a server data test.
Captures are post-login synthetic UI only; traces/password snapshots remain off.
Backend working diff is empty. No push, production connection or deployment.

## Dashboard development diagnostic removal (2026-10-16)

Remove only the frontend local-service widget and its unused component. Backend
readiness/liveness endpoints, HTTPS/TLS facade, authentication, authorization,
database/migration checks and monitoring are unchanged. Authorized audit access
and normal report failure/retry stay visible. Tests wait for real report content
instead of diagnostic copy and retain real health status/body/cache/request-ID,
invalid-route/query and outage503/restart200 checks. Five focused compiled
headed Chrome cases pass against the guarded synthetic target; no production
access, customer data, credential capture, new dependency, push or deployment.

## Local dashboard city-header presentation (2026-10-16)

Only the title strip's border/radius/minimum height and decorative image scale
change. Existing image origin, empty alt, controls, permission checks, API data,
auth/session/CSRF and backend remain unchanged. No new dependency, remote asset,
credential, customer record or production access. Visible compiled Chrome uses
the guarded synthetic database; scoped admin/agent/audit and failure/recovery
checks pass. Safe captures exclude credentials. Test services stop afterward,
shared PostgreSQL preserved. No UI commit/push/deployment performed.

## Local login icon presentation (2026-10-16)

Only inline semantic icons, local corner-radius classes and flex spacing change.
Existing form association, generic errors, password clearing, hydration disable,
pending state, password visibility labels, authentication/session/CSRF/cookie/
redirect and rate-limit logic are preserved. No backend diff or new dependency.
Two source-verified official Free assets use the existing licensed SSR-safe layer;
no remote loader, asset request, key, subscription or public sign-up is added.
Real guarded synthetic auth/retry/password-change Chrome cases pass. No password
is captured; safe screenshots and disposable profiles stay ignored. Test services
stop afterward, shared PostgreSQL preserved. No commit/push/deployment performed.

## Managed application runtime exception (2026-10-16)

The owner requests repairing the supplied Linux buildpack import failure and
publishing the fix. Only exact Python3.14.3 at this backend's resolved Linux
`.heroku/python` prefix gains application-import compatibility. Wrong prefixes,
patches/platforms remain denied; require_venv and app.cli remain local-venv-only.
No database URL, TLS, session, permission, bootstrap, worker or backup boundary is
disabled. Missing cloud configuration still fails closed. The actual Linux
probe mounts only source/public hash lock/probe read-only, uses random transient
facade proof and a synthetic unavailable loopback DB, publishes no host port
and verifies503 rather than false readiness. No laptop configuration, key, record
or file is copied into it. Managed runtime artifacts are ignored/index-rejected.
Actions remain read-only; Linux joins the existing aggregate and main protection
is read back, not bypassed. [Published evidence and remaining scope](06-delivery-and-operations/digitalocean-runtime-fix.md).
This shared file's earlier unrelated UI notes remain excluded from the hotfix.

## Left directory filter presentation (2026-10-16)

Only frontend layout, selected-agent display persistence and table overflow
guidance change. The real applied-filter objects, pagination reset, query
allowlists, archive timing and role predicates remain authoritative. AgentPicker's
optional selectedLabel is the existing selector's display string, never a new
ID, scope grant or payload field. No backend, migration or API contract diff.
Synthetic-only guarded browser fixtures/captures, no credential-bearing trace;
new output paths are ignored. Final compiled client scan checks4 roots/352 JS
files and finds0 configured facade-secret/0 configured signing-key occurrences.
These observations are separate from historical full-product checks. No real records, import/export,
external message, new dependency or deployment is introduced by this change.

## Leads/Deals header action hierarchy (2026-10-16)

Opt-in gold/quiet Button variants and shared presentation grouping change only
list headers and compact triggers. Existing import/export role conditions,
column preferences, export filter payloads, explicit confirmation, idempotency,
pending/retry, private download and record creation commands are unchanged.
Actual scoped CSV download/agent403 and Lead/Deal creation regressions pass;
new header cases check agent-hidden import/export and real touch/keyboard paths.
Backend/API/permission files remain untouched, and fixtures/captures are synthetic.
No credential, external asset, deployment or new dependency added.

## Sidebar account footer boundary (2026-10-16)

Only shared frontend presentation and optional logout styling props change.
CSRF retrieval, POST revocation, cookie handling, session monitor and forced
password-change behavior remain unchanged; no backend path is modified. The
password-change route remains available, with only its sidebar links removed as
requested. Real isolated Chrome checks pass pending/failure/retry, mobile touch
revocation401, keyboard logout, refresh/replay, restricted-password fresh login
and late-denial races. Failed transport leaves the real session valid before
retry; the alert uses existing readable danger tokens. All identities/data are
synthetic; no credential-bearing trace/capture is added.

## DigitalOcean detection metadata (2026-10-16)

The owner requests a conventional full `requirements.txt` and publication to
main. Runtime package pins/hashes move without changes; the old lock filename
becomes a hash-enforcing compatibility include and no development packages are
added to runtime. Packaging guards check the full-list/alias/Python-pin boundary.
Recovery's existing code archive/compatibility digest additionally includes the
new canonical filename, retaining dependency-change detection and extraction.
A focused regression reproduces the omission before the one-path correction.
No Dockerfile, cloud credentials, resource creation, production configuration or
Windows/loopback/TLS/storage guard bypass is introduced. DigitalOcean detection
is distinct from deployment; current runtime blockers are [explicitly recorded](06-delivery-and-operations/digitalocean-detection.md).
The owner confirms this is not fully live and authorizes pushing the fixes.
Main's existing PR/check/admin protections remain mandatory and are not disabled.

## Direct Uvicorn startup and approved browser trust (2026-10-16)

The conventional `app.main:app` object reuses the existing application factory,
routers, middleware, validation and lifespan; no database is connected at import.
No API, authorization, schema, cookie or facade transport rule changes. The bare
Uvicorn command starts HTTP for its liveness smoke; the connected CRM command
explicitly enables the existing HTTPS certificate and keeps access logging off.
Actual HTTPS liveness/facade readiness200 and unauthenticated direct readiness403
pass, including real reload. No HTTP facade fallback or TLS bypass was added.

Khalid explicitly approved adding the existing project CA to his CurrentUser
trusted roots. The leaf was first verified against that exact CA; a fresh store
read and Windows default-chain verification confirm the installed authority.
Machine-wide roots were not changed. Ordinary Chrome and the in-app browser
hydrate the dev login without bypassing a security interstitial. Private keys and
configuration remain ignored and unprinted. A new account/checkout still needs
its own approval, not an automatic trust import. [Evidence and limits](06-delivery-and-operations/local-startup-execution.md#direct-uvicorn-and-approved-currentuser-trust).

## GitHub publication and CI boundary (2026-10-16)

Public publication excludes real configuration, credential note, keys, private
files/backups and generated evidence. Pattern-based full-history scans are
redacted, with narrow reviewed upstream-example exceptions. The initial staged
blob scan compares seven known private runtime values in memory and finds zero
matching files. Index guard13 ignore probes pass; isolated temporary-index tests
reject an ignored env file, an unknown archive and a symlink. Ten shadcn archives
independently match the pinned upstream Git blob IDs; all11 allowed reference
archives have explicit SHA256s. Licenses/notices remain; no new KAY license invented.

Hosted CI uses new loopback-only PostgreSQL18 targets with random masked
credentials, fresh HTTPS/facade keys and real ClamAV. Provisioning refuses
workstations/existing configuration/targets. No local secret or self-hosted runner
is used. Real byte readiness includes clean/rejected cases, not just PONG. Matrix
jobs do not share clusters; existing identity/lease/current-scope rules remain.
Workflow token is read-only, review approval disabled, actions SHA-pinned and
credential persistence off. Repo read-back confirms secret scanning/push protection,
Dependabot security updates and full-SHA action enforcement enabled, without paid
features. Main protection is applied/read back only after actual successful CI.

Khalid approved only existing dev-only GHSA-vfj7-8cjw-p6xm until2026-11-15T00:00Z.
All runtime/new/critical/expired advisory cases fail. Eight dependency-policy
tests cover positive/negative/expiry/cycle cases; six CI-bootstrap tests cover
workstation refusal and scanner-readiness control flow. This does not claim the
full npm audit is clean or certify deployment/real data. [Execution and limits](06-delivery-and-operations/github-ci-execution.md).

## Iconsax migration boundary (2026-10-16)

[Migration evidence](reference/iconsax/execution.md):279 baseline Python sources
and71 pre-existing chart/brand/public files retain SHA-256 hashes. All21 icon
consumers differ only by imports/identifiers; fields, labels, actions, roles and
permissions are unchanged. Selected integrity-verified official Free SVG paths
are static React code, no unsafe SVG HTML injection, IDs, scripts, external
references, runtime loader, CDN requests, premium key or new icon package.
Free proprietary notice is retained in source and public distribution; npm's
MIT metadata is not misrepresented as the SVG license. Final4-root/321-JS scan:
0 facade-secret/0 signing-key matches. Test identity/lease/root guards precede
synthetic cleanup;66 test record tables empty, development unchanged read-only.
Project service listeners0; shared PostgreSQL/unrelated resources preserved.

## Approved V3 UI-only boundary (2026-10-16)

All272 baseline backend Python sources (application, migrations and tests) retain
their hashes. No API contract, authorization, migration, secret or business rule
change is authorized by this redesign.17 original form sources retain all87
field-site signatures, excluding presentation classes/placeholders. Client role
visibility remains supplementary to authoritative backend checks. Read-only
status strips do not invent transitions; previews use the existing clean-image
metadata plus private permit/byte transfer and revoked transient blob URLs.
Decorative generated city/villa images are not real property evidence.

Synthetic isolated browser checks exercise session/CSRF, permissions, private
files, imports/exports, financial originals, retry/conflict and recovery. Shipping
source/public assets remain frozen during recovery because they are included in
its compatibility fingerprint; no guard was bypassed after the interrupted first
attempt. Historical scan and cleanup results were recorded for that scoped run.
No production, real-client data, external messaging or deployment was used.

Final V3 closure:4 client roots/313 JS have0 configured facade-secret and
0 signing-key occurrences;20 report JSON/47 step arrays have0 detailed input
arrays. TestOID109061 guarded cleanup removes1 synthetic residual row/50 orphan
objects and leaves66 record tables empty/bootstrap unset. RecoveryOID109063 has
0 public tables/0 private objects; read-only developmentOID109060 stays empty
with default policy1/capacity2. All identities independently match the expected
cluster; development storage was excluded. Application services are stopped by
their supervisor; the task-started antivirus service is stopped separately with
its cache/volumes retained. Shared PostgreSQL is preserved.

SP-22 reviewed boundaries: [execution](03-planning/sprints/sp-22-execution.md),
[AT map](03-planning/sprints/sp-22-acceptance-map.md) and
[local procedure](06-delivery-and-operations/local-final-acceptance.md).
The cumulative real-PostgreSQL suite and corrected migration/recovery runs cover
current role/contact authorization, private permits/bytes, atomic imports,
finance originals, signed intake, independent-connection races and durable replay.
The populated0020 migration repair flushes existing deferred constraints before
ALTER TABLE; no data/history/security guard or model is weakened.

Benchmark tools resolve the live fixed benchmark identity independently of
development, reject nonempty seeding/aliases and use synthetic identities only.
Random credentials remain current-user DPAPI protected outside source/public
roots; HTTP sessions/CSRF/verified loopback TLS stay real. The load runner owns
only its exact API child tree/8200 and uses failure-inclusive, in-flight-reconciled
latencies; it cannot turn missing/short measurement into a pass. Fresh-install
checks inherit private configuration in memory, never echo/copy it to examples.
Final browser/load/privacy closure passes in the ledger. Chart totals reuse
complete scoped groups; exact collection sum/count share one statement and the
same repeatable snapshot. No permission cache or widening. Bounded1..4 normal
API processes retain current PostgreSQL sessions/CSRF and maintenance leases;
the passing load uses4, at most20 pooled query connections, unchanged SQL budget.
Final285 browser JS have0 configured-secret matches; report detailed arrays0.
Development is unchanged, guarded synthetic test/recovery cleanup and owned
process shutdown pass. No production,
real-data operation, public backup API, real-site connection or external send.

SP-21 reviewed boundary: [runbook](06-delivery-and-operations/local-backup-recovery.md)
and [actual evidence](03-planning/sprints/sp-21-execution.md). Operator-only venv
CLI, fixed PG18 binaries/no shell, private temporary passfiles, bounded redacted
errors; no public backup route or credential output. Current-user DPAPI chunks
bind point/name/index, manifest HMAC and payload SHA256 detect replacement;
protected DACL/fixed roots/reparse guards exclude public paths and .env/keys.
Live cluster/OID checks independently exclude development/test/benchmark aliases
before recovery-only DDL. Incompatible/corrupt points and changed current
authority reject before replacement. Missing/stale ready marker fails closed.

Maintenance drains complete API streams/worker cycles and table locks protect
the coherent snapshot. Crash leaves intent closed; active/unknown owners cannot
be resumed. Restore revokes all sessions/permits, fences old running jobs,
disables website sources, retains finance/committed imports/history and does not
promote unscanned bytes. Actual worker replay/old access/bootstrap/copied-ID
denials, controlled retention and real concurrent drain pass. No blind source-
authority merge/offline opening or total-source-loss claim. DPAPI profile/laptop
loss, real-data retention/key escrow and production opening require separate work.
Final privacy: 285 JS / 0 configured-secret matches, report detailed arrays0,
14 private/generated paths ignored and0 tracked. Synthetic cleanup only.

SP-20 reviewed boundaries: [signed intake contract](04-design/website-intake-local.md)
and [execution](03-planning/sprints/sp-20-execution.md). Configured source authority
is distinct from staff session/role; no public registration, owner injection,
existence disclosure or browser signing key. Strict HMAC/raw bytes/current source/
five-minute window, streamed body cap and persistent rate counter precede durable
receipt. Stable receipt/status expose exactly two safe fields. Current phone scope
and active routing are rechecked inside the shared agency lock; known data is not
overwritten. Atomic database-only worker claim/effects survive actual process
kill; bounded retries retain failed receipts for local explicit recovery.
SQL XOR/immutable provenance/deferred receipt/outbox guards preserve true source
and legacy staff actors. Separate127 host excludes localhost staff cookies;
strict Host/Origin/JSON and verified loopback TLS/no proxy/redirect preserve local
boundary. Populated test migration and additive dev migration preserve data.
Secret bundle/report/ignore checks are recorded in execution. No production,
real-data intake, external send, new dependency or antivirus bypass.

SP-19 boundary evidence: [contract](04-design/discovery-contract.md) and
[execution](03-planning/sprints/sp-19-execution.md). Current contact scope filters
search/count/document names before projection. M/A-only own-job CSV uses fixed
columns, Unicode/control/formula neutralization and forced phone text; current
originating session is rechecked during generation/publication and current
issuing session before single-use private delivery. Wrong Origin/binding/role,
revocation, interruption/retry/fencing/limit and archive/commercial races are
covered. No raw transfer/file URL or filter payload in metadata/public output.
Controlled24-month security-only purge preserves contacts/business/finance and
exact cutoff; development retention was not executed. Additive0020/21 upgrade
retains IDs/FKs/true actors/history. No new dependency, real-data export, external
send, production operation or antivirus bypass. Independent product review and
unapproved business/finance retention remain separate.

Status: active review gate; SP-01–SP-20 accepted evidence is scoped per sprint; full-product testing pending
Date: 2026-10-16  
Confirmed decisions: protected clients and owner files, revocable PostgreSQL sessions, backend-enforced permissions, private Spaces, audited finance/imports, and the retention constraints in the security specification.  
Technical proposal: apply the review and evidence checklist below to relevant tasks.  
References: [security and privacy contract](04-design/security-and-privacy.md), [permissions](../permissions.md), [API contracts](04-design/api-contracts.md), [data model](04-design/data-model.md), [agent harness](HARNESS.md), KV `Knowledge/Engineering/Security Best Practices.md` and `Agentic Coding/Templates/Security Check Template.md`.

Use this gate when a task touches authentication, authorization, any private record or file, import/export, finance, external form intake, worker/outbox side effects, migrations, logs, secrets, or deployment. A task may mark an item not applicable with a reason; it must not silently skip an applicable check.

## Review by boundary

| Boundary | Questions and negative cases |
|---|---|
| Identity and session | Is first-admin bootstrap local, one-time, transactionally guarded, and unavailable over HTTP or on a nonempty installation? Do temporary credentials expire, restrict access until change, and stay out of logs/output? Does every protected request verify the current, non-revoked session and active account? Do password reset, role change, and logout revoke affected sessions? Are CSRF, cookie settings, and cache controls preserved? |
| Role and object scope | Can Agent A access Agent B's private contact by changing an ID, URL, filter, export, or file permit? Do collaborators have only their documented access? Are manager and admin rights aligned with `permissions.md`? |
| Screen and schedule scope | Does an agent dashboard exclude unassigned work and agency-wide inventory totals even though shared Projects inventory remains readable? Can a hidden Settings link still be reached by URL/API? Are working-time and company-car-capacity writes administrator-only, versioned, and audited? Can concurrent bookings exceed the cap? Can project briefing text or configurable table columns expose protected contacts? |
| Inventory and deal invariants | Can concurrent requests create two active reservations on one offer or conflicting whole-development/unit reservations, reopen without stock review, or leave sale/rental effects inconsistent across project and child units? Can a whole-development close silently include a sold/leased child? Are state transitions audited with the true actor? |
| Commission and import | Can a non-manager recognize or receive commission, or collect beyond the balance? Does an interrupted/duplicate import remain atomic and retry-safe? Are previews and files protected as personal data? |
| Files | Is the Spaces bucket private? Are transfer permits short-lived, single-action, session/resource scoped, and rechecked? Can a quarantined, infected, or unscanned file be downloaded? Are private owner/developer documents kept out of shared development/property attachments and project rollups? |
| Website connector and workers | Is the connector authenticated and replay-safe? Do outbox consumers deduplicate effects, bound retries, and recheck permissions where the deferred action needs them? |
| Input, output, and logs | Are CSV/form/file inputs validated? Do errors avoid raw sensitive values? Are tokens, cookies, permits, passwords, phone numbers, documents, and private notes absent from logs, traces, screenshots, and analytics? |
| Operations and privacy | Are secrets external to source? Are migrations and backups compatible? Are retention and international-flow questions resolved before real-data launch? Does restore preserve revocation and authorization safety? |

KAY uses database-backed sessions, not the generic KV JWT pattern. Its chosen file flow streams through FastAPI with private Spaces, not a public bucket or permanent presigned URL. KAY's numbered pagination and one-team scope also override generic cursor and multi-tenant examples. Do not replace these project contracts while applying general security advice.

[SP-06 security record](03-planning/sprints/sp-06-evidence.md#security-boundary-record)
adds immediate transfer/collaborator revocation, current-scope replay, immutable
true-actor business history, archived/merged alias authorization and transactional
enquiry repair. Same-S and M/A cross-portfolio merge, private-target denial,
stale linked previews/both versions, separate-connection races and rollback are
covered. Populated active/disabled migration backfill retains real provenance;
unknown future contact-FK modules fail closed until the merge service is extended.
Final bundle/report/privacy/fixture evidence is recorded there; product review
and later file/finance/import/website/restore boundaries remain separate.

[SP-05 security record](03-planning/sprints/sp-05-evidence.md#security-boundary-record)
adds canonical-contact scope, private-first display-name-only phone conflict,
strict contact/enquiry projections, atomic audit/retry, independent uniqueness/
current-actor races, immutable provenance and migration isolation. Harness lease
prevents overlapping fixture cleanup. Final browser/report/artifact results are
recorded in that execution record, not inferred from the earlier identity gates.
Inventory/files/finance/import/website/worker/restore remain later boundaries.

## Evidence record for a task

[SP-08 security record](03-planning/sprints/sp-08-evidence.md#security-boundary-record)
covers development/unit/type target boundaries, same-project constraints,
target-level ownership/price, separately scoped developer/owner identities,
escaped optional briefing, strict facade/CSRF/body/query bounds, typed history/
receipts/audit and contact-merge provenance. Actual PostgreSQL race/revocation/
rollback and populated migration checks are recorded. Browser/privacy completion
and independent product review must be read from that execution record, not
inferred from this link. Later files/reservations/outcomes/finance/import/worker/
recovery/full-product boundaries remain separate.

[SP-07 security evidence](03-planning/sprints/sp-07-evidence.md#security-boundary-record)
covers M/A-only commands, shared facts versus separately scoped owner identities,
strict facade/session/CSRF, waiting role denial, independent campaign uniqueness,
version/retry/rollback, merge provenance and immutable availability/price history.
Reviewed0007/0008 and real PostgreSQL nonfinite-value/migration rollback probes are
included. Final cumulative browser/report/privacy acceptance belongs to that
record; no cloud/file/import/finance/outcome/full-product acceptance is inferred.

```text
Task and requirement IDs:
Security-sensitive boundaries:
Contracts read:
Files, routes, and data paths inspected:
Positive test or review:
Negative permission and cross-record tests:
Concurrency, retry, or interruption test:
Command and result, or reason not run:
Risk found and fix:
Remaining concern:
Security checked: yes / not applicable / blocked
```

Before release, this evidence joins the [acceptance tests](05-quality/acceptance-tests.md) and [release gate](06-delivery-and-operations/release-and-recovery.md). It does not replace professional legal/privacy review or a tested application.

SP-03's completed [security boundary record](03-planning/sprints/sp-03-evidence.md#security-boundary-record)
covers bootstrap, current session/role/credential, CSRF/Origin/facade, logs and
diagnostic privacy, real PostgreSQL atomicity/races and migration isolation.
Other record/file/finance/import/connector/restore boundaries are explicitly N/A
for this slice, not accepted by inference. The corrected synthetic diagnostic
capture and native Windows WebKit limitation are recorded, not hidden.

[SP-04 security evidence](03-planning/sprints/sp-04-evidence.md#security-boundary-record)
covers administrator-only user operations, temporary/handoff/expiry, reset proof,
revocation/attribution, last-admin/current-actor races, versioned non-secret retry,
actual rollback, strict transport and private diagnostics. 0003 migration isolation,
expanded production/dev bundle scan and final report-step inspection are recorded.
Records/files/finance/import/website/worker/restore boundaries are N/A for this
implementation, not accepted through an identity test. Actual staff delivery,
production privacy/least privilege and real Safari/devices remain separate.

[SP-09 security evidence](03-planning/sprints/sp-09-evidence.md#security-boundary-record)
records current-scope typed private/shared parents, direct session-bound hashed
permits with separate transient issuing-session proof, exact-origin CORS, strict
file validation/limits, immutable private objects and actual antivirus quarantine.
It covers single-use/revocation/race/rollback, worker fences/retries/dedupe,
publication failure/orphans, document merge provenance and migration isolation.
The local roadmap uses a confined filesystem adapter; it does not provision
cloud Spaces or public URLs. Real scanner/bytes and separate worker are required.
Final matrix/report/client/privacy and independent UI-review results must be read
from that record. Signature freshness, real-data policy, production ACLs,
deployment and measured recovery remain explicit later boundaries.

[SP-10 security record](03-planning/sprints/sp-10-evidence.md#security-boundary-record)
covers current linked-contact scope for independent searches/counts/shortlists,
safe shared offering targets without private owner identities, strict typed
criteria/money, exact normalization, versioned authorized retry, immutable origin
and history, SQL/FK/unique/intent guards and merge-preview impact. Real PostgreSQL
wait/revocation/race/rollback and committed-response interruption are exercised.
Final cumulative browser/privacy/isolation gates pass in that record; independent
UI review resolved its one functional finding, without human approval. Manual
selection grants no reservation, deal, finance, import,
production or full-product acceptance.

## SP-11 security boundary

[Execution evidence](03-planning/sprints/sp-11-evidence.md#security-boundary-record)
tracks scoped deals/proposals/history/counts, denied copied IDs, true current
identity after lock waits, version races, replay after revocation and atomic
rollback.0013 adds immutable typed origins/targets/actors and deferred history/
period/context guards. Ordinary writes cannot reserve/close or alter stock.
Merge preserves independent deals and authors while inheriting survivor scope;
private deal files reuse quarantine/real ClamAV/single-use transfer permits.
Strict server-only HTTPS facade, CSRF/Origin, no-store and bounded bodies/pages
remain authoritative. Final browser/client/report/privacy/isolation findings
must be read from the execution record, not inferred from this checklist.

## SP-14 security boundary

[Execution evidence](03-planning/sprints/sp-14-execution.md) tracks current linked
contact scope for visits/details/history/counts, administrator-only policy
changes, participant eligibility and safe colleague free/busy. Participation is
not a new detail permission. A copied private ID is404; scope is rechecked after
locks and before old receipts. Strict bounded facade bodies/queries, HTTPS,
Origin/CSRF/no-store and versioned hashed retry identities remain authoritative.
Policy and bookings share agency/user/policy lock order; hard scheduling/car
limits cannot be overridden by an ordinary overlap reason. Atomic events,
participants, audit and receipts survive interruption without duplicate booking.
Immutable origin/organizer/history survive transfer/merge. Migration guards and
retained-history/development downgrade refusal protect persisted facts. Safe
capacity totals/busy intervals expose no private title/contact/record identifier.
No external message, reminder worker, fleet assignment or production access.
Final full regression/privacy/isolation evidence is required separately; this
boundary description alone is not a passing security test.

## SP-13 security boundary

[Execution evidence](03-planning/sprints/sp-13-execution.md) tracks explicit
contact-scoped close/reopen, manager-only external stock, current authority on
retry and after stock waits, strict reviewed target/version/fingerprint bodies,
atomic history/outbox and shared-stock privacy. SQL guards protect terminal
stages, committed terms and append-only outcomes/effects/reversals; retained
history and development downgrades fail closed. Original actor/responsibility
snapshots are not rewritten by transfer, merge or reopen. Shared stock history
uses safe fixed KAY descriptions, never private outcome amounts or explanations.
No new finance, notification consumer, external messaging or production access
is introduced. Final browser/privacy/isolation results remain required in the
execution record; this checklist alone is not a passing test result.

## SP-15 security boundary

Task ownership cannot grant contact access. Authorize current session/contact
and optional same-contact deal before reads/writes/receipt replay; preserve
archive read-only behavior and immutable origin/actors across merge. Personal
inbox scope precedes counts/pages/unread totals, and obsolete/private items
cannot be marked read or opened through copied IDs.

Recheck current active-account/contact scope after acquiring the agency delivery
lock. Queue and notification rows contain typed IDs/kind/version, not cached
private text. SQL canonical keys, recipient/event uniqueness, immutable history
and monotonic read state complement fenced bounded claims and atomic command/
outbox commits. Status output is aggregate-only; fixed error codes do not log
private exceptions. No public clock override or external send is added.

[SP-15 evidence](03-planning/sprints/sp-15-execution.md) records actual negative,
race, retry, migration, browser and privacy checks. Test cleanup requires the
verified isolated target, advisory lease and synthetic-only account guard.

## SP-16 finance security boundary

Finance reads/counts/detail/history and every command require current M/A authority
before private lookup. Agent deal data contains no financial projection. After
agency/identity waits and before old-key replay, recheck active identity and
current contact/archive access. Positive strict decimal strings exclude float,
nonfinite/scientific and directly editable balance/state input. Commission locks,
versions and deferred SQL balance/chain constraints prevent over-collection;
append-only corrections retain actor/reason/original links. Commands, audit and
private retry result are atomic. Reopen review cannot erase or recalculate facts.
Optional proof binds a current clean same-deal/contact document version without
granting file transfer. Migration/fixture cleanup preserve target identity and
advisory-lease guards; no production/real records/secrets are introduced.
[SP-16 execution](03-planning/sprints/sp-16-execution.md) records actual focused
negative/race/retry/migration/browser evidence and retained untouched boundaries.

## SP-17 read-only reporting boundary

Current active identity and canonical contact scope precede all aggregates,
groups, pages and detail links. Agents see exact linked offerings, never expanded
agency-wide stock from shared Projects authority; finance is absent and direct
collections requests deny403. Portfolio uses current primary, outcomes immutable
primary-at-close, timeline true actor. READ ONLY REPEATABLE READ keeps one
response coherent through transfer; the next revoked read loses access. Current
alerts never write stock/outcomes. Strict facade query allowlists/duplicates,
bounded dates/pages, no-store and current session checks remain authoritative.

[SP-17 execution](03-planning/sprints/sp-17-execution.md) records actual scoped
positive/negative/invalid/transfer-snapshot/retry/browser evidence, zero client
secret matches, private report checks and guarded isolated cleanup. Synthetic
fixtures only; no new migration, credentials, production access or external send.

## SP-18 atomic CSV import boundary

Current M/A authority controls upload metadata, preview, row pages and permanent
result replay; agent denial precedes private lookup. Exact-origin direct uploads
use two-minute single-use hashed permits/session proof and bounded bytes. Private
UUID objects have no raw download/public/preview route; current authority and
generation are rechecked before publication. CSV text is strictly parsed, never
executed or rendered as an uploaded document; the antivirus document path stays
unchanged. Source/errors/notes never enter diagnostic logs or browser storage.

Agent/phone/hash revalidation and existing agency serialization precede ONE
approval transaction, including501-row multi-chunk rollback. Normalized phone
uniqueness rejects new competing claims; bounded sorted lock buckets avoid an
unbounded advisory-lock allocation. Permanent same-key/body batch result handles
post-commit response loss without duplicates. Imported original identities/agents,
true actor and notes survive authorized merge; ordinary APIs cannot forge CSV
provenance. SQL evidence guards, populated migration and retained-data downgrade
refusal are tested. [Actual evidence](03-planning/sprints/sp-18-execution.md)
separately records final browser, privacy, fixture and development isolation.
Real-data retention, export and production security review remain out of scope.

Final SP-18 client scan:4 roots/285 JS/0 configured-secret matches; private
report2 JSON/0 detailed step arrays,10 private/generated paths ignored/0 tracked.
Development OID109060 remains0 records after additive0019; isolated testOID109061
cleanup verifies exact private test root/exclusive lease and leaves63 record
tables0 rows/bootstrap unset. No real-data import, external send or production
access. Both verified schemas head0019/no drift. Synthetic fixture deletion
and expired/orphan reconciliation do not establish a real-data retention policy.

## Local runtime repairs (2026-10-16)

Subsequent app-wide button refinement adds only explicit presentation metadata,
the shared shadcn composition and selected verified Iconsax assets. Labels,
hrefs, types, disabled gates, handlers, command bodies and real authorization
remain. Destructive business cancellation stays separate from neutral dialog
dismissal; archive/release/outcome confirmations and required reasons remain.
Backend and GitHub workflow diffs are empty. Compiled headed checks exercise
actual staff handoff/password/session/disable, role/private-ID denial and safe
read retry alongside real record creation/proposal/stage changes. All43 inline
glyphs have no external SVG references or offline requests. No premium key,
secret, dependency install, production access or real customer data is used.
Synthetic post-login captures and test profiles stay ignored; no issued
credential capture. This is not a complete production/release security result.

Subsequent Lead/Deal fact-layout refinement is UI-only: backend and workflow
diffs remain empty, HTTPS/session/CSRF/authorization/version checks are unchanged.
Guarded synthetic headed checks verify actual creation/edit/retry/conflicts and
real copied-ID denial for another agent; unauthorized facts/contact name are
not rendered. Admin-only assignment remains absent for agents. No production
database, real records, secrets, export or external send is used. Screenshots
are post-login synthetic only; output/test-results paths remain ignored.
Focused UI evidence is not a complete database/release/security-suite pass.

No facade/identity/secure-cookie/TLS checks were disabled. The Windows server loop
change does not filter exceptions or logs. Static filename compatibility accepts
the decoded `@` needed by a Next helper; fixed loopback upstream/static prefix,
traversal/host rejection and staff-API exclusion remain tested. No general proxy,
new WebSocket route or permanent CORS/origin widening was introduced. Development
simulator failure remains explicit; compiled mode passes its real signed workflow.

No Windows root-store mutation or administrator bootstrap occurred. Node probes
verify the known project CA; disposable headed browser TLS exceptions are not a
production policy. Final browser-build scan:4 roots/351 JS/zero configured secret
matches. Guarded test-only cleanup and a separate read-only development check are
recorded in [startup execution](06-delivery-and-operations/local-startup-execution.md).
