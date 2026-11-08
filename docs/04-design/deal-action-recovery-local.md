# Selected affair actions and recovery

Date:2026-10-29. Branch:`codex/redesign`.
Status: source integration; actual-stack/native/product review pending.
Complements the [full-form contract](deal-form-recovery-local.md) and existing
[API contracts](api-contracts.md). No backend rule or permission is changed.

## Selected action homes

The selected four-tab affair workspace, header stage menu and Modifier/Actions,
desktop Kanban, per-value editing and Projects-tab client proposals stay in place.
No mobile Kanban, duplicate proposal panel or new page composition is introduced.
The same owner now serves ordinary transitions, the nine inline qualification
fields and create/edit client proposals. Reservation/release and outcome/reopen
retain their separate controllers and still require their own reconciliation.

Inline fields remain budget, rating, campaign/source, purchase reasons, financing,
room count, projects, notes and next action. Zero is preserved. Legacy missing
budget/reasons/projects can still be completed as required companions. An unknown
legacy financing value is visible and must be explicitly replaced or cleared;
it is not silently normalized. Proposal amounts and original month/year periods
remain exact strings, with both proposal and affair versions for an edit.

## Request ownership and result proof

The former fingerprint logic could replace an interrupted operation after input
changed and could repeat a confirmed write after its refresh failed. Parsed intent
now pins the originating parent, exact allowlisted route/method/body, versions,
key and private completion callback. Atomic contact editing stays with the full
form owner. Proposal edits additionally bind the exact proposal ID and parent.
Mutation facade responses and record reads must match their requested identity.

Current unrestricted authentication must match the originating account and role
before first dispatch, original-request retry and completion read. The detail
lifetime and board action are keyed to that scope; the real directory forwards
its account/role. No role grant is inferred from visibility. Disposal aborts late
work; denial removes private state and retains only a generic acknowledgement
when a receipt was already validated. No persistent browser storage is added.

Unknown requests cannot be replaced by changed input, another field, a proposal
or stage choice. Retry reuses the original body/key. A receipt must identify the
same affair and advance its submitted version; proposal results must have a
proposal ID/version, and edits must match and advance the submitted proposal.
Other command kinds cannot accept proposal receipts. After acknowledgement,
same-actor/role proof and a current scoped affair read at least as new as both
the receipt and known version precede UI completion. A failed read or parent
completion retries that completion only, without another POST/PATCH.

## Conflict, host and dismissal behavior

Known version conflicts retain input and require explicit current inspection and
acceptance. Only that owner’s offered snapshot can be accepted; foreign, copied
or stale values cannot reset its proof. Ordinary transitions keep the intended
destination/reason, recomputing the existing reserve/reopen prerequisite chain
from current state. No stock or outcome write is inferred from that selection.

Inline comparison can load the selected field or retain its draft on the current
version. Unrelated fields and valid context come from the current affair. Legacy
required companion drafts remain only while both reviewed/current values still
need them. Canonical/archived/closed current states finish read-only. Proposals
retain explicit comparison of both versions and their exact original values.

Unknown saves protect input, new actions, Cancel and Escape synchronously. Local
retry and detail-level recovery share the original completion callback, so a
confirmed result closes the originating editor/dialog once. A source refresh
outage retains the last authorized detail/metadata and draft; current authority
denial still masks it. Disabled header Actions closes an already-open popover.
The separate full editor continues to hand off its verified result directly.

## Evidence boundary

751 frontend units pass,24 added:15 command/intent/facade cases,8 selected action
UI cases and1 proposal protection case. Existing Kanban/proposal/full-form cases
now supply coherent identity/receipts and assert completion-only refresh. New
coverage includes all nine fields, exact values, legacy financing, frozen retries,
scope/disposal, result identity/version, current comparison, stale callbacks,
dismissal, board account/role handoff and once-only originating UI completion.
Lint/types/build/history and static Frontend Taste app lint11 pass,0 findings.

Two cases in `frontend/tests/e2e/deal-action-recovery.spec.ts` are prepared and
typechecked, not run: phone ordinary-stage lost acknowledgement and desktop inline
acknowledged result-read outage. They use isolated synthetic actors, safe transient
body/key comparisons, disabled trace/video/screenshots and detached cleanup.
Actual SQL/native/device/focus/zoom/visual/performance/CI/AFTER/product acceptance
remains pending. Taste was applied to truthful states and selected components;
no new concept, unselected AFTER fix or unavailable skill execution is claimed.

Backend unchanged/not rerun. No actual app/browser/HTTP/DB/account/private config/
service/worker/scanner/simulator/import/export/transfer access or workaround.
Migrations0036/0037 remain unapplied. Main and all254 frozen inputs are unchanged;
no push/merge/deploy. Dedicated stock/outcome commands, remaining field/context
reconciliation and broader legacy browser selectors continue. Full goal active.


Subsequent source integration,2026-10-29: the dedicated stock confirmations now
extend the same request owner; see the [stock follow-through](deal-stock-recovery-local.md).
Their later source evidence does not imply actual SQL/native stock acceptance.
