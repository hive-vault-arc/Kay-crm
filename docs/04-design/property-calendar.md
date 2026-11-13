# Property reservations and closures

The **Calendrier** tab on a standalone property or physical unit shows its
reservations and closures for the selected month. Staff can read the dates.
Managers and administrators can add, modify, and cancel entries and read their
internal notes. A date range uses Casablanca civil dates. The end date is
exclusive, so a new stay can start on the previous checkout date.

The dated calendar is distinct from the existing undated hold on an offering.
A rental hold or a recorded sale/undated lease blocks new future periods on the
affected physical inventory. Dated reservations and closures prevent new undated
rental holds and rental closings for that stock. A sale closing checks active and
future dated bookings. Archiving checks both kinds of periods. A whole-development
rental stock command checks child calendars. Independent units remain separate.

- `GET /api/v1/properties/{id}/calendar?month=YYYY-MM-01` returns only intersecting
  active periods with the current property version.
- `POST /api/v1/properties/{id}/calendar` and
  `PATCH /api/v1/properties/{id}/calendar/{period_id}` take the expected property
  version, kind, start/end dates, and optional note.
- `POST /api/v1/properties/{id}/calendar/{period_id}/cancel` takes the expected
  property version and a reason. Cancellation releases the dates and retains the
  entry and true-actor audit trail.

Migration `0045_property_periods` is additive. The partial PostgreSQL exclusion
constraint applies to active rows by property and date range. It uses
`btree_gist` for UUID equality. Existing inventory commands and the property
calendar share the property/parent lock and existing idempotency receipts.
Public shares, contact records, and visit calendars receive no period details.
