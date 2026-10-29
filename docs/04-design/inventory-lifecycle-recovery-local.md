# Selected inventory archive and restore recovery

Date:2026-10-29. Branch:`codex/redesign`.
Status: source integration; actual-stack/native/product acceptance pending.
Extends [SP-19 lifecycle](discovery-contract.md),
[scoped record commands](inventory-record-command-recovery-local.md) and
[listing recovery](property-listing-recovery-local.md). Backend unchanged.

## Existing action and conservative stock rules

The existing Gérer le dossier drawer retains its active/archived state, explanatory
copy, explicit archive/restore confirmation and mandatory reason. The panel uses
the available drawer width and existing record components for current review;
no table, new tab, destructive delete control, token, glyph style or motion is
introduced. Source lifecycle operations retain all IDs, owners, files, history,
true actors and finance links. No retention CLI is invoked.

The existing manager/administrator boundary is checked again by current
unrestricted identity before dispatch, original retry, comparison and completion.
Agents remain excluded. Backend source retains its version/agency locks and
stock guards: any current campaign blocks physical archiving; any physical child
or current whole campaign blocks programme archiving. The inspected unit_count
query counts all physical children, including archived children. Restoration
does not revive campaigns, release stock or infer a Q-06 override. These are
source observations, not SQL/concurrency verification.

## Scoped confirmation lifetime and verified completion

Each explicit confirmation owns the opening root/ID, operation, reference and
counter. Parent archived/version changes cannot switch the open action to its
opposite or remount away its reason. The strict existing reason/version body,
exact POST path, original key and awaited parent callback remain owned after an
unknown result. Reason changes, stale outer toggle/Cancel, Escape/navigation and
comparison refresh are protected synchronously; controls also show their disabled
state. The existing dirty guard handles ordinary cancellation. Deferred discard
callbacks cannot change state or refresh after disposal.

Receipts require exact property/development kind/ID, no offering, event and a
newer counter. The facade checks the same root/version/null-offering boundary.
Current identity and a strict matching current record at least as new as the
receipt/known counter precede awaited parent handoff. At the receipt version,
archive/restore state must match that operation; later inverse operations do not
erase historical acknowledgement. Invalid receipts recover only the original
request/key. Acknowledged read or partially completed async parent failure retries
completion without another POST, even if parent props already show the new state.

Actual property/programme saved callbacks install the verified record before
supplementary refresh and closing confirmation. The reason baseline clears only
after successful completion; the next operation requires a new explicit opening.
Source unavailability blocks new work while original uncertain recovery remains.
Current denial masks the form and retains only a generic saved fact when a receipt
already exists. Disposal/scope loss aborts late work and releases owned busy state.

## Explicit current review

Known conflicts preserve the reason and require a current comparison. It shows
the actual reference/state, current campaign count and programme child count.
Only the exact offered current object, at least as new as the latest known host,
can authorize the same operation. Foreign roots, changed archive state or blocked
stock cannot authorize confirmation. The original operation never retargets.
Stock-blocked/already-changed cases remain read-only, with an explicit guarded
Actualiser la fiche action. That action performs ordinary refresh after discard;
it does not invoke the saved callback or report a mutation that did not occur.

The last useInventoryCommand consumer is migrated and the old fingerprint writer
is removed. Its module retains the shared InventoryBusyContext used by scoped
controllers. Repository-wide source/test search finds zero legacy references.
No backend endpoint, grant, storage, retention, default record or financial effect
is added.

## Evidence boundary

865 frontend units pass,17 added actual intent/review/controller/panel/host/facade
cases. Coverage includes both roots and both operations, M/A versus agent/current
authority, strict body/path/counter, frozen reason/key/action, stale outer controls,
one synthetic commit, completion-only read/async parent recovery, exact/current
state versus historical completion, explicit conflict acceptance, all-child/current
campaign block, no action flip, validation/hydration/source guards, generic saved
denial, double dispatch, late discard/result disposal, verified host installation
and facade target/version/offering rejection. Existing fixture persistence models
the archive flag rather than supplying an unrelated receipt/current pair.
Lint/types/build/history and static Frontend Taste app lint3 pass,0 findings.
Selected components/truthful states were applied; no new concept, unselected AFTER
fix or unavailable skill execution is claimed.

Two cases in `frontend/tests/e2e/inventory-lifecycle-recovery.spec.ts` are prepared/
typechecked, not run: phone manager property archive lost acknowledgement and
desktop manager programme restore acknowledged result-read outage. They use
fresh eligible synthetic records, disabled traces/video/screenshots, transient
body/key checks and detached actor cleanup. Backend unchanged/not rerun;
synthetic persistence is not actual archive/SQL/retention acceptance.

Separate enquiry/deal archive controls in
`frontend/src/features/discovery/record-lifecycle-action.tsx`, remaining exact
domain field/action/context reconciliation and older native selectors remain
source work. Actual SQL/concurrent stock/native/device/focus/zoom/visual/performance/
CI/AFTER/product acceptance is pending. No actual app/browser/HTTP/DB/account/private
configuration/service/worker/scanner/simulator/import/export/transfer access or
workaround. Migrations0036/0037 remain unapplied; main and254 frozen inputs are
unchanged. No push/merge/deploy. Full redesign goal remains active.
