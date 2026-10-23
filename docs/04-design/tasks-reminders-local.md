# Local tasks and internal reminders (SP-15)

Status: technically accepted at the verified local SP-15 boundary; product review pending
Date: 2026-10-15
Evidence: [SP-15 execution](../03-planning/sprints/sp-15-execution.md).

## Authority and context

Tasks require a current canonical contact. A typed optional deal must belong to
that contact; an optional property must be a real physical asset. Owner selection
requires an active eligible account with current contact scope. Ownership is a
work assignment, not a new read/write grant. M/A can work across portfolios;
agents inherit their current primary/collaborator scope. Archived contacts are
M/A-readable but not writable. Transferred or revoked records disappear from
private counts, detail, notification links and receipt replay.

Technical recipient proposal: a due task notifies its current owner. A visit
notifies the original organizer and current participants, deduplicated, only
while each recipient has current active-account/contact access. An old owner or
organizer is retained as history, never silently replaced or granted access.
These choices remain subject to product review; they do not expand permissions.

## Task commands and retention

GET/POST /tasks, GET/PATCH /tasks/{id}, POST /tasks/{id}/complete and /cancel use
the existing HTTPS facade/session/Origin/CSRF/no-store boundary. Writes require
UUID Idempotency-Key; expected_version is a strict positive integer. Task fields
are title, notes, owner_user_id, aware minute-precision due_at and optional
deal_id/property_id; create alone takes contact_id. Technical limits match the
existing UI conventions: title160, notes/outcome1000, years2000–2100, body32KiB,
response2MiB. These limits are implementation proposals, not commercial rules.

States are open/completed/cancelled; only explicit complete/cancel changes the
state. Terminal tasks remain readable with history and cannot reopen in SP-15.
Completion/cancellation may retain an optional account of the work. Command,
true-actor snapshot, timeline/audit, typed outbox and HMAC-bound24h receipt commit
atomically. Replays first reauthorize the current contact. A failed response
can be retried with the same key; stale versions need deliberate comparison.

Task version increments on every mutation. Task schedule_version increments
only for due time, owner or status changes; title/notes/context edits do not
resend a due reminder. Visit schedule_version is separate from record version
and agency policy version: only start/end/status changes advance it. Ordinary
title/location/participants/context edits, contact merge and policy edits do not.
Existing visit events remain immutable; pre-SP-15 historical snapshots may lack
the new schedule_version, while current visit responses always include it.

## Durable queue and delivery

Extend the existing outbox_event/job/notification tables and explicit-venv
app.cli.worker. No broker, external messaging or in-process background substitute.
New event kinds: task.due, visit.reminder.day, visit.reminder.hour. Dedupe keys
are kind:parent_uuid:schedule_version; notification(user_id,event_key) is unique.
Reminder due instants are start minus24 elapsed hours or1 elapsed hour in UTC;
the backend Casablanca authority resolves civil input and local display, including
DST offsets. A draft visit has no promised reminder. Scheduled/confirmed visits
have two current events; an open task has one. New schedule/status invalidates
old event versions and outstanding leases/jobs without deleting retained rows.

Dispatch at most50 missing jobs per tick. SKIP LOCKED claims one eligible job,
leases it for90 seconds with a UUID fence, and caps attempts at5. Retry delay is
min(300,2**attempts) seconds; exhausted work remains failed for review. The CLI
process services one file job and one internal job per iteration. File and stock
events cannot be consumed as reminders. File scanning remains its existing real
ClamAV workflow; stock event kinds remain unconsumed by this reminder handler.

The operator CLI --status prints only aggregate kind/state/count and undispatched
counts; it exposes no recipient, parent ID, title, payload, token or private fact.
--once remains a bounded real processing command; neither mode accepts a clock.

Delivery locks agency then job, rechecks fence/lease/current parent schedule,
state and recipient scope, and inserts deduplicated typed notifications. A visit
whose start is already past at delivery is not sent as an upcoming reminder.
The effect commits before a separate fenced acknowledgement: a process crash or
lease reclaim repeats safely. Invalidation/revocation cannot be bypassed by an
old claim. No private title, address, phone, note, credential or message snapshot
is copied into the queue/notification. Job diagnostics are fixed safe codes.

Controlled clocks exist only as internal function parameters and guarded synthetic
test-process IPC. No product HTTP/CLI clock override, machine-clock change or
fake successful notification is introduced. Normal user/session eligibility still
uses real account time. Tests must keep clock manipulation within this boundary.

## Reads and interface

GET /tasks supports contact_id/deal_id/owner_user_id, bucket=all|today|overdue|
upcoming|completed|cancelled and numbered pages(default50,max100). Scope applies
before counts/pages, ordered due_at/id. Today is the backend Casablanca civil
day; overdue means open with due_at before now. An open overdue task due today
can appear in both filters. Upcoming starts at the next Casablanca day. Terminal
tasks are excluded from active buckets. GET /tasks/{id}/history pages retained
true-actor events; merge preserves independent task IDs/origins/owners/creation.

GET /notifications is a personal inbox with state=all|unread|read and numbered
pages, created_at descending/id order and current-scope unread_total. Typed
parent scope, current version/status and current recipient membership are checked
before totals. POST /notifications/{id}/read accepts only {} and idempotently
sets read_at once; it cannot mark another recipient's or obsolete private item.
The server generates only known local permitted links and safe current text.
Retained stale rows are not exposed as current reminders.

Visit labels name the durable event as J-1/H-1 rather than promising a remaining
duration after delayed delivery. Task history includes backend-resolved local
timestamps; clients never reinterpret a Casablanca wall time with their own zone
database.

GET /visits/follow-up lists scoped scheduled/confirmed visits whose end is before
now, numbered end_at/id order. Completing, cancelling or rescheduling that same
visit resolves follow-up; no duplicate visit is created. GET /work/context returns
backend now/today/Africa/Casablanca. Lists refresh explicitly, with loading/error/
empty/denied feedback; a list is not a guarantee of personal availability.

Dashboard work/inbox/follow-up and inline contact/deal task controls reuse KAY's
shadcn/Tailwind geometry, French labels and backend civil-time field. No chart,
new navigation destination or alternate kit. Failure-safe editing retains input
and retry identity; comparison is explicit. Product/real-device review remains
separate from local automated and headed browser evidence. No SP-17 KPI, external
calendar/message, recurring-task engine, finance or production acceptance.

## Migration boundary

0017 adds task/task_event/task_command_receipt, visit schedule_version and typed
queue/inbox fields, keys and indexes. Existing visit/actor/history rows are not
rewritten; active visits receive typed reminder outbox rows. SQL guards retain
identity/history and monotonic read state, enforce schedule-version transitions,
atomic matching outbox and stale-version invalidation. Downgrade refuses development
and retained task/reminder history. Only the existing verified isolated synthetic
fixture escape removes test rows; development is never reset or seeded.

## 0032 proactive-work extension (2026-10-22)

This additive extension keeps the existing worker, dedupe keys and typed internal
inbox. An open task has J−1, H−1 and due events; a scheduled/confirmed visit has
J−1, H−1 and end+2h follow-up events. Offsets are elapsed UTC hours, not
Casablanca wall-clock arithmetic. A visit follow-up is deliverable only while
unresolved and no later than seven days after its end; this cap is a technical
proposal to avoid old backfill floods. No external message is sent.

New tasks and visits select an exact enquiry or same-contact deal. With multiple
active enquiries and no deal, omission fails with ENQUIRY_CONTEXT_REQUIRED; a
single active enquiry may be inferred for older callers. The UI always asks on
contact/calendar creation. Typed nullable links preserve existing work without
rewriting its old history. An unchanged link survives contact ownership transfer
or Lead archival; new selections still need current scope. New true-actor
task/visit events enter only the chosen Lead/Deal timeline. A not_completed
visit needs a reason after its scheduled end
and is terminal, distinct from cancellation. The worker requests the outcome;
only the explicit visit command records it.

0032 adds the links, widens visit.status, extends typed queue/notification/action
constraints and reminder SQL guard, and backfills only current unresolved event
kinds. No contact content or credentials enter queue rows. Production migration
and deployment require separate authorization and are not implied by synthetic
test success.
