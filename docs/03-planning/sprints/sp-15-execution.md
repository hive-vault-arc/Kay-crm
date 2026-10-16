# SP-15 execution record

Status: technically_accepted locally; final gates below supersede historical checkpoints
Date: 2026-10-15
Product review: pending Khalid, separately from technical acceptance

## Task and acceptance defined before implementation

Implement C06/C07/C10/C13/C14, BR-05/06/16/17, S02/S05/S08/S09 and the
SP-15 AT-17/16/23 variants. SP-14 is the accepted local prerequisite. Khalid
confirmed the existing French interface: dashboard today/overdue tasks, task
controls in contact/deal detail, internal notification/read state and unresolved
visit follow-up. No external email/SMS/chat/calendar or later KPI/finance work.

Focused real-stack E2E: create a synthetic contact/deal task, edit its due time,
observe today/overdue state and one internal due notification through a real
separate worker with a controlled test clock, read it, complete/cancel the task.
Book a visit, observe J-1/H-1, reschedule the same visit and prove old schedule
notifications/jobs are unusable while the new schedule produces each reminder
once. Resolve overdue follow-up without creating a second visit. Exercise copied
private IDs, role/scope revocation, retained failure drafts and explicit stale
version/retry recovery. Test actual keyboard/touch/200% and narrow/desktop states.

Backend acceptance: atomic task/history/audit/outbox/receipt writes; distinct
visit schedule_version changes only on time/status, not agency policy or ordinary
edits. Concurrent SKIP LOCKED claims, lease expiry/fencing, bounded backoff/failed
jobs, crash after notification effect/before acknowledgement, restart and replay
must not duplicate per-recipient/event effects. Recheck current recipient scope
on delivery AND notification reads/counts/links. Retain immutable origin/true
actors across transfer/archive/merge, extend the existing merge policy/preview.
Exercise additive populated migration, raw SQL invariants and downgrade refusal.

## Implementation proposals to verify

- Contact is required for tasks; optional typed deal/property context must match
  the contact/domain. Task ownership does not grant record access: currently
  eligible staff within contact scope may own it, and scoped collaborators can
  work on it. Retain an old owner after access changes without leaking details.
- Visit reminder recipients are the original organizer and current participants,
  deduplicated and filtered through current active account/contact scope. Task due
  reminders target the current task owner. These concrete recipient choices are
  implementation proposals for product review, not new confirmed business rules.
- Preserve existing file notification keys. New notifications store typed parent
  IDs/version/kind only, not cached private titles/messages. Safely render current
  permitted facts; hide obsolete reminders and private counts after revocation.
- Extend the existing PostgreSQL outbox/job tables and CLI worker; no broker or
  FastAPI background-task substitute. Worker clock injection is internal/test-only,
  never a public API flag or a changed machine clock. UTC instants and the existing
  backend Casablanca authority determine due/today boundaries.

## Scope and gates

Read the sprint, read-first project contracts, engineering/harness/QA/security
and lessons, required UI skills/references and existing modules before edits.
Use backend/.venv explicitly for every Python command, subprocess via
sys.executable. Reuse authorized ignored config without printing secrets.
Verify database identity before writes; never reset/seed development. Database
writers remain serial under the existing isolated lease. Synthetic fixtures only.

Design-system-ops governs geometry; existing semantic Tailwind/shadcn/Lucide
components remain authoritative. Dense dashboard/detail/list/form surfaces are
excluded from design-taste's marketing/concept/asset workflow; no chart (Bklit
N/A), palette/font/kit replacement or arbitrary route/navigation expansion.
Impeccable uses the incumbent Operate world and confirmed narrow extensions;
context already ran in this chat, no silent generic metadata repair. Antislop
remains AFTER, numbered aesthetic-only fixes need Khalid's selection.

Required gates pending: focused/full backend, Ruff/mypy, real PostgreSQL/worker/
migration/races, frontend lint/typecheck/build, five-target E2E, headed actual
Chrome/native desktop/mobile/state/keyboard/touch/zoom, security/privacy,
AFTER, fresh UI finish reviewer/documenter, docs/traceability and final isolation/
shutdown. A missing prerequisite or two/three unproductive focused reruns requires
an honest blocker, not an invented pass. Human review remains separate.

## Verification ledger

Initial combined command passes45/45 in53.78s (work, work_edges, schedule,
schedule_edges). Expanded work/HTTP/real-process/migration plus prior schedule
migration passes21/21 in55.66s,0 skipped. This proves an actual venv worker process
restart after effect/before acknowledgement, real CLI --once task delivery,
populated0016 visit/event/actor retention and reminder backfill/downgrade refusal.
These are focused results, not final full-suite acceptance.

Test schema0017 has no new Alembic upgrade operations. Development remains56
tables/head0016, untouched. Ruff/mypy124 app modules pass after formatting/type
corrections; final checks still pending. Frontend initially fails typecheck on
wrong NumberedPages prop names/closure narrowing, corrected using the existing
API, then lint/typecheck pass. The first new test-file lint catches two unused
destructuring bindings; corrected without changing any assertion. No browser
run or final build has passed yet. Real pinned ClamAV is restarted/healthy for
upcoming serialized browser and complete backend regressions.

Later checkpoint: four focused compiled Chrome cases pass4/4 in1.4m, no skipped
cases. Two earlier browser attempts retain incorrect test-field/navigation
assertions, corrected against the actual existing interface, not relaxed product
behavior. Latest optimized build and lint/typecheck pass; final build identity
will be recorded after the UI handoffs. Ruff passes196 files/strict mypy125 app
modules. The empty test schema was recreated0016→0017 with both canonical-key
checks, after discovering that its earlier draft had neither. Development is
still unchanged at0016. The first isolated recreation attempt refused absent
draft constraints; tolerant empty downgrade now handles those two absent checks.

Additional guards test notification uniqueness, monotonic read state, forged keys,
and actual worker delivery waiters. The first two new midnight fixture attempts
incorrectly assumed UTC+1 in January2030/October2026. Pinned tzdata reports UTC+0
on those dates; January2026 was inspected as UTC+1 and replaces the fixture.
Application timezone logic was not changed to force a test. Headed review and
complete regressions remain pending at this checkpoint.

The updated focused backend selection passes23/23 in68.16s,0 skipped. A further
current-recipient delivery case is parametrized for allowed/disabled waiters and
will be included in the full regression; do not count it in that23-case result.
Real headed Chrome passes1/1 (51.0s test/1.1m total),0 skipped. Initial held-route
teardown collided with route.continue; waiting for the actual released response
fixes the test handler, without suppressing product errors.

The first batched visual round opened all23 native captures. Geometry shows
minimum contrast5.814:1, controls≥44px,0 page/dialog overflow across320/360/390/
768/1024/1440; desktop confirmation padding24px. Actual200% changes DPR2→4 and
innerWidth1427→713. Keyboard Enter/Tab/Escape, trigger/terminal focus, native touch,
retained error/version409 recovery, read filters, visits and manager/outsider views
pass. Unexpected page/console errors0; deliberate network failures,409 and404
are separately recorded. The final main batch corrects two inherited factual
future-tense messages and associates task validation with its field/form. It
does not select or apply aesthetic-only audit findings. No token/layout change.

Python pip check and both unchanged hash-lock audits exit0/no known vulnerabilities.
Frontend runtime audit exits0; full audit retains9 inherited HIGH development-tool
entries/exit1. No dependency was changed or advisories hidden. Final headed
captures, fresh skill-required review/documentation and broad regressions pending.

Final main visual pass1/1 passes49.7s/1.1m total; all23 current captures opened
again and validated. One static detector across19 source targets returns[].
Build i0iLpqKybNqkpMm_Jn93Z and311 app/migration files SHA256
629DE139E70AEFF957C0DE44722AD3C4069324E7A2C42D8306F56E465D1C4273
identify this pre-review candidate. The85-case five-target matrix is running
against that compiled candidate. A new five-target deal-context task edit/cancel
case and AT-39 checks are queued separately; do not count them in85.

Read-only pre-migration development probe confirms unchanged OID109060, cluster
7607060034405909976, head0016,56 tables,53 record tables/0 rows/bootstrap unset.
Intrinsic schedule policy remains version1/capacity2/editor unset/no work/lunch
rows. Unrelated catalogue SHA remains
4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945.
No development reset, synthetic seed or real-record read is performed.

Current installed metadata: Python3.14.3, FastAPI0.143.1, SQLAlchemy2.1.4,
Alembic1.20.0, pytest9.1.1, Ruff0.17.0, mypy1.20.2, tzdata2026.5, psycopg3.3.6,
Pydantic2.14.1, Uvicorn0.54.0; Node24.13.1/Playwright1.64.1.
Actual independent engine launch reports Chromium156.0.8078.4,
Chrome155.0.8059.79, Edge155.0.4283.45, Firefox157.0 and WebKit27.2.
These are local installed engines, not real-device Safari.

Checkpoint privacy:4 client bundle roots/281 browser JS/0 configured-secret
matches;10 checked private/generated paths ignored/0 tracked. The latest headed
report contains2 JSON entries/1 result step array/0 detailed arrays. Repeat after
the final browser reports; these counts are not the still-running matrix result.

The fresh skill-required UI review inspects25 valid files (23 named captures
plus both canonical copies) and returns fix for one French-language clarity
defect: the empty notification state mentions an internal worker staff cannot
act upon. This is a functional French-copy correction, not an aesthetic-only
audit selection. Its source sentence now says reminders appear from their due
time, without promising immediate delivery. No other source/token/layout changes
are made. Rebuild/empty-state recapture/verdict and final affected checks follow
the currently running matrix; it still uses the unmodified compiled candidate.

The pre-review matrix stops79 passed/1 failed/5 unrun in24.9m. WebKit's
responsive shell case records four access-control console errors for calendar
local-time/policy/colleague reads during repeated full navigation; no cause or
passing result is assumed yet. The wrapper correctly does not run queued AT-39
after failure. The failed report privacy check passes5 JSON entries/80 result
arrays/0 detailed arrays. Supervisor teardown leaves3100/8100/8101 listeners0.
An unchanged-app WebKit reproduction with safe path/failure-code diagnostics is
running before deciding any fix; no error assertion/filter is weakened.

The unchanged-app reproduction passes1/fails1/leaves1 unrun in31.6s. Safe
requestfailed observations identify the affected calendar calls as Load request
cancelled, including policy/colleagues/two civil-time reads. The responsive loop
was moving to the next full page after seeing only the server heading. The
test-only correction waits for the real loaded calendar/visible policy and the
successful colleague response body at each width; initial dashboard reads settle
too. It adds no exception filter, suppression, app/CORS change, retry or sleep.
The same console-error assertion and original widths/target checks remain.
Three corrected repeats are running before broader final-source checks.

Corrected WebKit responsive case passes3/3 in49.5s with the original console
assertion intact. Stronger current-source database race selection passes3/3
in4.09s: a Barrier observes two distinct driver connections at the claim query;
two actual agency-lock delivery waiters leave exactly one notification while
allowed and none after recipient disablement. These test changes do not mutate
application behavior. Ruff196/strict mypy125 and latest frontend lint/types pass.

Post-review build S5SnyXhT5J3phRg8k_fNM is compiled successfully;311 app/migration
files SHA25652723F0DA8A7CC238F2217457A4EA63D0642B603F0948192828A95EE2508D7F2.
Only the reviewer-named French empty-state sentence differs from the pre-review
application candidate. One serial shell now runs headed2 cases/recaptures, the
expanded45-case work+shell five-target selection,5 AT-39 role cases,14 broader
Chrome cases and full backend coverage. Each stage starts only after the prior
stage exits0 and tears down its supervisors; none is passed in advance.

The post-review headed command passes2/2 in1.2m,0 skipped, refreshing all23
captures. The fresh reviewer reopens all25 originals/canonical files, validates
their final hashes and resolves its single French-copy finding. Its final ship
verdict is limited to that scored correction, not fresh whole-surface, technical
or human approval. The skill-required documenter preserves DESIGN/tokens/source
and adds only a factual SP-15 composition section to ui-components.md plus its
own outcome record. Main read back both documents and checked this boundary.
Missing PRODUCT/design.json metadata remains reported and unrepaired.

Final compiled work+shell five-target command passes45/45 in10.3m,0 failed/
0 skipped/exit0, including the corrected WebKit responsive case and all five
new deal-context edit/cancel variants. The earlier79/1/5 attempt is retained,
not renamed a clean85 run. AT-39 and broader Chrome/full backend are still queued
or running. Repeated final lint/typecheck and Ruff/check/format/mypy pass:
196 formatted files,125 strict app modules. The source fingerprint remains
311 files/52723F0DA8A7CC238F2217457A4EA63D0642B603F0948192828A95EE2508D7F2.
Latest client scan reports4 roots/281 browser JS/0 configured-secret matches.

The45-case report privacy audit passes3 JSON entries/45 result step arrays/
0 detailed arrays. The final AT-39 selection passes5/5 in1.6m,0 skipped, on
all five targets. Together with the corrected affected reruns,95 distinct
five-target variants are covered; this is not one clean95-case invocation.
Earlier scheduling/ownership cases are the passing variants retained from the
original matrix. The current broader14-case Chrome selection and complete
backend suite remain required. Ten private/generated paths are ignored/0 tracked;
the final test supervisor hash is
0ED928F405BC927C0D5CF2203F389158D1B62A738A601613D9BB2A4CE1C1FBD3.

Broader compiled Chrome passes14/14 in5.2m,0 failed/0 skipped/exit0, covering
pipeline, hierarchy, real protected file/ClamAV, inventory, outcomes, requirements
and reservations. One non-fatal Windows10054 Proactor callback warning is
retained from the passing protected-transfer run. This brings covered distinct
browser variants across the corrected commands to109, not one clean109 run.
The serial complete backend coverage command has now started; no complete
SP-15 backend result or development migration is accepted in advance.

Final browser report privacy passes8 JSON entries/14 result step arrays/
0 detailed arrays; only.last-run.json remains in test-results. The written
AFTER015 delivery gate records each hard/purpose/liveliness/craft item with
scoped evidence and the actual control outcomes. No new detector, aesthetic
selection or application edit is performed. Required backend/development/
isolation checks remain separate. Documentation validation at this checkpoint
passes22 sprints/1098 local links(including70 installed-skill links)/41 acceptance
mappings/13 synchronized Mermaid pairs/9 valid API JSON examples. This command
validates documentation, not application behavior. All23 sprint criteria remain
unchecked pending final technical closure.

Final full backend command exits0:372/372 passed in727.34s(12:07),94% coverage,
0 failed/0 skipped. This includes the latest two-connection claim barrier,
allowed/disabled delivery waiters, guarded real worker process crash/restart,
strict HTTP, raw SQL negatives, timezone and populated migration cases. Earlier
focused23-case results are not added to372 as new distinct tests. Development
has now passed the guarded preflight and additive0016→0017 migration,56→59
tables, unchanged OID/cluster/unrelated catalogue and no seed/reset. Final test
schema check, HTTPS smoke, cleanup/shutdown and documentation closure follow.

## Final local acceptance (2026-10-15 UTC)

The final serial chain exits0: headed2/2(1.2m), affected five-target45/45(10.3m),
AT-39 five-target5/5(1.6m), broader Chrome14/14(5.2m), full backend372/372
in727.34s/94% coverage. Final commands have0 failed/0 skipped. Ninety-five
distinct affected five-target variants are covered through retained passing
initial cases and corrected reruns, plus14 broader Chrome variants. Neither
the original85-case attempt nor a hypothetical109-case invocation is called clean.
The full suite includes all23 new backend variants; focused checks are not added
again to inflate the distinct count. Real pinned ClamAV/PostgreSQL were used.

Both development/test inspect_database and alembic check exit0 at59 tables/
0017_tasks_reminders/no new upgrade operations. OIDs109060/109061 remain distinct,
cluster7607060034405909976 and unrelated catalogue SHA256
4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 unchanged.
Development migration was additive56→59; no reset, seed or record export.
Actual development HTTPS smoke passes explicit local CA, live/ready, direct403,
no-store and untrusted-CA refusal. Only its owned temporary API tree is stopped
in finally; port8000 returns to0 listeners. Worker --status exits0 with empty
aggregate jobs/undispatched0, no private record data.

Guarded final isolated cleanup verifies identity/cluster/private test root and
advisory lease, removes0 residual synthetic rows/0 old orphan objects and leaves
56 record tables empty/bootstrap unset. Read-only development counts likewise
show56 record tables/0 rows/bootstrap unset, policy version1/capacity2/editor
unset/no working or lunch rows. No development records were removed. Project
Compose stop exits0; ClamAV exited143/runningfalse with signature cache volume
retained. Final ports3000/8000/3100/8100/8101/3310 listeners0 and root-identified
node/Python service processes0. Shared PostgreSQL5432 has2 listeners
and remains running; unrelated containers/services are not changed.

Final client scan4 roots/281 browser JS/0 configured-secret matches, report
privacy8 JSON/14 result arrays/0 detailed,10 private/generated paths ignored/
0 tracked. Only.last-run.json remains in test-results. Build
S5SnyXhT5J3phRg8k_fNM and311-file application/migration SHA256
52723F0DA8A7CC238F2217457A4EA63D0642B603F0948192828A95EE2508D7F2 remain
unchanged through final tests/migration/smoke/cleanup. The final documentation
validator result is recorded in the QA register after closure edits.

Mandatory skills/read references, two main visual batches, one detector[],
[AFTER015](../../../anti-slop/audit-015-2026-10-15.md) per-item UI PASS report,
[fresh finish verdict](../../../.impeccable/sp15-finish-review.md) and
[documenter](../../../.impeccable/sp15-documenter.md) are complete at their stated
scopes. All25 refreshed originals/canonical captures are valid; the final ship
resolves the single French-copy finding, not fresh full-surface/human approval.
No aesthetic-only finding was selected/applied. Existing DESIGN/tokens preserved.

Retained limits:9 inherited HIGH dev-tool audit entries (runtime npm0; Python
locks0 known); one non-fatal Windows10054 callback warning; missing generic
PRODUCT/design.json metadata outside this extension's repair scope. Recipient
choices remain explicit technical proposals. Khalid's product/design review,
real-device Safari/assistive-technology, production/Linux timezone, load,
backup/recovery and full-product acceptance remain pending. SP-16–SP-22 are
unstarted; SP-15 technical acceptance is not100% CRM completion. No Git staging,
commit or destructive development operation was performed.

Final documentation validation exits0:22 sprints,1102 local links/anchors
(including70 approved installed-skill links),41 acceptance mappings,13
synchronized Mermaid pairs and9 valid API JSON examples. SP-15 has23 checked/
0 unchecked criteria. Git diff --check exits0, but the repository has17 untracked
entries/0 tracked changes; this is not represented as a tracked application diff
review. These documentation checks do not replace the executable results above.
