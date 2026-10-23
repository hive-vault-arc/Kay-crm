# Requirements, rules, and evidence traceability

## Live updates extension (2026-10-22)

Authenticated freshness and notification authority map to test_realtime.py,
test_realtime_capacity.py, frontend realtime.test.mjs and tests/realtime/live.spec.ts.
The existing100-user benchmarks/locustfile.py adds sockets and safe aggregate
diagnostics without changing HTTP mix or latency limits. See the
[contract](../04-design/realtime.md), [execution](../03-planning/realtime-execution.md)
and [QA register](../QA_COMMANDS.md); hosted/physical-device gates remain separate.

## Projects reference (2026-10-18)

D39 / C04/C13/C14 / AT-06/23/27/31/35/36 map to `test_property_facets.py`,
existing inventory/edge/permission tests, facade/model `projects.test.mjs`,
real `projects-reference.spec.ts` and affected `inventory.spec.ts` checks.
The [ledger](../03-planning/projects-reference-refresh.md) separates actual
reference images, clean/private file fixtures, server counts and technical gates
from pending human visual/product approval. No migration or real seed.

## Calendar reference (2026-10-18)

D38 / C09/C13/C14 / AT-16/23/40 map to `test_calendar_filters.py`, existing
`test_schedule*.py`, facade/model `calendar.test.mjs`, real headed
`calendar-reference.spec.ts` and `schedule.spec.ts`. The
[ledger](../03-planning/calendar-reference-refresh.md) records populated-reference
comparison, exact server facets, privacy, layouts and intentional accessibility
differences. Tests are not Khalid's product/design approval.

## Staff setup/deletion (2026-10-18)

D37 / C01/C13/C14 / AT-01/02/23/38 map to `test_users.py`, `test_auth.py`,
`test_first_admin.py`, `test_staff_deletion.py`, facade `users.test.mjs`, real-stack
`users.spec.ts` and visible `users.chrome.spec.ts`. The
[ledger](../03-planning/staff-onboarding-deletion.md) separates current results,
local migrations, existing-account preservation and pending human review.

## Lead/Deal activities (2026-10-18)

C05/C08/C13/C14 and AT-04/05/23/24/39 map to the scoped
[activity contract](../04-design/api-contracts.md#leaddeal-activities-2026-10-18),
[model](../04-design/data-model.md#record-scoped-activities-2026-10-18) and
[implementation/evidence](../03-planning/lead-deal-activities.md).
`test_scoped_activities.py` verifies exact conversion origin, metadata/immutability,
current scope/replay, merge, HTTP guards and migration preservation. Visible
`scoped-activities.spec.ts` verifies separate tables, real entries, paging,
lost-response retry, forbidden/archived and loading/error/empty paths; existing
native200% record verification is rerun. The ledger records77 distinct scoped
PostgreSQL cases, not a complete backend aggregate. Local migration0025 was later
approved/applied with existing-row preservation; product review remains pending.

## Owner-requested Lead/Deal alignment (2026-10-17)

C02/C03/C08/C13 and affected AT-03/04/23/39 now map to the
[current contract](../04-design/deal-pipeline-local.md) and
[explicit requirement/evidence ledger](../03-planning/leads-deals-immoworld-alignment.md).
Backend qualification, manual-deal, conversion, history-guard and populated
migration tests exercise the new writable/read/history boundary. Compiled
`leads-qualification.spec.ts`/`deals-qualification.spec.ts` exercise actual
selected calling codes, client facts, project qualification, atomic edits and
conversion. Updated prior lead/deal tests retain private, stale, interrupted,
proposal, inventory and count assertions under the replacement workflow.
Native lead/deal reviews and directory-filter coverage retain responsive,
keyboard, touch, states and real200% checks. Each actual command/result and its
limitations belongs to the ledger; this mapping alone establishes no pass.

Earlier SP-22 counts and generated catalogue totals below describe that earlier
baseline, not automatic acceptance of this qualification extension.

SP-22 cumulative [AT01–41 map](../03-planning/sprints/sp-22-acceptance-map.md)
links every core variant to current backend/browser/negative/race/retry/recovery
evidence. [Execution](../03-planning/sprints/sp-22-execution.md) records actual
results and retained corrected failures; final local browser/load gates pass.
All486 current backend cases and134 compiled browser variants have passing
evidence across corrected runs, not single clean invocations. AT28 requires
explicit4 API processes; broader V3/product/device/production review is separate.
The new combined
merge case exercises all introduced current-parent modules with retained origins,
true authors/history, rollback/replay and current denial; the live contact-FK
registry remains fail closed. [API catalogue](../04-design/api-catalogue-local.md)
is generated from the actual123-path/153-operation schema, not the proposed list.
No final technical acceptance, real-device or product approval is implied yet.

SP-21 maps C14/C13, BR-02/06/23/24, AT-25 and recovery AT-02/26/37 to
app/recovery, app.cli.backup, test_recovery.py, affected test_foundation.py,
recovery.spec.ts and recovery.chrome.spec.ts. No schema or shipping UI change.
[Runbook](../06-delivery-and-operations/local-backup-recovery.md) defines point
coherence/protection/retention/target/current-authority and replay boundaries;
[execution](../03-planning/sprints/sp-21-execution.md) records exact positive,
negative, interruption/concurrent/retry/browser/privacy and measured local results.
Preserved all69 table digests include FKs/hierarchy/offerings/finance/policy/audit;
security reconciliation is separate and current source authority gates opening.
Same-laptop synthetic recovery is not full-volume/total-source-loss/production DR.

SP-20 maps C12/C02/C11/C14/C13, BR03/04/21 and intake AT22/30 plus affected AT23
to app/intake, migration0022, test_intake.py, test_intake_process.py,
test_intake_migration.py, intake.spec.ts and native intake review tests.
[Contract](../04-design/website-intake-local.md), [execution](../03-planning/sprints/sp-20-execution.md).
These cover signed bounded intake, durable replay, real worker kill/restart,
private phone routing/current authority, source authorship/merge and populated
migration. Cumulative SP22 and actual website configuration remain separate.

SP-19 C11/C14/C02/C04/C13, BR-04/06/21/23, AT-22/23/24/29:
[contract](../04-design/discovery-contract.md) and
[execution](../03-planning/sprints/sp-19-execution.md). Backend discovery modules
cover typed current-scope projections/counts, formula-safe whole-filter CSV,
origin/current-role rechecks, single-use private transfer, fenced retries,
archive concurrency and security-only24-month retention. Migration0020/0021
preserves FKs/actors/history and adds measured indexes. Discovery browser files
cover manager/agent search, filtered CSV/retry, lifecycle and contextual audit;
Settings remains admin-only. SP-20/21 record local intake/recovery; full-load cases remain SP-22.

SP-18 maps C11/C02/C13/C14, BR-03/04/20 and AT-20/21/23 to
[execution](../03-planning/sprints/sp-18-execution.md) and the
[import contract](../04-design/contact-import-local.md). test_imports.py and
test_import_http_migration.py cover parser/roles/assignment/phone races,
multi-chunk rollback/permanent retry, raw permit/privacy, merge origins and
populated additive migration. imports.spec.ts and imports.chrome.spec.ts cover
the real contextual CSV correction/approval/recovery and accessible UI. Actual
results, corrected attempts and independent review status belong to execution.

SP-17 reporting implementation and actual scoped verification are linked in
[execution](../03-planning/sprints/sp-17-execution.md) and the
[wire/metric contract](../04-design/dashboard-local.md). C10/C13/C14,
BR-05/18/19/28/29; AT-18/19, reopened-current-result AT-13 and dashboard count/
scope portions AT-36/39. Backend test_reports/test_report_edges cover SQL scope,
attribution, exact thresholds, finance leaves, civil dates and concurrent snapshot.
Frontend reports.spec and headed reports.chrome.spec cover real Bklit/API/table
parity, authorized links, periods, recovery and accessibility. Acceptance and
remaining review gates must be read from the execution record, not inferred.

Status: SP-01–SP-22 accepted local technical evidence; product/design review pending
Date: 2026-10-16  
Confirmed decisions: C01–C14 and BR-01 through BR-31; D29 selects local availability/schedule/screen defaults; Q-06 retains the safe block while expanded partial-development policy remains later validation.  
Technical proposals: tables, `/api/v1` operations, and `AT-*` scenarios.  
References: [scope](../../core-scope.md), [rules](../02-requirements/business-rules.md), [data model](../04-design/data-model.md), [API](../04-design/api-contracts.md), and [tests](acceptance-tests.md).

Each row starts with a rule and links its originating requirement, canonical data, API operation, and expected test. Relevant diagrams are grouped below. SP-01/02 setup/transport and SP-03 scoped identity variants have execution evidence; remaining full-product variants are planned, not passed.

## Implemented evidence

[SP-10 execution record](../03-planning/sprints/sp-10-evidence.md),2026-10-15 UTC:
C03/C04/C13,BR-06/07/08,AT-07/08 and offering-selector AT-36/scoped AT-23.
Independent typed criteria and original budgets, exact annual MAD comparisons,
real offering links/feedback, current-contact authorization and safe target
projection are implemented. Merge preserves origins/independence/history; SQL
guards, real races/revocation/rollback/retry and interruption pass in the full223
backend suite (94% coverage).160 distinct five-target cases through corrected
reruns,latest SP10 10/10,1 headed workflow/16 inspected valid captures and32 final
compiled HTTPS cases pass,zero skipped in final commands. Privacy/isolated cleanup/
shutdown/docs pass; original transient WebKit timeout and9 inherited HIGH tooling
entries remain disclosed. No automated recommendation, reservation, later core or
whole-product acceptance; Khalid's product/design review stays independent.

[SP-09 execution record](../03-planning/sprints/sp-09-evidence.md),2026-10-15 UTC:
C04/C14/C13, BR-02/06/23; file portions of AT-06/26/35 and scoped AT-23.
Private contact versus team-readable inventory documents, session-bound one-action
permits, direct authorized bytes, strict format/size validation, immutable private
quarantine and real ClamAV are implemented. Durable PostgreSQL claims/fences/retry,
current permission checks, merge provenance, archive, interruption/rollback and
orphan reconciliation are exercised.192 backend checks/94% coverage,115 cases
across five browser targets,1 headed Chrome workflow/15 inspected captures and23
optimized HTTPS smoke cases pass,zero skipped. Final privacy, isolated cleanup
and service shutdown are recorded; DESIGN/tokens preserved, AFTER009 has0 findings.
9 inherited HIGH dev-only npm entries, proposed parser guardrails and device/load/
recovery limits are disclosed. Product/design review remains pending Khalid;
later AT variants and SP-10–SP-22 are not accepted by these scoped results.

[SP-08 execution record](../03-planning/sprints/sp-08-evidence.md),2026-10-15 UTC:
C04/C11/C13/C14, BR-06/25/26/27/31. Implemented variants are AT-31 mixed-category
hierarchy, AT-32 reusable types with independent actual units, shared-project
AT-35, inventory/filter/navigation AT-36, optional plain briefing AT-41 and scoped
AT-23. Development and physical-unit campaigns retain separate owners/prices/
states; block/floor/type cannot become stock targets. Same-project SQL/API
constraints and immutable referenced targets protect history; template edits
rewrite no unit facts. Shared developer/owner projections require separate
Contacts scope for private identity. New links extend existing merge policy,
preserving origin/actor and survivor scope.163 backend checks pass (96% coverage);
105 distinct five-target affected cases are verified with failed/corrected runs
retained;5 headed and21 built HTTPS checks pass,zero skipped in final commands.
16 inspected captures,actual200% edit,privacy/guarded cleanup and limits are
recorded in that evidence,not inferred from source. Files, reservations/outcomes,
shortlist/search/dashboard, load/recovery and full-product variants remain their
own sprints; product/design review and AFTER008's optional LOW await Khalid.

[SP-07 execution record](../03-planning/sprints/sp-07-evidence.md),2026-10-15 UTC:
C04/C11/C13/C14, BR06/08/09/25. Implemented variants: AT-06 safe facts/permissions
(files remain SP-09), AT-08 price comparisons (matching remains SP-10), AT-27
incomplete/marketable drafts, AT-31 standalone categories (hierarchy remains
SP-08), and scoped AT-23.150 backend checks pass with97% coverage;190 five-browser
cases,43 unchanged headed cases plus corrected inventory review,and31 built HTTPS
checks pass with zero skipped.15 refreshed captures,actual200% edit,AFTER007 with
zero new findings and final privacy/guarded cleanup are recorded. Product/design
review pending. Legal-owner links extend existing
contact merge policy with preserved origins/actors and survivor scope; private IDs
are not exposed through shared inventory.

[SP-06 execution record](../03-planning/sprints/sp-06-evidence.md),2026-10-14–15 UTC:
C02/C05/C13/C14,BR-04/05/06/23/29. AT-05,merge variants of AT-04,contact AT-24
and scoped AT-23 pass: immediate primary/collaborator access changes,explicit
former-owner retention,true actor/previous/new attribution,invalid enquiry queue
repair,immutable notes/history,archive/restore and authorized transactional merge.
Original contact/enquiry IDs/provenance and source aliases remain identifiable;
collaborator grants are not unioned. Private targets/current-scope retry,both
versions/stale linked impact,phone limits,real separate-connection races and
rollback are covered.126 backend tests,97% coverage;155 five-browser cumulative
cases plus5 affected cases after mobile correction;36 headed and24 built HTTPS;
zero skipped. Populated active/disabled migration variants and final privacy/
cleanup pass. Product/design review and AFTER006 optional LOW await Khalid.
Later module links must extend the same merge service; SP-22 cumulative merge
regression remains future work,not an accepted full-product result.

[SP-05 execution record](../03-planning/sprints/sp-05-evidence.md),2026-10-14:
C02/C11/C13/C14, BR-03/04/06/21/29. AT-03, SP05 duplicate/private portions of
AT-04 and list/UI portions of AT-22/23/39 now have real-stack evidence:100 backend
tests (98% runtime coverage),130 five-browser cases,zero skipped. Atomic
contact+enquiry, maintained international metadata/primaries, person/organization
and multi-role identity, private-first display-name-only conflicts, scope before
search/count/page, versioned edits/retry, independent phone and version races,
interruption/rollback, current-actor/scope checks and isolated0004 migration.
Headed Chrome30/30, built HTTPS19/19 and final privacy/artifact checks also pass;
commands, actual200% zoom and safe capture review are recorded there.
Product/design review and
[AFTER audit005](../../anti-slop/audit-005-2026-10-14.md) LOW finding1 remain pending
Khalid. SP-05 alone did not accept assignment/collaboration/merge/history; SP-06
adds that evidence above. Signed intake,import/export,deals/dashboard and
full-product variants remain outside these slices.

[SP-04 execution record](../03-planning/sprints/sp-04-evidence.md), 2026-10-14:
C01/C13/C14, BR-01/02/06; local AT-01/38 and staff/session/UI portions of
AT-02/23 pass. Administrator-only Settings/users, 192-bit one-time temporary
credential, pending/handoff/24h/restricted change/fresh login, password-confirmed
reset, role/deactivation revocation, last durable administrator and observed
current-actor/role/disable races, versioned safe retry/rollback and no GET secret:
62 backend tests, 95 five-browser cases, 22 headed Chrome and 12 built HTTPS smoke
cases; zero skipped. [AFTER audit 004](../../anti-slop/audit-004-2026-10-14.md) has
one LOW mobile-table hierarchy finding pending Khalid's selection; no audit-only
fix. Actual administrator execution/staff delivery, real Safari/devices,
file-permit/restore and full-product variants remain separate. Product review pending.

[SP-03 execution record](../03-planning/sprints/sp-03-evidence.md), 2026-10-14:
C01/C13/C14, BR-01/02/29; AT-37 local bootstrap and the auth/session/UI portions
of AT-02/23/26/39 pass. Real hidden TTY, atomic first-admin/marker/audit, observed
PostgreSQL lock contention, Argon2id, generic/rate-limited sign-in, current
credential/role/expiry/revocation, facade/Origin/CSRF, restricted own-password
change and fresh login: 47 pytest, 70 five-target E2E, five focused pending-form
checks, 16 headed Chrome plus two extended visual cases, seven built HTTPS smoke
cases. [AFTER audit 003](../../anti-slop/audit-003-2026-10-14.md) has zero numbered
findings. Actual administrator execution/product review remain human operations;
At that historical SP-03 boundary, handoff/user management, business data, file/restore variants and actual
Safari/device validation are not claimed. Native Windows WebKit SameSite-reporting
limits and corrected diagnostic privacy issue are explicit in the evidence.

[SP-02 execution record](../03-planning/sprints/sp-02-evidence.md), 2026-10-14:
C13/C14, BR-22 and BR-24 foundation, AT-23/26 local-transport variants. Python
venv/hash locks, safe live/ready API, explicit-CA HTTPS facade and real status UI,
guarded PostgreSQL/Alembic setup passed: 14 pytest, 35 multi-browser E2E, eight
headed Chrome and four built-server smoke cases. Separate test/benchmark/recovery
identities are verified; no backup/restore, business authentication/CSRF/cookie or
full AT-26 acceptance is claimed. Product review remains pending.

[SP-01 execution record](../03-planning/sprints/sp-01-evidence.md), 2026-10-14: C13/C14, BR-22, AT-23 setup/shared-state variants. Locked install, lint/types/build, 30 multi-browser E2E, seven headed Chrome cases and four built-server smoke cases passed. French shell, responsive navigation, keyboard/focus, 200% zoom, loading/empty/error and shared form/table foundations are covered without business data. Backend permissions, authenticated roles and complete AT-23 feature coverage remain later work. Product review is pending; development-tool advisories are recorded, not called clean.

| Rule | C | Main data | Indicative API operation | Test |
|---|---|---|---|---|
| BR-01 | C01,C14 | `agency.bootstrap_completed_at`, `user`, `credential`, `audit_event` | Server-local bootstrap script, `POST /users`, `/auth/login` | AT-01, AT-37, AT-38 |
| BR-02 | C01,C14 | `session`, `credential`, `file_permit` | `/users/{id}/reset-password`, `/auth/change-password`, `/auth/logout` | AT-02, AT-26, AT-37, AT-38 |
| BR-03 | C02 | `contact`, `contact_phone`, `contact_email` | `POST /contacts` | AT-03 |
| BR-04 | C02 | `contact_phone`, `assignment_event` | `/contacts/resolve-phone`, `/contacts/{id}/merge` | AT-04, AT-42 |
| BR-05 | C02,C05,C10 | `contact_collaborator`, `assignment_event`, `timeline_event` | `/contacts/{id}/assign`, `/contacts/{id}/timeline` | AT-05, AT-18 |
| BR-06 | C02,C04,C08 | `development`, `property`, `document`, `contact` | `GET /developments/{id}`, `GET /properties/{id}` | AT-06, AT-26, AT-35 |
| BR-07 | C03 | `requirement`, `shortlist_entry` | `POST /requirements/{id}/shortlist` | AT-07 |
| BR-08 | C03,C04 | `requirement`, `offering` | `GET /offerings`, `PATCH /requirements/{id}` | AT-08 |
| BR-09 | C04,C08 | `offering`, `reservation` | `POST /deals/{id}/reserve` | AT-09 |
| BR-10 | C04,C08 | `property`, `offering`, `deal` | `POST /deals/{id}/close` | AT-10 |
| BR-11 | C04,C08 | `offering`, `deal`, `timeline_event` | `/properties/{id}/external-outcome` | AT-11 |
| BR-12 | C08 | `deal`, `deal_stage_event`, `customer_offer` | `/deals/{id}/transition`, `/deals/{id}/close` | AT-12 |
| BR-13 | C04,C08,C09 | `deal_outcome`, `offering`, `commission` | `/deals/{id}/reopen` | AT-13 |
| BR-14 | C09 | `commission` | `POST /deals/{id}/commissions` | AT-14 |
| BR-15 | C09 | `commission_revision`, `receipt` | `/commissions/{id}/receipts`, `/correct` | AT-15 |
| BR-16 | C06,C07 | `visit`, `visit_participant` | `/visits/{id}/confirm`, `/calendar/free-busy` | AT-16 |
| BR-17 | C06,C07 | `task`, `notification`, `outbox_event` | `GET /notifications`, `GET /tasks` | AT-17 |
| BR-18 | C10 | `assignment_event`, `deal_outcome`, `timeline_event` | `/reports/dashboard`, `/reports/activities` | AT-18 |
| BR-19 | C10 | `development`, `property`, `offering`, `deal`, `timeline_event` | `GET /reports/exceptions` | AT-19, AT-36 |
| BR-20 | C11 | `import_batch`, `import_row`, `contact_phone` | `/imports/{id}/preview`, `/approve` | AT-20, AT-21 |
| BR-21 | C11,C12 | `website_receipt`, `enquiry` | `GET /contacts`, `POST /intake/website/{source_key}` | AT-22, AT-30 |
| BR-22 | C13 | Interface states, record versions | Ordinary `/api/v1` routes (not connected in SP-01) | AT-23 setup [passed](../03-planning/sprints/sp-01-evidence.md); full-feature variants pending |
| BR-23 | C14 | `contact.archived_at`, `audit_event`, `deal_outcome` | `/contacts/{id}/archive`, `/restore` | AT-24, AT-29 |
| BR-24 | C14 | PostgreSQL/Spaces backups | Restore procedure | AT-25, AT-28 |
| BR-25 | C02,C04 | `contact`, `development`, `property.category`, `property_owner`, `development_owner` | `POST /developments`, `POST /properties`, `GET /contacts/{id}/portfolio` | AT-31, AT-35, AT-42 |
| BR-26 | C04 | `development`, `block`, `floor`, `unit_type`, `property` | `/developments/{id}/blocks`, `/blocks/{id}/floors`, `/developments/{id}/unit-types`, `POST /properties` | AT-31, AT-32, AT-36 |
| BR-27 | C04,C08 | `offering`, `reservation`, `development`, `property` | `POST /offerings`, `/deals/{id}/reserve` | AT-33 |
| BR-28 | C04,C08,C10 | `deal_outcome`, `offering`, `reservation`, `timeline_event` | `/deals/{id}/close`, `/reopen`, `/reports/exceptions` | AT-34, AT-36 |
| BR-29 | C01,C02,C08,C10,C13 | `enquiry.assigned_agent_id`, `contact`, `deal`, role-scoped report projection | `/auth/login`, `/reports/dashboard`, `GET /enquiries`, `GET /deals` | AT-39 |
| BR-30 | C01,C07 | `visit`, `visit_schedule_policy`, `visit_working_window`, `visit_break_window` | `GET /visit-schedule/policy`, `POST /visit-schedule/policy/preview`, `PUT /visit-schedule/policy`, `GET /calendar/availability`, `/visits/{id}/confirm` | AT-40 |
| BR-31 | C04,C13 | `development.briefing_text`, protected `contact` | `GET/PATCH /developments/{id}` | AT-41 |

Assumptions H-01/H-02/H-03 link to `property`, `property_owner`, `development_owner`, `offering`, availability routes, and AT-27; Q-06 links to whole-development close and AT-34; accepted local Q-07 links to AT-40 hourly/DST assertions; Q-08 local placement guides the implementation route manifest. D29 makes the selected local variants actionable; later real-data policy remains separate. The [screen map](../04-design/screen-map.md) supports BR-29/31, and the [visit-scheduling diagram](../../diagrams/visit-scheduling.mmd) supports BR-30. The [hierarchy](../../diagrams/inventory-hierarchy.mmd), [conceptual](../../diagrams/data-conceptual.mmd), and [logical](../../diagrams/data-logical.mmd) data diagrams support BR-03 through BR-15 and BR-25 through BR-28. [Context](../../diagrams/context.mmd), [components](../../diagrams/components.mmd), [auth](../../diagrams/auth.mmd), and [files](../../diagrams/files.mmd) support BR-01/02/06/21/24. [Responsibilities](../../diagrams/responsibilities.mmd), [deal states](../../diagrams/deal-states.mmd), [offering states](../../diagrams/offering-states.mmd), [atomic import](../../diagrams/import-atomic.mmd), and [recovery](../../diagrams/recovery.mmd) complete the visual evidence.

## Reverse coverage by requirement

| Requirement | Rules and scenarios |
|---|---|
| C01 | BR-01/02/29/30, AT-01/02/26/37/38/39/40 |
| C02 | BR-03/04/05/06/25/29, AT-03/04/05/06/31/35/39 |
| C03 | BR-07/08, AT-07/08/36 |
| C04 | BR-06/08/09/10/11/13/25/26/27/28/31, AT-06/08/09/10/11/13/27/31/32/33/34/35/36/41 |
| C05 | BR-05, AT-05 |
| C06 | BR-16/17, AT-16/17 |
| C07 | BR-16/17/30, AT-16/17/23/40 |
| C08 | BR-06/09/10/11/12/13/27/28/29, AT-09/10/11/12/13/33/34/39 |
| C09 | BR-13/14/15, AT-13/14/15 |
| C10 | BR-05/18/19/28/29, AT-18/19/28/36/39 |
| C11 | BR-20/21, AT-20/21/22/29/36 |
| C12 | BR-21, AT-22/30 |
| C13 | BR-22/29/31, AT-23/36/39/41 |
| C14 | BR-01/02/23/24, AT-02/24/25/26/28/29/30/35/37/38 |

The accepted local defaults and later actual-website/expanded-commercial/real-data validations appear in the [decision register](../../decisions.md). The [sprint index coverage map](../03-planning/sprints/README.md#acceptance-coverage) assigns AT-01–AT-41 to the original implementation stages and final regression; AT-42 covers the post-roadmap owner directory. Any rule change must update its linked routes, model, and scenarios before a release.

## SP-09 executable traceability

| Scope | Implementation | Executable evidence |
|---|---|---|
| C04/C14, BR-02/06/23, file portions AT-06/26/35 | `backend/app/files`, document merge adapter, typed SQL constraints, strict facade/direct transfers, shared FilePanel | `backend/tests/test_files.py`, `test_file_edges.py`; `frontend/tests/e2e/files.spec.ts` |
| C13, AT-23 file surfaces | French shadcn/Tailwind controls, live states, parent reset, numbered pages and focus recovery | `frontend/tests/review/files.chrome.spec.ts`, actual native captures and AFTER audit |
| Outbox/antivirus durability | PostgreSQL dispatch/lease/fence/dedupe, real pinned loopback ClamAV, private immutable storage | Separate-connection claims, stale fence, scanner unavailability/exhaustion/retry, aborted stream/publication rollback and real browser worker restart |

Current commands/results, historical failures and remaining limits belong to the
[SP-09 execution record](../03-planning/sprints/sp-09-evidence.md), not to the
existence of these tests. Deal documents await SP-11; full notifications await
SP-15; measured recovery/load/full-product acceptance await SP-21/22. Product
review remains independently pending.

## SP-11 executable traceability

| Scope | Implementation | Executable cases |
|---|---|---|
| C08/C02, BR-05/06/12/29, AT-12/39 deal variants | app.deals; explicit contact-scoped creation, fixed ordinary stages, separate proposals | backend test_deals/test_deal_edges; frontend e2e/deals.spec.ts |
| C14, current scope/merge/file provenance | typed SQL FKs/events/receipts; current authority; inherited private files and merge preview | backend test_deal_links and earlier file/contact suites |
| C13, AT-23 deal surfaces | incumbent French shadcn/Tailwind list/create/detail, states, focus/touch/zoom | review/deals.chrome.spec.ts; native captures and AFTER audit |

Results, corrected attempts and unverified boundaries live in
[SP-11 evidence](../03-planning/sprints/sp-11-evidence.md). Full AT-12 closing is
SP-13 and AT-39 metrics SP-17; no full-product or human acceptance is inferred.

## SP-12 executable traceability

| Scope | Implementation | Executable cases |
|---|---|---|
| C04/C08, BR-09/27, AT-09/33 reservation variants | Inventory reservation boundary, partial unique indexes, development-first sorted locks, dedicated deal commands | `backend/tests/test_reservations.py`; forced two real PostgreSQL session waiters; `frontend/tests/e2e/reservations.spec.ts` |
| C14, retry/interruption/history | Existing deal receipts, immutable reservation identity, deal/inventory/contact history and typed stock outbox | Before-commit rollback, after-commit interruption/replay, no-expiry clock, direct-SQL negatives and `test_reservation_migration.py` |
| Current permissions and prior workflows | Current contact scope and session checks, archived read-only behavior, explicit release, transfer/merge provenance; unchanged file worker kind filter | `test_reservation_http.py`, archive/restore/transfer/merge cases and earlier full backend/deal browser regression |
| C13, AT-23 | Existing French KAY detail and shared inventory status; shadcn confirmations, preserved reason and explicit refresh | `frontend/tests/review/reservations.chrome.spec.ts`; native captures, geometry/contrast/keyboard/touch/actual zoom and AFTER audit |

Actual results and remaining gates are recorded in the
[SP-12 execution record](../03-planning/sprints/sp-12-execution.md). Outcomes,
whole-development close/reopen stock effects and committed-child close review
remain SP-13, not an implied extension of these reservation variants.

## SP-14 executable traceability

| Scope | Implementation | Executable cases |
|---|---|---|
| C01/C07, BR-16/30, AT-16/40 implemented variants | Administrator reviewed/versioned policy, three visit types, work/lunch/car rules, explicit lifecycle and ordinary overlap reason | `backend/tests/test_schedule.py`, `test_schedule_edges.py`; `frontend/tests/e2e/schedule.spec.ts` |
| C14, current scope/retry/history/locks | Agency/user/policy serialization, immutable events/participants/origin, merge adapter, strict transport and safe free/busy | `test_schedule_http.py`, real two-session last-slot/policy/role races, rollback/committed replay, SQL negatives and `test_schedule_migration.py` |
| C13, AT-23 | Existing French KAY desktop calendar/mobile agenda, flat working-hours settings, server civil-time resolution and retained recovery | `frontend/tests/review/schedule.chrome.spec.ts`, actual keyboard/touch/zoom/native states and required UI skill evidence |

[The execution ledger](../03-planning/sprints/sp-14-execution.md) records actual
verification, not a claim that SP-15 reminders or all cross-sprint AT-16 variants
are complete. [The concrete contract](../04-design/visit-scheduling-local.md)
defines strict routes, technical limits and the observed timezone adapter.

## SP-13 executable traceability

| Scope | Implementation | Executable cases |
|---|---|---|
| C04/C08, BR-10/11/12/13/27/28, AT-10/11/12/13/34 implemented variants | Explicit close/reopen; Inventory-owned sale/rental effects; immutable outcomes, responsible-agent snapshots and review flags | `backend/tests/test_outcomes.py`, `test_outcome_edges.py`, `test_outcome_hierarchy.py`; `frontend/tests/e2e/outcomes.spec.ts` |
| C14, strict scope/retry/history/SQL/locks | Current contact/session authority, complete stock review, typed effects/outbox, no overwrite or reservation resurrection | `test_outcome_http.py`, `test_outcome_sql.py`, `test_outcome_migration.py`; synchronized close/reserve/reopen and interruption tests |
| C09, BR-14, commission-free AT-14 variant | No financial side effects from close/reopen/external stock | Outcome tests prove no commission field or required finance step; SP-16 must rerun preservation against actual financial records |
| C13, AT-23 | Existing French KAY record/campaign, safe effects preview and failure recovery | `frontend/tests/review/outcomes.chrome.spec.ts`; native desktop/mobile states, keyboard/touch/zoom, AFTER audit and independent finish review recorded |

Results and remaining limits live in [SP-13 execution](../03-planning/sprints/sp-13-execution.md).
This maps implemented variants, not completion of all cross-sprint scenarios.

## SP-15 executable traceability

| Scope | Implementation | Executable cases |
|---|---|---|
| C06/C07/C10, BR-05/06/16/17, AT-17 | Contact-scoped task lifecycle/history, today's/overdue lists, personal internal inbox/read state and unresolved visit follow-up | backend/tests/test_work.py, test_work_edges.py, test_work_http.py; frontend/tests/e2e/work.spec.ts |
| C14, durable AT-17 recovery | Typed atomic outbox, canonical keys, bounded claims/backoff, UUID fencing, effect-before-ack replay and current-recipient lock-wait recheck | test_work.py, test_work_edges.py, test_work_process_migration.py, tests/reminder_process.py |
| AT-16 reminder variants | Distinct visit schedule_version, J-1/H-1, ordinary edit preservation and reschedule/terminal invalidation | test_work.py, test_work_process_migration.py; work.spec.ts plus unchanged schedule.spec.ts |
| C13/AT-23 | Existing French dashboard and contextual task controls, retained drafts, explicit comparison, safe denials, keyboard/touch/200% | frontend/tests/review/work.chrome.spec.ts and required UI skill records |

[Concrete contract](../04-design/tasks-reminders-local.md) and
[current verification status](../03-planning/sprints/sp-15-execution.md).
This extends AT-16/17/23 variants, not whole-product acceptance or human approval.

## SP-16 executable traceability

| Scope | Implementation | Executable cases |
|---|---|---|
| C09/BR-14, AT-14/15 | Optional explicit fixed/percentage commissions, exact final HALF_UP, recognition, partial receipt and retained correction/void | backend/tests/test_finance.py; frontend/tests/e2e/finance.spec.ts |
| C08/C09/C14, BR-13/14/15, financial AT-13 | Reopen review without altering terms/receipts; commission-free closing and no agent disclosure | test_finance_edges.py plus affected existing outcome tests; finance.spec.ts |
| C13/C14, authority/race/retry/SQL/migration | Current-role after actual waits, two-connection receipts, rollback, immutable SQL facts, clean-proof version binding and additive populated upgrade | test_finance_edges.py, test_finance_http.py, test_finance_migration.py |
| C13/AT-23 | Existing French M/A Finance tab, retained draft/version comparison, mobile/keyboard/touch/actual200% | tests/review/finance.chrome.spec.ts; UI skill/AFTER and independent review records |

[Concrete contract](../04-design/commissions-local.md) and
[actual verification](../03-planning/sprints/sp-16-execution.md). Focused tests do
not claim the complete final-acceptance suite or human product/design approval.

## D44 record-level removal extension

AT-06/23/24 now include visible project, Lead and Deal archive controls and
30-day Lead/Deal restore. AT-16/17 include reasoned calendar cancellation.
The executable cases are `backend/tests/test_record_archive.py`, the existing
inventory/scheduling permission suites, and
`frontend/tests/e2e/record-removal.spec.ts`. Archive preserves linked business
history; this extension does not authorize the security retention CLI.
