# Local optional commissions and collections (SP-16)

Status: technically accepted at the local SP-16 boundary; product review pending
Date: 2026-10-15
Evidence: [SP-16 execution](../03-planning/sprints/sp-16-execution.md).

## Authority and optional workflow

Only a current manager/administrator can read or write finance. Agents receive403
before commission lookup, including unknown IDs; ordinary deal projections contain
no commission fields. A deal closes without any financial record or prompt.
Commissions are optional, explicitly created as expected, explicitly recognized,
then separately collected. Recognition records no receipt. There is no inferred
recognition on a won deal and no invented requirement that a deal be won first.
Current contact scope/archive rules still apply: archived finance is M/A-readable,
never writable. Account/role/contact access is rechecked after waits and before
idempotent replay. Existing protected-file permissions are not expanded.

## Exact calculation contract

Money/base/rate travel as strict positive decimal strings, never JSON floats or
scientific/nonfinite values. Fixed terms require explicit base_mad and amount_mad,
with rate_percent null. Percentage terms require explicit base_mad/rate_percent,
with amount_mad null on commands; responses include the calculated amount.
Base supports16 integer/eight fractional digits, rate4/eight, amount16/two.
These bounds are technical storage/transport proposals, not commercial policy.
No100% rate cap or inferred base is introduced. Maximum result is9999999999999999.99.

Decimal precision60 preserves the complete product; only the final MAD amount is
rounded to0.01 with ROUND_HALF_UP (`MAD_FINAL_ROUND_HALF_UP_2`). For example,
base10.05 × rate10 /100 =1.005 becomes1.01 MAD, not1.00. PostgreSQL numeric/round
enforces the same relation. The UI preview uses integer fixed-point BigInt, not
binary-float money arithmetic. Retained base/rate do not undergo intermediate
rounding. Calendar receipt/due dates are civil dates; history includes UTC and
server-resolved created_local in Africa/Casablanca, displayed in French.

## Commands and numbered reads

All routes use the established HTTPS facade, revocable PostgreSQL session,
Origin/CSRF, no-store and UUID Idempotency-Key boundary. Commands accept only
their strict shape; the browser facade bounds bodies32KiB/responses2MiB.
GET lists use numbered page/page_size, default50/max100; unknown, duplicate or
unbounded queries are rejected. Expected versions are strict positive integers.

| Route | Contract |
|---|---|
| GET/POST /deals/{id}/commissions | Scoped list; create Terms + expected_deal_version |
| GET /commissions/{id} | Current immutable revision, collected_mad and balance_mad |
| GET /commissions/{id}/revisions | Numbered true-actor/reason/previous-revision history |
| GET /commissions/{id}/receipts | Numbered retained originals/replacements/valid flags |
| POST /commissions/{id}/recognize | expected_version; separate expected→recognized transition |
| POST /commissions/{id}/receipts | expected_version, amount_mad, received_on, reason, optional evidence_document_id |
| POST /commissions/{id}/correct | Discriminated commission terms or receipt replacement/void; expected_version and required reason |

Successful commands return id/version.24h retry receipts bind current actor,
route, key and complete body with HMAC. Same-key identical retry returns its
original result only after current authorization; changed-body reuse returns409.
VERSION_CONFLICT requires deliberate comparison/acceptance, not silent overwrite.
OVER_COLLECTION/COMMISSION_BELOW_COLLECTIONS reject without partial financial facts.
The UI retains drafts and retry identity after response loss or service failure.

## Immutable facts, balance and reopening

0018 adds commission (identity/current version), commission_revision (append-only
financial snapshots), receipt (append-only linked replacement or explicit void)
and finance_command_receipt (private24h replay result). There is no editable
balance column. Expected commissions have null recognized balance; recognized
balance = current recognized amount − sum of valid leaf receipts. Replacing a
receipt removes its original from that sum without deleting or changing it.
Void is an explicit null-amount replacement, retaining date/reason/actor/links.
Every correction preserves originals and requires a true actor and reason.

Agency/identity/commission locks and optimistic versions serialize commands;
transactional PostgreSQL guards validate the contiguous revision chain, linked
receipts, unchanged originals and nonnegative derived balance at commit. Audit,
revision, receipt and replay result commit together or all roll back. Raw SQL
updates/deletes of financial facts are refused. Nonempty/development downgrade
is refused; only verified isolated synthetic cleanup has its existing escape.

A receipt may optionally bind an unarchived deal/contact document whose current
version is clean. The exact version UUID is frozen. Unknown/unrelated/quarantined
proof is rejected; this neither serves bytes nor grants a transfer permit.

Deal reopening appends a financial review revision in the same transaction,
preserving recognized terms and all receipts, including when an authorized agent
reopens without finance access. Technical proposal: a reasoned commission
correction acknowledges review. The warning does not silently recalculate,
delete facts, reverse recognition or invent a new collection prohibition.

## UI and scope

The existing French deal detail adds Dossier/Finance tabs only for M/A. Standard
shadcn/Tailwind controls, inline forms, protected confirmation focus and numbered
history reuse the incumbent design. No chart, token, font, library or custom CSS.
No banking, payroll, official accounting, statement/export or automatic commission.
Human product/design review remains independent of scoped technical acceptance.
