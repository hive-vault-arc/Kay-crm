# SP-12 local reservation contract

Status: implemented and technically accepted locally. Product review: pending Khalid.

## Commands and projections

`POST /api/v1/deals/{id}/reserve` accepts exactly `expected_version`,
`offering_id`, `expected_offering_version`, `expected_target_version` and optional
nullable `expected_development_version`. The last field is required to match the
current parent version for a physical development unit, and must be null for an
independent asset or whole-development offering. `release-reservation` accepts
the same reviewed facts plus a nonblank `reason` (maximum 1,000 characters).
There is no expiration, override, actor, contact, remaining-units or close field.
Both routes require the existing facade/session/Origin/CSRF proof and a UUID
idempotency key. Results retain the existing strict deal-command shape.

Deal detail/list adds nullable `active_reservation` (ID, original actor ID/time,
previous ordinary stage) and `reservation_conflict`. This private metadata is
returned only after current contact scope. Shared stock pages expose only safe
`RESERVATION_CONFLICT` / `DEVELOPMENT_OVERLAP` codes, never the holding deal,
contact or actor. Exact offering targets now include physical `version` and
nullable parent `development_version`. `reserved` is a read/filter state, never
an ordinary inventory PATCH or generic deal-transition input.

## Atomic stock rules

The existing agency/current-user lock and fresh authority check precede domain
work and receipt replay. For a new stock command, lock the development first,
then physical property where applicable, then affected offerings in UUID order.
Recheck exact target identity, parent/target/offering versions, current offering,
positive price, legal owner and unarchived marketable development. Same-offering
or same-kind parent/child claims conflict; siblings and sale/rental scopes are
not commercially conflated. A coarse target-version conflict still requires a
fresh review when unrelated target facts changed.

One active hold per offering and per deal is enforced by partial unique indexes.
The immutable hold target/author/time and a single explicit release retain real
foreign keys. PostgreSQL insert locking/overlap and deferred stock/context/
history/outbox guards complement application checks. Ordinary campaign edits,
withdrawal and availability confirmation cannot overwrite a reserved offering.
Existing hierarchy identity guards prevent moving committed target identities.

Reserve changes the offering to `reserved`, increments it and the physical target,
sets the deal stage to `reserved`, and appends real actor/contact/deal/inventory
history, outbox and receipt in the same transaction. A unit hold locks/checks its
parent but does not increment the parent's business version. Time alone changes
nothing. Ordinary progress does not implicitly release stock; retargeting an
active hold requires explicit release.

Implementation proposal: release restores the recorded prior ordinary stage only
when the deal is still `reserved`; later ordinary progress is preserved. It
increments offering/target/deal versions, makes that offering available and records
the release reason/actor without rewriting original history. It does not win,
lose, cancel, reopen or create commission records.

## Durability, UI and limits

Existing actor/route/key HMAC receipts recover the original version result after
commit interruption, but current scope/archive/session checks still apply first.
Changing a key's body returns `IDEMPOTENCY_CONFLICT`. Receipt retention does not
expire holds; after receipt expiry a fresh conflicting hold still cannot duplicate
the stock effect. Rollback removes the entire attempted mutation.

The existing PostgreSQL outbox now has exactly one typed parent: a document
version for `file.scan`, or an inventory event for
`inventory.reservation.created` / `inventory.reservation.released`. The file
worker continues consuming only `file.scan`. Stock events remain durable for
the later SP-15 notification consumer; no new broker or fake dispatcher.

The French deal detail reuses shadcn AlertDialog/Button/Label/Textarea and existing
Tailwind tokens. It shows exact target level/current state, reviewed versions,
no-expiry notice and explicit reason. Failed/interrupted actions retain input and
retry keys; refreshing reviewed facts preserves the reason. Successful commands
reload deal and embedded inventory; stock navigation fetches no-store current
facts. Client state never grants permission or allocates stock.

Migration `0014_reservations` is additive. Downgrade refuses the development
database and refuses any reservation history, including released holds. SP-13
owns outcomes, already-committed child close review and whole-development close/
reopen effects. All local tests use synthetic data and isolated PostgreSQL.

See [execution record](../03-planning/sprints/sp-12-execution.md) for actual
results and remaining limits, not full-product or human approval from this contract.
