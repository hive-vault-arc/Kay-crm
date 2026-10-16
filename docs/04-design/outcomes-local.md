# SP-13 local outcomes and reopening contract

Status: technically_accepted at the scoped local boundary. Product review: pending Khalid.

## Explicit private commands

`POST /api/v1/deals/{id}/close` accepts current `expected_version`,
`outcome=won|lost|cancelled`, `completed_on` and nonblank `explanation` (1–1000).
Won additionally requires an exact positive decimal-string `agreed_amount_mad`
and an actual linked physical/whole-development offering. Lost/cancelled require
no amount and reject a supplied non-null amount. There is no commission, income,
actor, owner, override or remaining-units field. A proposal never closes a deal.

Selected stock requires the complete reviewed `offering_id`,
`expected_offering_version`, `expected_target_version`, nullable
`expected_development_version` (required to match a unit's parent) and
`expected_stock_fingerprint`. With no offering, all stock facts must be null.
Fingerprints bind affected stock identities, versions and current states; they
are optimistic-review data, never permission or authorization tokens.

`POST /deals/{id}/reopen` accepts the same reviewed facts and a required `reason`.
It appends a linked reopening and returns to negotiation, preserving the original
outcome, amount/date/explanation, actual actor and primary-agent-at-close snapshot.
Lost/cancelled reopening claims no stock. Won reopening restores only the exact
unchanged effects belonging to that outcome; it never resurrects a reservation.
Intervening stock/fact changes return safe review conflict, not blind restoration.

Both use existing session/facade/Origin/CSRF and actor/route/key receipts. Current
scope/archive/session checks precede mutations and receipt replay. An interrupted
committed request has one effect; a changed body/key pairing conflicts. Results
retain the existing strict deal-command shape. Ordinary edits/transitions cannot
write terminal stages, snapshots or stock. Ordinary deal/proposal mutations remain
blocked until reopen. SP-13 introduces no new file-permission policy: inherited
file APIs still enforce current contact scope; the closed detail's file composition
is read-only, not an authorization token or a changed backend file contract.

`GET /deals/{id}/stock-review` returns current deal version, the safe current
offering and a bounded stock preview. `GET /deals/{id}/outcomes` is numbered and
contact-scoped, including original actor/responsibility snapshots and any linked
reopening. Transfer/merge change current scope, never historical attribution.

## Inventory effects and manager-only external results

Inventory owns the changes, called within the same transaction by Deals. Lock
development first, then physical target and affected offerings in UUID order;
recheck identity, current stock, versions, legal owner and marketable structure.
Close, external result, reserve and reopen share this stock discipline.

- Sale marks the selected sale sold, releases its own/unfinished opposite rental
  holds, and withdraws unfinished active rental campaigns. Completed rental
  history remains. Rental marks the selected rental rented; sale may stay active
  with explicit occupancy. No timer ends a hold or a recorded lease.
- Whole outcomes reject any already sold/leased child as
  `PARTIAL_DEVELOPMENT_REVIEW_REQUIRED`. Active child holds require overlap/review,
  including opposite-kind holds. There is no remaining-units override under Q-06.
- Without prior commitments, whole sale withdraws affected unfinished unit
  campaigns; whole rental withdraws unfinished unit rentals while unit sales
  remain visible with occupancy. A unit result puts advertised whole scope into
  review; it does not silently claim or erase another commitment.
- Proposed interpretation of affected-deal flags: include occupancy changes even
  where a sale campaign remains active. Flags request review, not automatic loss,
  cancellation, reassignment or permission to override stock.

Manager/administrator `POST /properties/{id}/external-outcome` and
`POST /developments/{id}/external-outcome` require reviewed target `expected_version`,
offering/parent versions/fingerprint, date and a shared non-private explanation.
Kind is derived from the selected offering. They update stock and safe flags,
never create a KAY deal win, commission or collection. Their GET `stock-review`
requires exactly `offering_id`. Agents cannot invoke either external boundary.

Previews name exact safe target references/levels, old/planned states and hold
releases. At most50 effects are returned, with the complete effect count; the
fingerprint and command check the entire scope. No holding deal/contact/owner or
private explanation appears. Shared offering reads add `occupied`; inventory
history adds nullable original `completed_on` and `external_outcome`, not private
deal identifiers or agreed amounts. Original outcomes remain private to contact
scope. A KAY explanation is never copied into shared stock history.

## Durable data, guards and future boundaries

Additive `0015_outcomes_reopening` adds immutable `deal_outcome`, `deal_reopening`,
`stock_outcome`, `stock_effect` and `stock_reversal`, plus current deal flags/
responsibility and stage-event flag snapshots. Restricted FKs, unique outcome
versions/reopen links and append-only triggers retain provenance. Stock effects
and reversals link real immutable inventory events and typed PostgreSQL outbox.
The latest unreversed effect protects committed state/version/terms. Terminal
deal, history, stock context and whole/child consistency have deferred SQL guards.
Downgrade refuses development or any retained outcome/reopening/effect history.

The outbox extends its existing inventory-event parent for
`inventory.outcome.created` / `inventory.outcome.reopened`; the real file worker
still consumes only `file.scan`. SP-15 owns future notifications, SP-16 optional
financial recognition/receipts/corrections and the required financial-preservation
rerun. No nonexistent financial record is claimed as tested here. SP-17 owns KPI
aggregation against retained outcomes and primary-agent-at-close snapshots.

French detail/campaign UI reuses shadcn confirmation, fields, actions and existing
Tailwind tokens. Fresh facts precede confirmation; failures retain drafts/keys;
stock errors explain manager review without private details. Successful command
receipts are historical acknowledgements; current no-store reads display stock.
See [execution evidence](../03-planning/sprints/sp-13-execution.md) for actual
results and remaining gates, not full-product or human approval from this contract.
