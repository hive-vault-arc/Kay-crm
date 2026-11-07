# Local visit scheduling contract (SP-14)

Current selected command recovery,2026-10-29: the
[working-hours owner](policy-command-recovery-local.md) now pins the original
reviewed operation, verifies contextual receipts and completes from a fresh
scoped read. Parent outages retain drafts; definite conflict still requires a new
impact preview. Backend rules/contracts unchanged; actual acceptance pending.

Selected detailed-policy UI,2026-10-27: /settings/working-hours keeps its existing
administrator gate and exact policy/preview/save contract. Seven summary rows
preserve every period/pause; a guarded drawer owns the complete editable proposal.
New rows are blank. Every edit invalidates the preview lease immediately; late
previews cannot authorize save. Conflict comparison shows current complete rows,
retains input and requires a new preview. Role/authority denial removes old impact
content. Backend working-time, capacity, affected-visit hash and version checks
are unchanged. Source checks pass; native and real-PostgreSQL workflow acceptance
remains pending. [Evidence](../03-planning/design-migration-evidence/settings-forms-2026-10-27.json).

## Selected general Notes mapping (2026-10-26)

General notes are separate from overlap_reason and terminal outcome. The selected
form/read disclosure now binds to optional notes (technical cap1000, a proposal
matching existing visit text bounds). Omission on edit preserves stored notes;
explicit empty clears. All existing current-scope/version/terminal rules apply.
New immutable snapshots include notes; pre-migration snapshots stay unchanged.

The trusted facade requests X-Kay-Visit-Notes:1 on visit metadata and calendar/context.
Opt-in context adds notes_supported:true; detail/list snapshots include notes and
history includes it only when originally recorded. Without opt-in, responses keep
the old strict shape. With an older backend, support/notes are absent and the new
form sends no notes. Absent notes preserve legacy receipt-body hashes. Free/busy
stays metadata-free. This is representation negotiation, never an access grant.

Prepared revision0036 adds an empty-default String1000 and deferred event matching;
it refuses destructive downgrade in development or with retained note history.
Apply the additive schema before deploying the new backend. No migration was
executed in this slice. Real PostgreSQL/native acceptance remains pending; see
[execution](../03-planning/design-prototype-migration-execution.md).

Status: implemented and technically accepted locally; product review pending
Date: 2026-10-15
Authority: C01/C07/C13/C14, BR-06/16/30 and accepted Q-07.
Evidence: [SP-14 execution](../03-planning/sprints/sp-14-execution.md).

## Current selected presentation (2026-10-26)

The owner's frozen-design migration replaces the historical hourly/mini-month
presentation with day columns, drawer filters and a phone agenda. Current scoped
facets, numbered pages and safe colleague intervals remain authoritative. The
Next booking entry additionally accepts a strict optional date context alongside
contact_id, carrying only a real2000–2100 date through authorized contact selection.
No hour/instant is supplied by that link. Separate date/time controls retain the
existing backend local-time resolver, skipped/repeated-time choices and final
preview/booking checks. This is presentation/context adaptation, not a new API
permission or scheduling rule. Native/final acceptance remains pending.
[Implementation evidence](../03-planning/design-migration-evidence/calendar-2026-10-26.json).

## Selected routed drawer refinement (2026-10-26)

The visits layout owns the calendar while the existing create/detail routes open
shared guarded drawers. Page identity/UUID/query/password gates remain. Forms
retain date-only entry, resolved instants, scoped contact/property/dossier choices,
participants, reviewed versions, retries and explicit commands. Draft rescheduling
retains its draft status without a booking preview. Saved overlap explanations
remain separate from outcomes. History lazily presents the existing latest100
entries in20-entry cards; current denial clears the old view. Native route/focus/
stacking acceptance remains pending. The prototype's separate general Notes field
still needs a persistence mapping and is not claimed implemented by this UI slice.
[Current execution](../03-planning/design-prototype-migration-execution.md).

## Rule and authority

Only administrators preview/save working policy. Active, unrestricted staff read
the safe policy. No workday or clock-time defaults are invented: the singleton
starts at version1, capacity2 and no windows. Both off-site types must fit the
union of configured work windows and avoid every lunch minute. Office bypasses
work/lunch/car capacity. Adjacent work windows are continuous; overlapping work
or break windows, breaks outside work and nonpositive capacity are rejected.

Only scheduled/confirmed company-car visits consume capacity. Every real local
clock-hour interval touched by [start,end) counts once, agency-wide; the exact end
boundary is excluded. Drafts hold nothing. Completed/cancelled visits release
capacity without deleting their records. Ordinary participant overlap is a
separate, real-time intersection requiring an explanation; it cannot override
work/lunch/capacity. Every successful booking/confirmation/reschedule rechecks.

Commands lock agency, current user and policy in that order, then change a visit.
The agency lock is shared with current-role/contact ownership changes. Current
session/role/contact authority is reloaded after waiting and before receipt
replay. Preview holds no reservation. A changed policy preserves visits; impact
and current detail report review codes instead of cancelling or moving them.

## Clock authority and tested local mismatch

Runtime inspection found Python tzdata2026.5 resolves Casablanca differently
from the shared PostgreSQL18.2 and Node24/2025c timezone data on some dates.
SP-14 pins the already-installed tzdata2026.5 as an explicit runtime dependency.
The backend is the civil-time authority. Do not use browser/Node Intl or SQL
`AT TIME ZONE 'Africa/Casablanca'` as a second scheduling-rule implementation.
No shared PostgreSQL installation or system timezone was changed.

UTC instants remain the storage/locking/capacity identity. Backend projections
include authoritative local offset strings; free/busy start/end strings carry
those offsets without adding metadata. Local input is resolved by trying both
folds and round-tripping UTC: zero valid choices means skipped/nonexistent time,
two means an explicit occurrence choice, one resolves normally. Hour iteration
uses UTC intervals, preserving repeated-hour identity. Within the supported
2000-2100 input period, Casablanca offsets are integral hours. Elapsed duration,
not naive wall-clock subtraction, defines the visit period.

References: [Python zoneinfo](https://docs.python.org/3.14/library/zoneinfo.html),
[IANA timezone release notes](https://data.iana.org/time-zones/tzdb-2026d/NEWS),
[SQLAlchemy2.1 sessions](https://docs.sqlalchemy.org/en/21/orm/session_basics.html),
[PostgreSQL18 locks](https://www.postgresql.org/docs/18/explicit-locking.html).
The local observed mismatch, not a new KAY timezone/business decision, motivates
the single-authority adapter. Future tzdata upgrades require boundary regressions.

## Concrete HTTP contract

All routes use the existing HTTPS facade/session/Origin/CSRF and no-store rules.
Bodies/query/projections are strict allowlists. Existing-object commands require
positive integer expected_version; writes require UUID Idempotency-Key. Receipt
scope is actor/operation/target/key for24h, with a keyed body hash; changed bodies
conflict. Current authority is checked before returning an old acknowledgement.

- GET `/visit-schedule/policy`: version, immutable time_zone, capacity and work/
  lunch rows (`weekday` ISO1-7, `start_local`/`end_local` HH:MM).
- POST `/visit-schedule/policy/preview`: expected_version, capacity and rows.
  Returns proposed policy, affected future visits (first100), actual total and
  preview_hash binding the proposal/current future-visit IDs+versions.
- PUT `/visit-schedule/policy`: same proposal plus preview_hash. Under the lock,
  changed policy/version or visit set requires a new preview. Success returns
  impact and appends immutable schedule history plus non-secret audit.
- POST `/visits`: contact_id, title, type, explicit offset-aware minute-precision
  start_at/end_at, location, unique participant_ids, overlap_reason, nullable
  deal_id/property_id, and status draft|scheduled. Contact aliases resolve to
  the authorized survivor. Participants are active, unrestricted staff with
  current contact authority; membership never grants detail access.
- PATCH `/visits/{id}` and POST `/visits/{id}/reschedule`: full editable fields
  plus expected_version, retaining the contact/organizer/origin/identity.
- POST `/visits/{id}/confirm`: expected_version and reason, required on overlap.
  Draft/scheduled become confirmed only after current rule checks.
- POST `/visits/{id}/complete` or `/cancel`: expected_version and nonblank reason
  (result for complete). Complete requires scheduled/confirmed; cancel also
  accepts draft. Terminal records cannot be reopened or rewritten by this slice.
- GET `/visits`: bounded offset-aware range, optional contact_id/user_id and
  numbered page/page_size(max100); stable start_at/id order after scope filtering.
  D38 adds optional `types` and `statuses`, unique comma-separated exact values.
  Types are office/company_car/without_company_car; statuses are
  draft/scheduled/confirmed/completed/cancelled. Omitted means all; explicit empty
  string means none. Unknown/duplicate/whitespace values are rejected. Filters
  combine before pagination. Response adds canonical zero-inclusive `type_counts`,
  `status_counts` and `unfiltered_total` for the complete authorized range after
  contact/user scope, before type/status selection. Counts and items use the same
  repeatable-read snapshot, never just the current page or unauthorized visits.
- GET `/visits/{id}`: scoped record, authoritative local strings, current review
  code and read-only archived-contact indication. GET `/visits/{id}/history`
  returns the last100 immutable typed events, original snapshots and actors.
- GET `/calendar/free-busy`: same bounded range/pages, optional user_id; returns
  only start_at/end_at/busy per interval. contact_id, types and statuses filters
  are rejected, including explicit empty selections. No facets are returned.
- GET `/calendar/availability`: type, range and optional authorized exclude_visit_id.
  Returns safe policy version, hard-rule result and company-car hourly numeric
  used/capacity/remaining; no private record IDs or descriptions. Preview only.
- GET `/calendar/colleagues`: active safe staff IDs/display names; an optional
  authorized contact_id limits choices to eligible participants.
- GET `/calendar/context`: backend today, time_zone and non-secret tzdata version.
  GET `/calendar/local-time?local=YYYY-MM-DDTHH:mm`: valid instant/local choices.

Technical bounds, not new commercial rules: title160, location/reason1000 chars,
1-100 unique staff participants,42 work and42 lunch rows, capacity1-1000, explicit
minute precision, visits and availability previews up to7 elapsed days, calendar
list/free-busy ranges up to8 elapsed days to include a seven-local-day DST week.
Invalid bounds fail safely without writes.

## Persistence, permissions and UI

Revision0016 adds8 tables: policy, working/break windows, visit, participant,
visit event, schedule event and retry receipt. Restricted historical FKs,
positive periods/capacity/version and unique per-version histories apply.
Deferred guards check window overlap/containment and matching policy/visit
history/participants; actor/origin/organizer identities and terminal states are
protected. SQL capacity writes serialize on policy and recheck hourly counts.
Civil working-time validation deliberately belongs to the authoritative backend,
not the mismatched SQL timezone database. Migration downgrade refuses development
or retained visit/policy/receipt history; no destructive development rollback.

Contact merge preview includes actual visit IDs/current parents/versions/status;
confirmation reparents only the current contact, preserving origin, participants,
organizer and previous authors/snapshots. Transfer/archive immediately changes
detail and replay authority. A newly responsible user can explicitly remove a
now-ineligible previous participant when editing, not inherit private access.

S09 uses `/visits`, `/visits/new`, `/visits/{id}`; S17 uses administrator-only
`/settings/working-hours`, linked from Settings. Flat weekday groups compose
shadcn inputs/buttons and an impact region. Calendar uses a seven-day desktop
composition and chronological mobile agenda, not a chart; no Bklit replacement.
Form, current policy, capacity preview, overlap reason and retained failure draft
remain distinct. Version comparison preserves the draft and demands review.
Confirmation/result/cancellation uses the existing bounded shadcn AlertDialog.

No fleet assignment, external message, reminder consumer or automatic cancellation
is added. SP-15 owns reminders/overdue delivery. No production/real-data acceptance
or Khalid product/design approval is implied by this contract.

## D38 calendar composition (2026-10-18)

The supplied calendar reference extends S09 only: compact toolbar, mini-month,
type/status checkboxes, actual lunch disclosure, seven-day hour grid and working
Agenda/Par type views. Mobile collapses the existing filter rail into its shadcn
Sheet and uses the chronological agenda. Building/people/car Iconsax identify
office/no-car/company-car; real status remains separate and textual. Backend
local strings determine event position; the browser does only Gregorian date
arithmetic. Overlap clusters get distinct lanes, short visits retain44px targets,
and overnight visits continue on the next day. Dynamic hours and local scrolling
retain early/late events; server pagination remains explicit. Calendar geometry
is centralized in `branding/kay-ui-tokens.json`, not a new library or chart.
No schema migration or development-data seed. See the
[implementation and verification](../03-planning/calendar-reference-refresh.md).
