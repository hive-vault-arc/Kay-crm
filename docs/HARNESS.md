# KAY project harness

SP-22 local technical gates pass; [ledger](03-planning/sprints/sp-22-execution.md),
[41-scenario map](03-planning/sprints/sp-22-acceptance-map.md) and
[repeatable commands](06-delivery-and-operations/local-final-acceptance.md).
Use one complete backend regression, affected corrected reruns, one complete
compiled visible Chrome regression and19 representative variants per additional
required profile, rather than a redundant all-browser Cartesian run. Test writers
remain serial. Measure the separate full-size benchmark only after competing
build/browser/test work finishes. Late in-flight samples must not disappear at
the end of the steady window; started/completed/sample counts must agree.
No pending browser/load/product gate may be reported as accepted.
Final100-user latency requires the recorded --workers4 configuration; default1
failed. Product/design review, physical devices and production remain separate.

SP-21 necessary-only recovery evidence: [execution](03-planning/sprints/sp-21-execution.md),
[runbook](06-delivery-and-operations/local-backup-recovery.md). Use real pg_dump/
pg_restore18 and a coherent maintenance point from synthetic isolated test data.
Compare all tables/files before revocation/reconciliation, reject corrupt or
incompatible points/current authority and refuse development/alias targets.
Test process death/explicit safe resume, actual concurrent drain, exact retention
boundary and two real recovered worker cycles without duplicate durable effects.

recovery.spec.ts and recovery.chrome.spec.ts use private allowlisted test IPC,
not app fault endpoints: stop source services, restore fixed recovery, launch the
real recovery API, reject old cookie/permit and freshly sign in across restored
dashboard/contact/deal/project/files/calendar/finance. A post-point enquiry must
be absent; copied private IDs deny. All writers stay serial under the existing
exclusive test lease. Recovery cleanup checks live cluster/OID and synthetic-only
actors; it never relaxes production immutability. Capture settled full DOM width,
including classic scrollbar, and actually open all evidence frames.

SP-20 necessary-only evidence: [execution](03-planning/sprints/sp-20-execution.md).
The focused signed-intake slice covers real PostgreSQL races and killed worker
restart, one compiled end-to-end workflow plus native states/accessibility and
named byte-cap recovery. Isolated writers keep the shared lease; all Python uses
backend/.venv. This is not a full CRM/five-browser/load/backup pass.

SP-19's necessary-only checks are in
[execution](03-planning/sprints/sp-19-execution.md): guarded isolated PostgreSQL,
29 distinct backend cases through the final27-case command plus strengthened
positive deal/document and closed-input retention CLI cases, compiled Chrome and native desktop/mobile/state/
keyboard/touch/zoom. This is not a fullCRM/five-browser/load/recovery pass.
New export effects use existing queue leases/fences and current authority.
Private report/secret scan and isolated synthetic cleanup remain required.

Status: active working agreement; SP-01–SP-20 scoped execution evidence recorded
Date: 2026-10-16  
Confirmed context: KAY's C01-C14 core, architecture, permissions, and acceptance tests are documented.  
Technical proposals: the task loop, evidence, and handoff conventions below.  
References: [agent instructions](../AGENTS.md), [scope](../core-scope.md), [decisions](../decisions.md), [QA commands](QA_COMMANDS.md), [security check](SECURITY_CHECK.md), [lessons](AGENT_LESSONS.md), KV `Agentic Coding/Harness/H.V.A Harness v1.md` and `Agentic Coding/Harness/Project Agent Loop.md`.

The existing project brief, decisions, rules, permissions, workflows, models, APIs, and tests already serve as project context and product contract. Do not create a second competing copy of those facts. KV provides a reusable method; this file applies it to KAY.

## Task input

For a substantial implementation, bug fix, review, or sprint, record the following before editing. A chat task can serve as the record if its scope is clear; a sprint file is better for work spanning turns.

```text
Goal and C01-C14 requirement IDs:
User/role and business outcome:
Read-first project files:
Allowed changes and exclusions:
Acceptance criteria, including denied and failure paths:
Data, API, UI, migration, security, and privacy impact:
Real QA commands and manual checks:
Approval needed before:
Stop or escalation condition:
```

Do not invent acceptance after coding. Every criterion should be observable: a response, record state, UI state, permission denial, test, or recovery result. For a full-stack feature, plan the API and data contract, frontend integration, and tests in the same vertical slice; do not mark a backend-only endpoint as a finished user feature. For any UI slice, carry the binding shadcn/ui, Tailwind CSS, and Bklit UI rules from [AGENTS.md](../AGENTS.md) into its acceptance criteria; note a justified custom KAY component or scoped CSS exception rather than silently switching libraries.

## Loop and evidence

1. Read `AGENTS.md`, task-specific contracts, relevant source, QA commands, and lessons.
   For UI work, also read the three installed skills in the [mandatory UI skill rules](03-planning/ui-skill-rules.md). Record surface applicability, system reuse and visual evidence; use antislop AFTER completed UI, without unapproved audit-only fixes.
2. State the smallest safe change and any unresolved decision.
3. Edit inside scope. Keep contracts, implementation, tests, and affected docs aligned.
4. Run the smallest useful check promptly, then the broader checks required by the changed boundary.
5. Fix the identified cause and rerun. After two or three unproductive cycles, report evidence and seek direction.
6. Stop only when acceptance and required gates pass, or when a genuine blocker or new authority is needed.
7. Save a durable lesson only for a real mistake, pitfall, or rule; do not fill the log with routine status updates.

Verification evidence names the command, environment, result, and relevant test case. For UI work, include browser, viewport, role, state, and screenshot or reproducible observation. For security-sensitive work, use [SECURITY_CHECK.md](SECURITY_CHECK.md). Mark checks that could not run as **not run**, never as passed.

SP-05 enforces serial isolated database writers with a shared PostgreSQL advisory
lease in pytest and the private browser supervisor. Acquire it before synthetic
cleanup, retain it during API stop/start and fail closed if unavailable/lost.
Do not defeat it to parallelize destructive fixture work. CLI and subprocess
Python still use backend/.venv explicitly; no product failure switch is added.

## Handoff format

```text
Found:
Changed:
Verified:
Security checked:
Blocked or not run:
Saved in docs/AGENT_LESSONS.md:
Remains and next safe action:
```

Approval is required for a material scope change, production/real-data action, irreversible data change, external send or new authority. The approved local plan already authorizes routine implementation and use of supplied local development configuration; protect it without repeatedly requesting permission. Pass the sprint's technical gates before progression and record Khalid's product review separately. The security gate still applies.

## SP-09 verification boundary

Real healthy local ClamAV is a file-test prerequisite, not a fake verdict flag.
Use backend's pinned compose/runbook and explicit venv for workers and every
Python command. Test API supervisor starts a separate actual file worker and
privately stops/restarts it or points it at a refused loopback port for outage
cases. No fault-control endpoint is mounted in FastAPI/Next. Cleanup pauses that
worker before deleting only isolated synthetic actors, preserving FK/history
invariants. Never run a second fixture suite against the same database lease.

Binary bytes use direct FastAPI grants; browser/API fixtures prove real clean/
controlled rejection, no public URL, current private/shared scope, single-use
session binding, interruption/retry and durable scan states. Use numeric progress
and actual response/verdict observations, not arbitrary sleeps. Native captures
must show their named state; full-page review uses a separate authenticated test
tab so screenshot scrollbar changes cannot disturb workflow geometry. Sources,
failures, corrected runs and final limits are in
[SP-09 evidence](03-planning/sprints/sp-09-evidence.md). No production or real-data
operation is authorized by this synthetic harness.

## SP-10 verification boundary

Requirements inherit current linked-contact scope, including archive, transfer,
alias resolution and authorized merge. Preview hashes bind real requirement
IDs/current parents/versions; merge preserves independent searches, origins and
shortlist identities, never unions collaborators. Verify both current read and
same-key command replay after scope revocation, not just the original response.

The real-stack browser cases create actual standalone/unit/whole-programme
offerings, preserve original monthly/yearly values and compare exact annual MAD.
Required/preferred/unknown and false are distinct; reject zero/unsupported types,
template targets and stale versions. Test actual committed-response interruption,
same-key retry, explicit409 reconciliation and keyboard focus after async save
and removal. Only synthetic data enters captured evidence. Final commands,
retained failed attempts and scoped limits are in [SP-10 evidence](03-planning/sprints/sp-10-evidence.md).

## SP-14 verification boundary

Use synthetic administrator work/lunch settings and agent visits across all three
types. Exercise no configured hours, office outside hours, both off-site gates,
company-car agency-wide half-open hourly counts, draft/terminal exclusion and
reason-required participant overlap separately from hard rejection. Force real
last-slot and policy-versus-booking lock waiters. Cover backend-authoritative
Casablanca fold/skipped resolution and verify actual runtime tzdata agreement.
Current linked-contact authority applies to lists, counts, detail, history and
receipt replay; safe colleague busy responses expose only interval/busy fields.
Preview policy impact before save and prove existing visits remain recorded.
Transfer/archive/merge must preserve origin/organizer/actor history without
granting participant access. Include before/after-commit interruption, stable
retry keys, stale versions, raw SQL guards and populated additive migration.
Use `tests/test_schedule*.py`, `tests/e2e/schedule.spec.ts` and the headed
`tests/review/schedule.chrome.spec.ts`; all DB writers run serially under the
same isolated lease. See [the contract](04-design/visit-scheduling-local.md) and
[execution ledger](03-planning/sprints/sp-14-execution.md) for actual outcomes.
Reminder delivery and overdue work remain SP-15, not a silent outbox consumer.

## SP-11 verification boundary

Create affaires explicitly from both Lead and Deals using the same form, retain
the enquiry unchanged, validate optional same-contact requirement and exact
offering context, and derive responsibility from current contact scope. Test
all ordinary skips plus rejection of reserved/outcome/arbitrary stage writes.
Record/accept/edit a customer proposal without changing deal stage or inventory.
Verify true actors and immutable historical target/terms, not just final state.
Exercise current authority after real lock waits/transfer/merge/archive, denied
copied IDs, scoped counts, separate-connection version races, interruption and
same-key retry. Deal file grants must fail after contact-scope revocation.
Frontend cases include numbered pages/columns, preserved drafts/comparison,
desktop/mobile, keyboard/touch/real200% zoom and truthful future commands.
The [local contract](04-design/deal-pipeline-local.md) and [execution ledger](03-planning/sprints/sp-11-evidence.md)
record actual results; all test writers remain serial, synthetic and isolated.

## SP-15 verification boundary

Use real PostgreSQL and the existing worker under the isolated advisory lease.
Test task create/edit/complete/cancel, due/today/overdue, typed context validation,
true actors across merge/transfer/archive, replay after authority removal and
strict CSRF/no-store routes. Synchronize actual agency-lock waiters; verify
delivery both while allowed and after recipient disablement. Two claimants and
replayed effect-before-ack must leave one recipient/event notification.

Stop/restart a real venv worker process, crash after effect/before acknowledgement,
expire the lease, and reject its old fence. Verify bounded backoff/exhaustion,
new J-1/H-1 versions and obsolete reschedule/cancel/complete invalidation. Clock
control is only guarded synthetic-test IPC. Populate0016 with visit/event/actor
facts before migration and compare unchanged values afterward; retained-history
and development downgrade refuse. Do not recreate development to update draftDDL.

Browser checks use the compiled HTTPS facade/API with serial synthetic fixtures.
Exercise task due/read/completion, visit reminders/new schedule/follow-up, private
links, retained interruption/conflict, desktop/mobile/native touch/keyboard and
actual200%. See [execution](03-planning/sprints/sp-15-execution.md) for actual
commands/results and limits; this recipe alone is not evidence of a pass.
