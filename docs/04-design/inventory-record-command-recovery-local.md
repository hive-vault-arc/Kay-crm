# Selected inventory record-form recovery

Date:2026-10-29. Branch:`codex/redesign`.
Status: source integration; actual-stack/native/product acceptance pending.
Extends [external-result host retention](external-stock-recovery-local.md),
[inventory forms](inventory-forms-local.md) and the existing inventory API.
No backend mutation, permission, stock or owner-link policy changes.

## Selected homes and fields

Legal owners, offering creation/edit, availability confirmation, blocks, floors
and reusable unit types retain their selected drawers, comparison views, fields,
actions and spacing. Documents/Modifier remain in the project header; offering
actions stay with their section. Selected glyphs, tokens, compact phone cards,
tabs and motion are unchanged. Exact MAD strings, nullable unknown prices,
rent periods, conditions, shared reasons, owner visibility and hierarchy defaults
remain. Managers/administrators edit owners and commercial offerings; agents
retain the existing permitted structure-fact commands.

These three form families now use a scoped record-command owner instead of the
older generic fingerprint handler. The originating property/development,
account/role, command kind, selected offering/campaign or structure parent/item
are bound to the opening lifetime. Current unrestricted identity and matching
record context are required before dispatch, retry, comparison and completion.
Source unavailability blocks new work while original uncertain recovery remains.
Disposal or scope replacement aborts late work and releases owned busy state.

## Existing routes and strict intent

The original strict request schema must match its selected path and method:

- Owners: PUT to the exact property/development owners route.
- Offering creation: POST to offerings, with the exact selected parent and
  campaign, matching parent-version field, and no foreign parent/version.
- Offering edit: PATCH to the selected offering, with its own version and the
  matching parent-version field. The two counters are not interchangeable.
- Availability: POST to the exact parent's confirmation route with the selected
  offering and its version.
- Structure: POST under the selected development/block, or PATCH to the exact
  existing block/floor/type, using the development counter. Reusable types retain
  their explicit development ID and their existing field schema.

Indirect offering-edit and floor routes retain the existing backend contract;
the UI's current models validate membership and the command owner binds their
opening host. No invented parent field or new authorization claim is added.

## Unknown outcomes, conflict review and verified completion

The parsed original body, method, path, key and awaited original UI callback
remain frozen after an unknown result. Changed input handlers cannot replace
them. Inputs, choices, cancellation, Return, Escape and comparison refresh are
protected synchronously while work is pending or uncertain. Retry sends only
that original request. An unchanged completed operation cannot rearm.

A receipt must identify the exact property/development, required offering or
null offering, event and newer parent version. Edited offering counters must
advance when that offering is still in the current projection. A later retired
offering does not erase a historical acknowledgement. After receipt, current
identity and a strict current parent read at least as new as receipt/known
version precede awaited UI completion. Failed reads or async parent callbacks
retry completion only, without PUT/PATCH/POST.

Known conflicts preserve the draft and require explicit acceptance of the exact
offered current comparison object. Stale, foreign, aborted or unoffered values
cannot authorize another save; old counters cannot bypass this gate. The
existing owner/offering/hierarchy comparison views decide whether the selected
current object is compatible. Current denial masks private work and retains
only a generic saved fact when acknowledgement already exists.

Verified current records flow through offering/hierarchy drawer callbacks into
the actual property/programme host before closing. Hosts install parsed matching
records monotonically while busy, then perform supplementary refresh. Background
responses cannot replace an opening offering during uncertain work. No browser
storage, new receipt retention, data grant or backend effect is introduced.

## Evidence and remaining boundary

804 frontend units pass,22 added actual intent/controller/form/host/handoff
cases. Cases cover the distinct routes, both parent roots, exact values/nulls,
original request/key/callback, one synthetic commit, completion-only recovery,
foreign/stale receipts/current records, explicit conflict acceptance, hydration,
source outage, roles, denial, stale input/dismissal, disposal and monotonic host
handoff. Existing field tests now supply coherent full receipts/current records.
Synthetic persistence is a fixture, not SQL evidence. Lint/types/build/history
and static Frontend Taste app lint8 pass with zero findings. System-first selected
components and truthful recovery states were applied; no new concept, unselected
AFTER fix or unavailable skill execution is claimed.

Three cases in `frontend/tests/e2e/inventory-record-recovery.spec.ts` are prepared
and typechecked, not run: phone owner lost acknowledgement, desktop edited-offer
result-read outage, and phone agent block lost acknowledgement. They retain
isolated synthetic actors, transient body/key checks, disabled traces/video/
screenshots and detached cleanup.

Development creation, development editing and the property listing wizard still
use the older generic command owner and remain separate source work. Remaining
exact domain field/action/context reconciliation and older native selectors are
also open. Backend unchanged/not rerun. Actual SQL/concurrent stock/native/device/
focus/zoom/visual/performance/CI/AFTER/product acceptance is pending.

No actual app/browser/HTTP/DB/account/private configuration/service/worker/
scanner/simulator/import/export/transfer access or workaround. Migrations0036/
0037 remain unapplied; main and all254 frozen inputs remain unchanged. No push,
merge or deployment. Full redesign goal remains active.


## Subsequent programme editor checkpoint,2026-10-29

[Programme editor recovery](development-edit-recovery-local.md) adds the strict
development-facts PATCH and its scoped edit host. All scoped forms also reject an
offered comparison that becomes older than a newly received parent version before
acceptance. The earlier remaining list records its original checkpoint boundary;
development creation and property listing still require generic-owner recovery.
