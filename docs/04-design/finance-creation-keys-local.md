# Commission creation keys on the selected redesign branch

Date: 2026-10-29. Branch: `codex/redesign`. Technical implementation proposal;
actual PostgreSQL/native/CI and owner acceptance remain pending.

## Problem and retained contracts

Creating a commission checks the Deal version but intentionally does not advance
that ordinary dossier counter. The existing private financial command receipts
expire after24 hours. Source review therefore found that an old creation request
could reach another apply after pruning when its parent version was unchanged.
This was a source-derived risk, not an observed real financial duplicate.

Keep the confirmed24-hour receipt contract, optional M/A finance, append-only
financial facts, current authority and separate ordinary Deal history/counter.
Do not retain creation receipts indefinitely, add tombstones, infer old mappings
or bump an ordinary Deal version to fence private financial work. No schema or
migration is added. [Existing finance contract](commissions-local.md).

## Private issuance and first application

GET `/api/v1/deals/{id}/commission-creation-key` is a strict no-query, no-store
read through the existing facade/session boundary. Current M/A and writable
contact/Deal scope are required; Agents, unavailable scope and archived parents
cannot issue a usable creation request. The response has exactly `deal_id`,
`key` and `expires_at`. The key is a UUIDv7 generated using the backend clock;
expiry equals its embedded millisecond timestamp plus five minutes. Issuance
stores no receipt, commission, audit event or permission grant.

UUIDv7's first48 bits encode UTC Unix milliseconds; Python's pinned3.14 runtime
provides `uuid7()`. [RFC9562 §5.7](https://www.rfc-editor.org/rfc/rfc9562.html#section-5.7),
[Python UUID documentation](https://docs.python.org/3.14/library/uuid.html#uuid.uuid7).
These are request identifiers, not signed issuance proofs, credentials or
capabilities. A caller with current authority can supply a conforming timestamped
UUID; all ordinary write checks still apply. The endpoint avoids dependence on
the user's device clock, rather than introducing a new authentication mechanism.

The five-minute start window and five-second future tolerance are technical
defaults proposed for this branch, not a change to confirmed business retention.
The backend trusts its UTC clock. Arbitrary clock rollback is not proved safe by
the synthetic tests. The window is evaluated after agency/account waits, fresh
identity and current scope/archive checks, and after retained-receipt lookup:

| Receipt / request | Outcome |
| --- | --- |
| Retained matching actor/route/key/body receipt | Original result after current authority, even after the five-minute start window |
| Retained key, changed body | Existing `IDEMPOTENCY_CONFLICT`409 |
| No receipt, UUIDv7 timestamp within the start window | Existing version/business validation and one atomic creation/receipt transaction |
| No receipt, non-v7 key | `FINANCE_CREATION_KEY_REQUIRED`409 before apply |
| No receipt, expired or too-far-future v7 key | `FINANCE_CREATION_KEY_EXPIRED`409 before apply |

Exactly five minutes old is expired. Up to five seconds ahead is tolerated.
Integer timestamp comparison rejects extreme values without datetime overflow.
The existing actor/route/body HMAC receipt,24-hour pruning, financial locks,
current account/contact/Deal checks and transaction rollback remain authoritative.
Other financial operations retain their existing keys and commission versions.

## Client ownership and compatibility

The existing Finance command owner snapshots the confirmed typed body/callback
before issuance, proves the originating M/A identity, obtains the scoped key,
validates exact dossier/UUID/expiry metadata, then dispatches through the normal
fresh identity/CSRF path. Pending issuance locks duplicate confirmation. No
browser clock authorizes a write. Disposal suppresses a late POST.

An ambiguous dispatch keeps its original body/key. Retry never mints a new key.
If a later expired-key409 follows an unknown outcome, that outcome stays unknown;
the form cannot turn it into another financial fact. Acknowledged failures retry
current proof/read/completion only. A definite first-attempt conflict requires
explicit current comparison/acceptance and a separate confirmation before a new
key. Issuance failure itself is not an ambiguous financial write. The selected
explicit recovery-departure warning remains and never implies rollback.
[Command owner](finance-command-recovery-local.md).

Deploy backend and frontend together when release is authorized. Retained legacy
UUIDv4 receipts still replay under current authority. Missing legacy keys fail
closed; no expired mapping or original result is reconstructed. Old clients
cannot begin uncached UUIDv4 creations against this candidate backend. That
compatibility limit is deliberate and must be included in release verification.

## Verification boundary

927 frontend units pass,12 added for strict metadata, ownership, identity loss,
disposal, same-key unknown expiry, completion-only retry, explicit comparison,
facade policy and real catchall dispatch. Frontend lint/type output is retained;
build and compiled history checks exit0. The connection-forbidden backend runner
passes572 cases,14 added using controlled clocks, fully stubbed sessions/apply
and in-process HTTP. These prove command ordering and replay decisions in those
harnesses, not PostgreSQL locks, financial ledger facts or native behavior.

Three isolated PostgreSQL cases cover retained23-hour replay,25-hour prune then
replay with unchanged Deal version, and retained/pruned legacy keys. One native
phone case covers a committed/lost acknowledgement followed by a simulated
expired-key response and explicit departure. They are prepared/typechecked or
collected only, **not run**. Existing finance fixtures now obtain or generate v7
creation keys; explicit retained retry keys are preserved.

No visual composition, token, glyph, theme, motion, tab or chart changes. This is
a command/transport correction; no new visual-design or AFTER audit is claimed.
No actual app/browser/HTTP/DB/account/private config/worker/scanner/simulator/
transfer access or workaround, migration, main/push/merge/deployment. Backend
Ruff/mypy, actual SQL/concurrency/native/device/security/CI/AFTER and product
acceptance remain pending. Migrations0036/0037 are still unapplied. Main and all
254 frozen design inputs are preserved. The full redesign goal remains active.
[Evidence](../03-planning/design-migration-evidence/finance-creation-keys-2026-10-29.json).
