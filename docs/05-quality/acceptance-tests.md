# Acceptance scenarios

## Projects reference extension (2026-10-18)

D39 extends AT-06/23/27/31/35/36: four-column photo cards, automatic category/
search/offer/status filtering, authoritative pre-page facets and explicit-none
selection. Retain Maison, current campaign facts/prices/annual comparison,
numbered pages, Cards/List and programme navigation. Cover clean private previews,
role/stock denial, loading/empty/outage/retry, six widths, keyboard/touch and
actual200% zoom. Synthetic photo fixtures never replace real listing data.
[Scope and evidence](../03-planning/projects-reference-refresh.md).

## Calendar reference extension (2026-10-18)

D38 extends AT-16/23/40: three typed Iconsax visits and real statuses, populated
weekly/agenda/by-type layouts, empty selection/week, scoped pre-page filters and
whole-range facets beyond page one. Reject invalid filters and all type/status
queries on metadata-free busy intervals. Preserve authoritative civil time,
working/lunch/capacity/version/overlap and interrupted retry behavior. Check
overlap hit targets, short/overnight access, mobile touch, keyboard, native200%,
actual loading/backend outage/retry and safe screenshots. No real seed/migration.
[Evidence](../03-planning/calendar-reference-refresh.md).

## Staff setup/deletion override (2026-10-18)

D37 updates AT-01/02/23/38: admin-chosen initial/reset password, immediate
restricted login without activation/handoff, mandatory different own password
and fresh login. No API/receipt/GET plaintext. Existing staff are unchanged.
Delete hides/revokes access but preserves CRM attribution. Cover concurrent/
same-key, stale, rollback, current-authority and last-admin cases; additive
migration preservation; strict DELETE facade; keyboard/touch/200% zoom,
denied/outage/retry and secret-safe captures.
[Evidence](../03-planning/staff-onboarding-deletion.md).

## Lead/Deal activity extension (2026-10-18)

Extend AT-04/05/23/24/39 with exact Lead-to-Deal activity lineage: append all
manual kinds/metadata, convert, then append Deal-only notes. Original Lead IDs,
authors, timestamps and text must be unchanged in the separate origin table;
another Lead on the same contact and generic Contact notes must not leak in.
Exercise current-scope denial (including retry after transfer), archived
read-only history, missing/manual origins, merge preservation, duplicate query,
actor/time/context spoofing, invalid bounds, SQL context/immutability guards,
same-key concurrency, rollback and committed-but-lost-response retry. Prove
numbered filtering/counts, loading/empty/error/retry and actual mobile/keyboard/
touch/200% behavior. Migration round-trip must preserve pre-existing history;
downgrade must refuse retained new activity data. Actual commands/results and
remaining rollout/product limits live in the [activity ledger](../03-planning/lead-deal-activities.md).

## Current Lead/Deal replacement (2026-10-17)

The owner-requested [IMMO World alignment](../03-planning/leads-deals-immoworld-alignment.md)
supersedes free-title/manual-enquiry-link variants of AT-03/04/23/39, not their
canonical identity, private scope, version, retry or history assertions. Cover
selected calling codes and cross-country phones, residence/nationality/multiple
languages, required budget and the shared campaign catalogue. Convert a real
Lead with reviewed version/project/budget/buying intent and inspect both saved
histories and the reused client. Invalid/private/archived/stale/concurrent and
same-key cases must retain the existing fail-closed boundaries.

Manual creation/editing must prove atomic canonical-client qualification and
one-to-three project interests without inventory reservation or writable title.
Read/list/history must expose those actual facts; historical profile display
uses the saved revision rather than today's contact. Existing proposal, stock,
outcome, finance, file, merge, import and intake coverage remains required.
The alignment ledger separates observed passes, retained corrected failures,
pending visual/state checks and human product review; historical sprint passes
do not certify this replacement.

## D34: agent project creation/editing (2026-10-16)

Active agents create/edit shared development facts/briefing, blocks/floors/types
and standalone/physical-unit facts, with true-actor audit and version/retry guards.
Archived targets remain read-only. Private developer contacts cannot be linked,
removed or disclosed without scope; omitted IDs preserve existing hidden links.
Omission and explicit removal must have distinct idempotency fingerprints.
Legal-owner/file/offering/availability/external-outcome/archive/restore operations
remain M/A-only. Authentication, CSRF and post-lock/current-replay authority remain.
These replace older read-only-agent expectations for create/edit only.
Cases: backend `tests/test_project_permissions.py` plus affected inventory/hierarchy
regressions; frontend `tests/e2e/project-permissions.spec.ts` and updated prior cases.
[Actual verification and limitations](../06-delivery-and-operations/agent-project-permissions.md).

SP-22 now has a [current41-scenario evidence map](../03-planning/sprints/sp-22-acceptance-map.md)
and [live execution record](../03-planning/sprints/sp-22-execution.md). Backend
regression/corrected migration/recovery results are recorded; final browser,
full-volume performance, visual and privacy gates are still executing. A mapping
is not a blanket pass, and mobile emulation is not an actual iOS/Android device.

SP-21 AT-25 and recovery portions of AT-02/26/37 now have executable local
evidence in test_recovery.py plus affected foundation checks, recovery.spec.ts
and native recovery.chrome.spec.ts. Real PG18 dump/restore compares69 tables and
private objects; corrupt/compatibility/target/current-authority negatives,
maintenance interruption/drain,30-day retention, old sessions/permits/bootstrap
denial and repeated recovered workers pass. Final native RPO4.072028s and
incident-to-verified43.133s apply only to the named synthetic laptop exercise.
[Runbook](../06-delivery-and-operations/local-backup-recovery.md),
[results/limits](../03-planning/sprints/sp-21-execution.md). Full-volume/SP-22,
total-source-loss/offline opening and production DR remain unverified.

SP-20 intake portions AT22/30 and affected received-lead AT23 now have focused
executable evidence: signature/tampering/time/body/rate/role negatives,
same receipt retry/new same-phone enquiry, transactional202, SQL/source guards,
concurrent writers, real killed worker/restart and copied-private denial.
intake.spec.ts exercises the compiled actual form/API/PG/worker; native
intake.chrome.spec.ts covers responsive/accessibility/states and
intake-body.chrome.spec.ts covers actual UTF-8 byte rejection/correction.
[Contract](../04-design/website-intake-local.md), [results/limits](../03-planning/sprints/sp-20-execution.md).
No full scenario suite, actual site, load or recovery certification is implied.

SP-19 AT-22 search/pagination, AT-24 lifecycle/retention, AT-29 controlled export
and scoped AT-23 map to test_discovery.py, test_discovery_http_migration.py,
test_discovery_plans.py and affected existing contact/ownership/development
cases. discovery.spec.ts and discovery.chrome.spec.ts exercise the actual
compiled UI/roles/download/recovery and native responsive states. Read
[execution](../03-planning/sprints/sp-19-execution.md) for exact final results;
[wire/rule contract](../04-design/discovery-contract.md). This does not complete
AT-22 website intake or cumulative SP-22 acceptance.

SP-18 AT-20/21/23 executable variants map to test_imports.py,
test_import_http_migration.py, imports.spec.ts and imports.chrome.spec.ts;
[contract](../04-design/contact-import-local.md),
[actual execution status](../03-planning/sprints/sp-18-execution.md). Scope is
contact-only import, not inventory import, export or full-product acceptance.

SP-17 executable dashboard variants: [local reporting contract](../04-design/dashboard-local.md)
and [execution](../03-planning/sprints/sp-17-execution.md). AT-18/19, current-result
reopening AT-13, dashboard AT-36/39 and scoped AT-23 map to test_reports.py,
test_report_edges.py, reports.spec.ts and reports.chrome.spec.ts. Read the ledger
for actual pass/review status; this does not complete unrelated parts or SP-22.

Status: SP-01–SP-21 scoped accepted evidence; full-product scenarios pending
Date: 2026-10-16  
Confirmed decisions: C01–C14 scope and load/recovery targets; SP-01/02 foundation variants are implemented.  
Technical proposals: synthetic fixtures and automation with pytest, Playwright, and Locust.  
References: [rules](../02-requirements/business-rules.md), [API](../04-design/api-contracts.md), [KAY design system](../04-design/design-system.md), [traceability](traceability.md), [recovery](../06-delivery-and-operations/release-and-recovery.md), and [lifecycle guide](../../software_engineering_lifecycle.md).

At execution, every scenario must record build and migration versions, environment, synthetic dataset, actor, steps/response, assertion, actual result, evidence, defect, and date. `To write` or `not executed` never means passed.

[SP-01 evidence](../03-planning/sprints/sp-01-evidence.md) records passing AT-23 setup/shared-state checks on 2026-10-14. This is not complete AT-23 acceptance or a passing claim for the other business scenarios. Product review remains pending Khalid.

[SP-02 evidence](../03-planning/sprints/sp-02-evidence.md) adds passing AT-23/26
local HTTPS/facade/database-status variants and guarded setup/migration tests.
Secure sessions, CSRF, private files, authenticated roles and restore remain later
variants; neither full AT-26 nor BR-24 backup acceptance is implied.

## Shared synthetic dataset

[SP-05 evidence](../03-planning/sprints/sp-05-evidence.md) records AT-03,
SP-05 duplicate/private portions of AT-04 and Leads/list/UI portions of
AT-22/23/39:100 backend (98% coverage),130 five-browser,30 headed Chrome and19
built HTTPS cases,all passing with zero skipped. Canonical international phones,
primaries, organizations/roles, scoped pages/search/columns, atomic retry/rollback,
independent phone/version/current-actor races and private-name-only errors are
implemented. Full merge/assignment/history (SP-06), signed intake/export/deals/
metrics, real devices and full-product variants remain separate. Product/design
review and audit005 LOW1 selection remain pending Khalid.

[SP-03 evidence](../03-planning/sprints/sp-03-evidence.md) records passing local
AT-37 bootstrap and scoped AT-02/23/26/39 authentication/session variants:
47 backend cases, 70 five-browser E2E, headed Chrome and built HTTPS smoke.
Restricted password-change support is verified without claiming SP-04 staff
creation/handoff. Full business/file/restore scenarios and actual Safari/devices
remain separate; product review is pending Khalid.

[SP-04 evidence](../03-planning/sprints/sp-04-evidence.md) records passing local
AT-01/38 staff lifecycle and the staff/session/UI portions of AT-02/23: 62 backend,
95 multi-browser, 22 headed Chrome and 12 built HTTPS cases, all passing with
zero skipped. Real staff identity/in-person delivery remains a human sign-off;
later file-permit/restore/business variants and actual Safari/devices are not
accepted by inference. Product review and one low-priority AFTER finding remain
pending Khalid. The historical SP-03 statement above does not claim this later work.

[SP-06 evidence](../03-planning/sprints/sp-06-evidence.md) records AT-05,
merge portions of AT-04, contact portions of AT-24 and scoped AT-23:126 backend
checks,155 five-browser cases plus5 affected mobile reruns,36 headed Chrome and
24 built HTTPS checks pass with zero skipped. Current ownership/collaboration,
former-owner denial, true historical actors, archive/restore and authorized
same-scope/cross-portfolio merge are covered. Later linked modules extend that
same policy, rather than treating this as full-product acceptance. Product/design
review and AFTER006's optional LOW finding remain pending Khalid.

[SP-07 evidence](../03-planning/sprints/sp-07-evidence.md) records inventory
facts/permissions in AT-06, price portions of AT-08, standalone AT-27/31 and
scoped AT-23:150 backend tests (97% coverage),190 five-browser cases,43 unchanged
headed cases plus corrected inventory review,and31 built HTTPS checks pass with
zero skipped. Four categories, unknown drafts, legal-owner gates/current Contacts
scope, independent campaigns, exact original/annual rent, reconfirmation/history,
real races/current-role denial, conflicts/retries/outages and preserved merge
origins are covered. Actual200% edit and15 refreshed captures were reviewed;
AFTER007 has zero new findings. Files (SP09), matching (SP10), hierarchy (SP08),
later core/full-product/load/recovery and actual Safari/devices remain separate.
Product/design review remains pending Khalid.

[SP-08 evidence](../03-planning/sprints/sp-08-evidence.md) records the implemented
AT-31 mixed hierarchy, AT-32 reusable types/independent physical units, shared
project portions of AT-35, inventory navigation/filter portions of AT-36,
AT-41 optional plain briefing and scoped AT-23. Target-level owner/price gates,
current authority, cross-project constraints, safe developer/owner projection,
version/retry/race/rollback, merge provenance and populated migration preservation
are included. 163 backend tests (96% coverage),105 distinct five-target affected cases with corrected reruns retained,5 headed and21 optimized HTTPS checks pass in their recorded scope; final commands have zero skipped.16 refreshed captures and actual200% editing were inspected.
Files (SP-09), shortlists (SP-10), reservations/outcomes (SP-12/13), global
search/counts/dashboard, load/recovery and actual Safari/devices remain separate.
Product/design review and AFTER008's optional LOW finding await Khalid.

[SP-09 evidence](../03-planning/sprints/sp-09-evidence.md) adds file portions of
AT-06/26/35 and the corresponding AT-23 surfaces. Current-session/role/scope
authorization, copied/expired/revoked/consumed permits, direct20MiB boundaries,
real clean/controlled rejection, quarantine on scanner failure, interruption/
retry, private contact versus clean shared inventory access, immutable versions,
archive and merge provenance are covered.192 backend tests (94% coverage),115
five-target E2E cases,1 headed Chrome workflow/15 inspected captures and23 built
HTTPS checks pass with zero skipped. Actual200% zoom,320–1440px,keyboard/touch,
applicable UI states, final privacy/isolation and shutdown are recorded there.
AFTER009 has0 findings and existing KAY design tokens are preserved; this is not
Khalid's product/design approval. Proposed parser caps and9 inherited HIGH
development-tool npm findings remain disclosed. Deal files, notification UI,
remaining core workflows, measured load/recovery and actual Safari/devices are
outside this slice; no whole-scenario or full-product acceptance is inferred.

`agent_a`, `agent_b`, `manager_m`, and `administrator_x` are fictional accounts. `contact_a` has `+212600000001`, a sale enquiry, and a rental enquiry; `contact_b` has `+33600000002` and belongs to `agent_b` without collaboration. `property_p` is standalone with `sale` and `rental` offerings; rent is `12000.00` MAD/month. `development_d` has two blocks, floors, T2 type shared by `unit_201` and `unit_301` on different floors, and a land parcel directly under the development. It has a whole-development sale/rental offering and unit-level offers. `developer_c` is a protected organization contact owned by `agent_b`. `deal_a1` targets `sale`, and `deal_a2` targets `rental`. An optional example commission is `10000.00` MAD with no initial receipt. These are test fixtures, not KAY data. No real contact name is needed.

[SP-10 execution record](../03-planning/sprints/sp-10-evidence.md) covers AT-07's
independent requirements/required-preferred-unknown/real shortlists, AT-08's exact
original/annual rental comparison, offering-filter portions of AT-36 and scoped
AT-23. It adds typed false/null/zero distinctions, large-decimal edges, current
scope after transfer/merge, retained archive/campaign links and real concurrent/
interrupted/retry/conflict variants. Backend223 checks/94% coverage,160 distinct
five-target cases via corrected reruns (not one clean160 invocation),latest10/10
SP10 cases,1 headed workflow/16 inspected valid captures and32 final compiled
HTTPS checks pass; final commands have zero skipped. Privacy/isolation/shutdown
and documentation gates pass. The original unproven WebKit scanner timeout and
9 inherited HIGH development-tool entries remain disclosed in the record. This
is not automatic matching/reservation or full-product acceptance; product/design
review remains pending Khalid.

| ID | C / BR | Scenario, variants, and expected result |
|---|---|---|
| AT-01 | C01 BR-01 | After the one-time first-administrator bootstrap in AT-37, that administrator creates later named roles; an 11-character password is rejected and a 12-character one accepted; sign-in/out work; no public sign-up, MFA, or email is needed. Temporary staff access follows AT-38. |
| AT-02 | C01 BR-02 | Administrator resets `agent_a` using their own current password: target sessions are revoked. Wrong administrator password: denial without change. Disable/role removal rejects later cookie and permit use; seven-day expiry works. |
| AT-03 | C02 BR-03 | Name/phone are required; multiple international phones and emails have one primary each; `+212` normalizes, invalid input fails; the same name with a different phone stays distinct. |
| AT-04 | C02 BR-04 | Accessible existing phone: explained warning and confirmed reuse without a duplicate. An authorized confirmed contact merge preserves phones, links, original provenance and true actors without automatically unioning collaborators; conflict/race rollback preserves both originals. Same-scope agent merge is allowed, cross-portfolio agent merge is denied, manager merge requires confirmation. `agent_a` entering `contact_b`'s phone cannot create/merge and sees only `agent_b`, with no contact ID. |
| AT-05 | C02,C05 BR-05 | Add `agent_b` as collaborator on `contact_a`; they work on deals, `primary_agent_id` remains `agent_a`, and history credits `agent_b`. Transfer to `agent_b` retains former agent and actors; former access ends unless explicitly retained. |
| AT-06 | C04 BR-06 D42 | All agents read `property_p` and its clean photo; an agent cannot change its price, photos or attachments. The linked owner's private document is denied outside contact scope; manager/administrator have full business rights. A manager selects JPEG/PNG/WebP for a physical bien and sends only WebP. A clean thumbnail opens a full-size viewer; previous/next buttons and Left/Right keys move among clean photos, Escape closes it and returns focus. A single photo disables both arrows. The 11th active image is rejected even under concurrent creates; pending/rejected uploads occupy a slot until archive, which frees one. Existing property images count without rewriting bytes. |
| AT-07 | C03 BR-07 | Two requirements per contact; `area_sqm=null` remains unknown and provided `0` is invalid; required and preferred criteria differ; shortlist points to the exact `rental` offering, not only the property. |
| AT-08 | C03,C04 BR-08 | 12,000 MAD/month compares exactly with 144,000 MAD/year; 11,999.99×12 has no binary-float loss; original price and period remain visible; non-MAD currency fails. |
| AT-09 | C04,C08 BR-09 | Two concurrent reservations for one offering yield exactly one active reservation. Sale and rental can each be reserved. Time alone expires neither; competing deals are flagged. |
| AT-10 | C04,C08 BR-10 | Won sale withdraws an unfinished rental on the same target, releases its reservation, and flags competing deals without losing them. Won rental leaves sale active and marks the target rented. Completed rental history remains. Project-level propagation is tested separately in AT-34. |
| AT-11 | C04,C08 BR-11 | Manager marks an external sale on a physical property or whole development; stock changes after overlap review, but no KAY deal is won and no income is invented. Scoped agents receive a flag. |
| AT-12 | C08 BR-12 | Skipping `visit` toward `negotiation` is allowed; submitting/accepting an offer does not close; missing amount, date, or explanation rejects closing; a complete close appends the outcome and history. |
| AT-13 | C08,C09 BR-13 | Primary agent and collaborator reopen their won deal with an explanation; the previous outcome remains and current KPIs adjust. Intervening stock change creates a conflict/manager review, not blind restoration or financial deletion. |
| AT-14 | C09 BR-14 | A deal closes without commission or a blocking warning; fixed and percentage commissions identify their base; agent financial read/write is denied. |
| AT-15 | C09 BR-15 | Manager recognizes `10000.00`, records `2500.00`, and sees `7500.00` remaining; a `7500.01` receipt fails; correction retains original row, reason, actor, replacement, and exact recalculation. |
| AT-16 | C07 BR-16 | Two visits overlap: warning and confirmation with a reason succeed, without a reason fail; colleague sees only free/busy interval. A blank slot is labelled CRM availability only. |
| AT-17 | C06,C07 BR-17 | One-day, one-hour, and task-due events each produce one notification; worker retry creates no duplicate. Reschedule/cancellation invalidates old reminders; overdue work appears without a second visit. |
| AT-18 | C10 BR-18 | After transfer, portfolio moves to the new primary agent; an already closed outcome stays with the agent at closing; collaborative activity counts toward the true actor. A private aggregate is invisible to an unrelated agent. |
| AT-19 | C10 BR-19 | Available inventory without reconfirmation is flagged at 30 days; active deal without relevant activity is flagged at 14 days. No alert at 29/13 days and no automatic state change. |
| AT-20 | C11 BR-20 | CSV with a valid row, an existing phone, and an invalid row previews skipped/error rows and blocks approval. After correction, only new rows commit, each row's agent is respected, and an ordinary agent cannot import. |
| AT-21 | C11 BR-20 | Crash before commit creates zero contacts; crash after commit and retry with the same key creates no duplicate. A concurrent phone claim after preview rolls back the whole transaction and requires a new preview. Duplicate phones within the CSV are found. |
| AT-22 | C11,C12 BR-21 | Pages 1/2, Next/Previous, stable sort, scoped total; authenticated form retry with the same `submission_id` creates one enquiry, while a new submission from the same phone creates another enquiry for the same contact. Simulate the source until the real site is known. |
| AT-23 | C13 BR-22 | Contact, property, visit, task, and deal flows on desktop Chrome/Edge and Android Chrome/iOS Safari; keyboard, touch, 200% zoom, visible focus, 44 px touch targets; loading, empty, error, denial, and conflict states preserve input where safe. Review every standard control against shadcn/ui source, every chart against Bklit UI, and ordinary styling against Tailwind; document any custom KAY component or scoped CSS exception, and reject an unapproved substitute library. Using the approved local light-token baseline, verify semantic tokens, readable status labels, text/non-text contrast, red destructive actions, and white/ivory-led brand balance without treating 60–30–10 as an exact pixel quota. |
| AT-24 | C14 BR-23 | Contact archive/restore preserves links and actors; there is no automatic contact expiry. Security audit follows its 24-month policy; transactions are excluded from that purge until KAY approves their policy. |
| AT-25 | C14 BR-24 | Restore consistent database and files in an isolated environment; verify hashes, links, versions, and rights; measure RPO ≤ 1 hour and RTO ≤ 4 hours in an exercise without claiming a result beforehand. |
| AT-26 | C01,C14 BR-02,BR-06 | Test Safari cookie proxy, CSRF, forbidden direct backend call, out-of-scope access, copied/consumed/revoked permit, direct 20 MB transfer, and denial of infected or unscanned download. |
| AT-27 | C04 H-01,H-02,H-03 | Accepted local D29 defaults: standalone, unit, and whole-development drafts with unknown price/owner are accepted; availability without positive target-level price/legal owner is denied; developer alone is not proof of ownership; multiple owners may be linked. Real-data validation remains separate; this local scenario is actionable. |
| AT-28 | C10,C14 BR-18,BR-24 | Locust: 100 accounts and 100 concurrent users, 200,000 contacts, 20,000 physical properties including project units; vary development sizes and depth; target p95 ordinary API ≤ 1 second, dashboard ≤ 2 seconds; publish load mix, duration, instance sizes, and results. |
| AT-29 | C11,C14 BR-20,BR-23 | Manager-only CSV export; formula is neutralized, phone stays text, export is attributed; permission revoked during generation prevents delivery of a private file. |
| AT-30 | C12,C14 BR-21 | Invalid source signature or altered replay is rejected with no owner leak; worker failure after durable receipt is recovered from outbox without a duplicate enquiry. |
| AT-31 | C02,C04 BR-25,BR-26 | Manager creates standalone villa, house, apartment, land, and local-commercial assets and a mixed-category development with one or many blocks. An incomplete apartment-development draft saves, but marketing it without at least one block/floor/actual unit fails. Apartment units require a same-development floor and type; a non-apartment unit, including a local commercial, may sit directly under its development. Cross-project floor/type links and duplicate unit references fail; reparenting a committed unit or cascading archive of active children fails; agent writes are denied. Developer is a contact, not a staff role. |
| AT-32 | C04 BR-26 | T2/80 m² template is reused by `unit_201` and `unit_301` on different floors. Each unit keeps its own price, availability, reservation, and reference; changing template defaults does not silently overwrite marketed unit facts. A template cannot be reserved or offered. |
| AT-33 | C04,C08 BR-09,BR-27 | Whole-development and unit sale/rental offerings coexist in lists. Two concurrent same-kind reservations on overlapping project/unit scope result in one success and one `DEVELOPMENT_OVERLAP`; retry does not duplicate either. Different-kind sale/rental reservation behavior remains governed by BR-09/10. A floor, block, or type cannot be a target. |
| AT-34 | C04,C08 BR-10,BR-13,BR-28 | With a child already sold or leased, whole-development close is blocked as `PARTIAL_DEVELOPMENT_REVIEW_REQUIRED`; manager review retains history. An active opposite-kind child reservation requires explicit stock review. Without prior child outcome/reservation, a whole sale withdraws affected open unit offers and flags—not closes—open deals; a whole rental affects unit rentals with sale visibility disclosing occupancy. Reopen checks current child stock. The local exit verifies this safe block/review behavior; any expanded remaining-unit commercial resolution is a later Q-06 decision. |
| AT-35 | C02,C04,C14 BR-06,BR-25 | An unrelated agent reads safe development, block, floor, type, unit, and clean inventory attachments, but cannot view `developer_c`'s protected contact details or documents through direct IDs, search, rollups, exports, file permits, or errors. Manager edits hierarchy. A shared project attachment is not a private developer document. |
| AT-36 | C03,C04,C10,C11,C13 BR-07,BR-18,BR-19,BR-22,BR-26 | French desktop/mobile inventory navigation groups development → block → floor → units and supports optional direct children. Search filters by category, level, development, block, floor, and type; shortlist points to the exact offering. Dashboard distinguishes development count, physical unit count, and both offering levels without double counting. 30-day stale warnings apply to available physical or whole-development offerings; contact CSV format remains unchanged. |
| AT-37 | C01,C14 BR-01,BR-02 | With migrated schema and an empty user table, the future server-local interactive script creates exactly one administrator, credential, bootstrap marker, and non-secret audit event atomically. Repeat and concurrent runs are harmless; existing users, completed bootstrap, non-TTY, weak/mismatched passwords, and interrupted transactions do not create another or partial account. No public bootstrap route or password in arguments, environment, output, logs, or fixtures. The intended administrator signs in normally. |
| AT-38 | C01,C14 BR-01,BR-02 | Administrator creates a later staff account: a random temporary credential is shown once only to that administrator, never returned by GET or logs; its 24-hour expiry is enforced. `pending_handoff` denies login until verified in-person delivery is confirmed and audited without the secret. Before changing it, the recipient can use only self/profile, password-change, and logout routes. A successful change revokes temporary sessions and requires fresh login; a lost/expired credential needs administrator reset with their current password, which revokes target sessions and returns to pending handoff. Remote handoff is not silently substituted. |
| AT-39 | C01,C02,C08,C10,C13 BR-29 | Unauthenticated entry shows login; successful normal sign-in reaches the dashboard, and an expired/revoked session returns safely to login. Manager/administrator dashboard shows agency-permitted data; `agent_a` sees only their assigned/primary or collaborative work, not `contact_b` or agency-wide inventory totals. The agent may still open shared Projects inventory separately. Sidebar and direct URLs enforce the same roles, including administrator-only Settings. Lead means an enquiry linked to one contact; lead create/edit/detail and create-deal handoff do not duplicate a contact or auto-create a deal. Lead/deal search, filters, numbered pages, configurable columns and row links retain server scope; hiding or enabling a column cannot reveal `contact_b` data. The named-screen map is checked without claiming that its provisional count equals 19. |
| AT-40 | C01,C07 BR-16,BR-30 | With no configured work windows, a new off-site visit is denied and an office visit is allowed. Administrator configures synthetic Monday 09:00–18:00 with lunch 13:00–14:00 and company-car cap 2; manager and agent policy writes are denied. Both off-site types fail outside the window or across lunch; office succeeds there. Two company-car visits in the same tested hour succeed agency-wide, a third fails, while `without_company_car` does not consume that capacity. Two simultaneous claims for one remaining company-car slot yield one success. An ordinary overlap reason cannot override work-time/capacity denial. Administrator raises cap with a versioned edit; future visits affected by a later restriction are reported, not cancelled. Test Casablanca date/time and DST edges. Accepted local Q-07: 10:30–11:30 counts both hours; an exact 11:00 end excludes the next hour; repeated DST hours use offset/UTC identity. |
| AT-41 | C04,C13 BR-31 | A development can be created and read with `briefing_text=null`; with otherwise valid price/ownership under H-01/H-02, an empty briefing does not block availability. A manager/administrator can add or clear a shared briefing, while an agent edit is denied. All staff with inventory access can read the non-secret briefing and available-unit view. Private `developer_c`/owner phone, documents and notes never appear through the briefing or safe display. |

## Automation and evidence

SP-14 scheduling variants map to [its execution ledger](../03-planning/sprints/sp-14-execution.md):
AT-40 reviewed administrator working policy, both off-site restrictions, office
bypass, agency-wide half-open car capacity, no-hours behavior and real races;
AT-16 explanation-required ordinary participant overlap and privacy-safe colleague
busy intervals; AT-23 French desktop/mobile, keyboard/touch/actual200% and failure
recovery. Strict input, current authority, retry/interruption, DST and populated
migration cases are named there. Reminder delivery/overdue work remains SP-15;
these variants do not imply full-product or Khalid's product acceptance.

SP-13 implemented outcome variants are mapped in
[its execution record](../03-planning/sprints/sp-13-execution.md), with passing local
verification: AT-10 sale/rental combinations and unfinished campaign withdrawal;
AT-11 manager external dispositions without KAY win/income; AT-12 explicit
terminal outcomes; AT-13 retained original/reopen guarded by current stock;
commission-free AT-14; AT-34 committed-child whole-development review; and AT-23
French desktop/mobile confirmations and reliable failure states. SP-16 must rerun
financial preservation against actual commission records; full named scenarios
and product acceptance are not inferred from these local variants.

SP-11 executable variants are indexed in [its execution record](../03-planning/sprints/sp-11-evidence.md):
AT-12 ordinary-stage skips and no-auto-close; AT-39 explicit contact-scoped deals
from both shared-form entry points; AT-23 French states, keyboard/touch/real200%
zoom. They include strict invalid stages/fields, current authority, scoped counts,
version/retry/interruption and preserved enquiry/history/target identities.
This is not full AT-12 closure (SP-13) or AT-39 dashboard metrics (SP-17).

`pytest` covers pure rules, APIs, real PostgreSQL transactions, locks, migrations, and jobs. Race cases AT-09/15/21/37 require two actual database sessions with controlled synchronization. `Playwright` covers the interface, permissions, cookie proxy, error states, desktop Chrome/Edge, and mobile Chrome/Safari; real devices may still be required to validate touch and Safari behavior. The in-person handoff in AT-38 needs a separate non-secret operational sign-off. `Locust` measures load with the specified indexes, read/write mix, duration, and p95; dashboard performance is separate from long-running operations. A restore exercise proves AT-25. These tools and scenarios are prescribed. Full-product variants remain pending beyond the scoped evidence in the sprint execution records.

## SP-15 executable AT-17 and related variants

The [execution record](../03-planning/sprints/sp-15-execution.md) reports actual
current outcomes. Work tests exercise task due/today/overdue and personal read
state, J-1/H-1 per distinct visit schedule_version, reschedule/terminal invalidation,
restart/crash-after-effect-before-ack replay, concurrent claims/delivery and
current-recipient scope rechecks after actual database lock waits. Migration
tests compare populated0016 visits, actors and history unchanged after0017.

Real-stack work.spec.ts and the headed work review cover create/edit/complete/
cancel controls, same-record visit follow-up, retained drafts/version recovery,
copied private links and existing French desktop/mobile/keyboard/touch/200%.
Browser-engine emulation does not pass actual iOS Safari/assistive-technology
checks. No SP-17 KPI, real-device, production, load, backup/recovery or human
approval is implied by the implemented AT-16/17/23 variants.
