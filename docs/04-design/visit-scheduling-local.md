# Local visit scheduling contract (SP-14)

Status: implemented and technically accepted locally; product review pending
Date: 2026-10-15
Authority: C01/C07/C13/C14, BR-06/16/30 and accepted Q-07.
Evidence: [SP-14 execution](../03-planning/sprints/sp-14-execution.md).

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
