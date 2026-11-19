# Permanent inventory deletion — D54

Khalid requested permanent deletion on 2026-11-19 and explicitly limited the
change to biens and programmes. This supersedes D44's inventory archive action.
The existing contact, prospect, deal and visit lifecycle rules remain in effect.

## Command and interface

Managers and administrators see **Supprimer ce bien** or **Supprimer ce programme**
in the record's Actions menu. One accessible destructive confirmation explains
the scope. It requires no reason, version comparison or stock-review workflow.
The API uses `POST /api/v1/properties/{id}/delete` and
`POST /api/v1/developments/{id}/delete`, with strict JSON `{ "confirm": true }`.
The existing facade authority, origin, session, CSRF and UUID `Idempotency-Key`
checks apply. Agents cannot delete inventory. The command rechecks current
authority before receipt replay and serializes under the existing agency lock.

A lost acknowledgement keeps the confirmation open. Retry sends the same command
key and body; its saved receipt resolves the deletion even though the live record
is gone. Success returns the ordinary inventory result with the requested root
ID, its final version, deletion event and `offering_id: null`. Another key for an
already deleted ID returns 404. A response with the wrong root is rejected.
A quiet live read returning 404 for that exact root waits for the pending
deletion receipt, including an already in-flight read. The marker is scoped to
inventory and the exact path; 401/403 and other records still redact immediately.
Legacy archive/restore endpoints and queries remain compatible for old clients;
they cannot restore a deleted root.

## Atomic catalogue and history changes

Migration `0054_inventory_deletion` introduces typed `property_identity` and
`development_identity` rows. Historical foreign keys refer to these retained
identities. Live hierarchy links still refer to live inventory. Root creation
registers its identity in a trigger; a deleted UUID cannot be recreated. A
guarded root deletion requires the exact authorized transaction target ID.

Deletion locks and removes the live property, or the development and every live
child unit, floor, block and unit type. It appends true-actor inventory/audit
events and a command receipt in the same transaction. Open reservations receive
normal release history and outbox events. Their deals return from the reserved
stage to the previous stage and are flagged for stock review. Open/draft offers
are withdrawn. Completed sale/rental stock effects and finance remain immutable.

Retained offerings resolve a shared target snapshot labelled **Bien supprimé** or
**Programme supprimé** for historical dossier reads. They do not appear in stock
selectors or current offering totals. New deals and shortlist links cannot
target deleted inventory; existing dossier context remains readable. An existing
deal may keep its own current project choices when editing other client facts;
the deleted project cannot be copied into a new or different deal. Failure
before commit rolls back catalogue, reservation, audit and receipt changes.

## Media removal and operations

Photo/document and staged/output video object keys enter the durable
`inventory_blob_deletion` queue before live deletion. Parent authorization
immediately denies new transfers and playback. The ordinary worker removes
private local/Spaces blobs and local partial files after two minutes, allowing
bounded in-flight transfers to finish and fail their final authorization check.
Cleanup is idempotent, claims with `SKIP LOCKED`, and retains failed work with
bounded retry backoff. It adds no service or recurring infrastructure cost.

Backup object verification still requires every referenced live/archive, contact,
deal, import, export and video object. Retained document metadata under a deleted
inventory root does not require erased media bytes. The database dump retains
the three new tables, including typed identities and pending deletion work.

Apply migration 0054 before deploying code that queries its tables, including
the ordinary worker. It is compatible with the preceding application version.
Do not downgrade after any deletion; the migration explicitly refuses that
operation because catalogue reconstruction cannot be inferred from history.
Deletion is tested on synthetic isolated targets, never by deleting a customer's
production property as a smoke test.
