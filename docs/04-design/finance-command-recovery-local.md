# Selected Finance command ownership and completion

Date:2026-10-29. Branch:`codex/redesign`.
Status: source integration; actual ledger/native/product acceptance pending.
Extends [selected Finance workspace](finance-workspace-local.md),
[commissions](commissions-local.md), [affair recovery](deal-action-recovery-local.md)
and the [migration](../03-planning/design-prototype-migration-2026-10-25.md).
Backend unchanged. No optional module, financial fact or new authority is added.

## Exact existing field/action map

| Existing action and selected form | Strict request and preserved context | Current completion proof |
| --- | --- | --- |
| Prévoir une commission, TermsForm | Exact Deal ID; expected_deal_version; fixed/percentage kind; explicit base_mad; nullable rate_percent/amount_mad; nullable due_on | New commission version1; requested dossier; immutable original creator; created/expected revision and exact terms |
| Corriger la commission, TermsForm and confirmation | Exact commission ID; target=commission; expected_version; same explicit terms and required correction reason | Newer same-commission counter; commission_corrected revision, true actor, exact terms/due date/reason; original state/history remain server-owned |
| Reconnaître la commission, separate confirmation | Exact commission ID and expected_version only | Newer same-commission counter; recognized state/action and true actor; no receipt |
| Ajouter un encaissement, ReceiptForm and confirmation | Exact commission ID; expected_version; amount_mad; received_on; optional evidence_document_id; required reason | Newer same-commission counter; recognized receipt revision, true actor, retained receipt link and reason |
| Corriger/annuler un encaissement, ReceiptForm and confirmation | Exact commission ID; target=receipt; expected_version; original receipt_id; nullable replacement with exact amount/date/evidence/reason; separate correction reason | Newer same-commission counter; recognized receipt_corrected revision, true actor, retained receipt link and correction reason; originals are never deleted |

Only the existing exact POST route for each typed intent is accepted. Foreign
roots/IDs, extra fields, a mismatched expected counter and another command kind
cannot enter the owner. Decimal strings, optional/null values, original receipt
and document identity remain in a cloned request. Existing MAD half-up arithmetic
and eight-decimal base/rate/two-decimal final amount rules are unchanged. Current
terms compare canonical decimal strings without Number/float conversion; padded
server decimal serialization does not change equality or the original body.

## Identity, receipt and current revision

The actual affair workspace supplies its originating actor/role to the Finance
drawer and all three editors. Dossier/actor/role changes establish a new drawer
lifetime. The owner also binds first current identity when a caller has no
explicit origin. Fresh unrestricted same-origin M/A identity is required before
first/retry dispatch, comparison and acknowledged completion. Strict-mode effect
replay restores the origin binding; an Agent or changed actor/role cannot adopt
an earlier private financial draft. Backend M/A/agency/contact/Deal authority
and locks remain authoritative.

Creation's receipt counter is1, independently of the Deal counter used to create
it. Every existing-commission operation requires its exact ID and the next
commission counter, expected_version+1, matching the inspected single appended
revision in backend apply(). A skipped counter is not a receipt for this command.
The finance facade applies the same distinction before
returning success. A strict current commission must match receipt ID, dossier,
head/current counter and minimum receipt/host version before handoff. New
commission provenance keeps the originating creator even on historical replay.
At the exact receipt counter, action/actor/state/terms/reason/receipt context are
checked as applicable. A newer authorized revision can represent later
correction/reopening; it does not erase historical completion or authorize a
second write.

## One confirmed operation, explicit conflict and draft lifetime

An ambiguous dispatched operation owns its original typed body, route, key and
awaited completion callback. Reason/amount/document/receipt replacement cannot
silently substitute another attempt. A known receipt followed by current-read
or callback failure retries proof/read/completion only. The original callback
survives parent rerenders. Completed owners refuse stale submits and cannot
create a second confirmation/fact. Form baselines are accepted after successful
parent completion; failed completion leaves the draft managed and dirty.

A definite non-denial conflict requires explicit current comparison and exact
offered-version
acceptance before a fresh key. Arbitrary, cloned, older or blocked comparisons
cannot rebase the draft. Existing recognition-state and original-receipt checks
remain, including bounded selected-page verification and the need to reselect
a moved/replaced receipt. No receipt-by-ID endpoint or unbounded scan is added.

An unknown dispatch followed by409 remains unknown. Backend source prunes retry
receipts after24 hours, so the later conflict cannot prove that the first
financial fact never committed. New writes remain protected; recovery does not
override current backend archive/authority refusals. No browser storage is used.

The selected explicit recovery-departure warning remains: Annuler/navigation
can request Quitter le formulaire after an interrupted outcome. It warns that
the operation may already be recorded and never claims rollback. Pending network
commands still block premature dismissal. Ordinary dirty cancellation retains
Quitter sans enregistrer. This checkpoint does not replace that established UX
with an unconditional recovery-navigation ban.

Current denial removes local private fields and the entire financial controller.
An already acknowledged operation may show only a generic saved fact. Retry
starts fresh private queries; old selections, amounts and drafts do not revive.
Create completion refreshes before closing, and existing commission completion
retains its verified parent read. Disposal aborts work and suppresses late state,
baseline, navigation and completion updates.

## Selected composition and evidence boundary

The M/A supporting Finance drawer, four affair tabs, tonal full-width commission
cards, inline original receipts/history, focused forms, labels, confirmations,
footer, decimal/date/evidence fields, paging and return focus remain selected.
No new token, glyph, theme, motion, tab, table, library or inferred financial
fact is introduced. Frontend Taste applies to truthful states and existing
responsive form grouping; no concept redraw or browser inspection is claimed.
Original-machine antislop/design-system-ops skills remain unavailable; AFTER
timing is unchanged.

915 frontend units pass,25 added across actual typed intents, owner, facade,
affair/drawer identity wiring and all three real editors. Existing Finance cases
now use the actual owner with dispatch/current-read semantics; original field,
calculation, correction, receipt, history, scope and departure checks remain.
Lint/types/build/history pass. Static Frontend Taste app lint checks six changed
UI files with0 findings; this is not rendered/device/focus/zoom acceptance.

Two isolated cases in `frontend/tests/e2e/finance-command-recovery.spec.ts` are
prepared/typechecked, not run: phone manager new commission lost acknowledgement
and desktop manager receipt acknowledged completion-read outage. They use fresh
synthetic accounts/dossiers, exact in-memory body/key comparisons, disabled
traces/video/screenshots and detached actor cleanup. They retain the explicit
recovery-departure prompt and test returning to the same operation.

Backend unchanged/not rerun; actual SQL/ledger/concurrency/native/device/
accessibility/visual/performance/security/CI/AFTER/product acceptance, remaining
exact domain reconciliation and legacy native selectors are pending. No actual
app/browser/HTTP/DB/account/private config/service/worker/scanner/simulator/import/
export/transfer access or workaround, migration, main/push/merge/deploy. Main and
254 frozen inputs remain unchanged; migrations0036/0037 remain unapplied. Full
redesign goal stays active.


## Required creation-replay follow-through

Source review identified a separate unresolved boundary in backend finance
commands: retry receipts are pruned after24 hours, while creating a commission
checks but does not advance its Deal version. If that parent counter remains
unchanged, replay after receipt deletion can reach another NewCommission apply
instead of a version conflict. This is a source-derived duplicate-fact risk, not
an actual ledger reproduction. Current synthetic immediate-retry cases do not
prove safety after retention expiry. Durable or otherwise authoritative safe
creation replay must be reconciled before branch readiness. No financial
retention/API/schema policy is silently changed by this frontend checkpoint.
