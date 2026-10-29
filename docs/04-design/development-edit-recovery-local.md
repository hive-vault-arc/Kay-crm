# Selected programme editor recovery

Date:2026-10-29. Branch:`codex/redesign`.
Status: source integration; actual-stack/native/product acceptance pending.
Extends [scoped record forms](inventory-record-command-recovery-local.md) and
[programme phase](development-phase-local.md). Backend unchanged.

## Existing form and authority

The selected programme identity, optional phase, category, location, shared
presentation, optional promoter/contact and public promoter label remain in their
existing form and adjacent draft summary. Tokens, glyphs, spacing and motion are
unchanged. Only recovery/comparison states use the existing record components.
Programme creation remains its own wizard.

The editor now receives the same originating record/account/role and busy owner
as the programme fiche. Transient source failure retains the mounted draft;
unavailable source blocks new edits while unknown recovery remains available.
Current denial masks private work. The record host freezes the opening record
while busy, including uncertain results, and accepts verified results monotonically.

The new development-facts intent permits only PATCH to the exact programme ID,
the strict edit schema and its expected programme counter. All three existing
staff roles retain shared-fact editing. Backend source still authorizes changed
promoter links against scoped Contacts, checks the version/archive/marketability
rules and remains authoritative. This is source inspection, not backend runtime
verification. No commercial/owner privilege is granted to agents.

## Draft, conflict and completion

Unknown results freeze the original body, key, callback, phase and promoter-link
intent. Synchronous guards protect fields, contact selection/removal and Cancel;
the Cancel link also declares its disabled state and leaves the tab order. The
existing draft guard protects navigation. Retry sends only the original PATCH;
an acknowledged current-read or navigation-callback failure retries completion
without another mutation. Exact receipt/current programme and current identity
precede navigation to that same programme. A completed operation cannot rearm.

Known conflicts preserve input and require an explicit current comparison.
The comparison includes programme facts, shared presentation, phase capability,
public promoter label and only the currently authorized contact projection.
Keeping input explicitly accepts that exact offered snapshot; reloading requires
the draft-discard guard. Foreign, stale, aborted or archived current records cannot
authorize another save. Across all scoped record forms, a comparison that becomes
older than a newly received parent version is rejected at acceptance as well.

Normalized draft baselines trim equivalent text and omit unsupported phase from
dirty comparison. Empty supported phase remains explicit null; legacy phase is
omitted. Unchanged promoter identity is omitted, preserving hidden associations.
An explicit removal sends null; an explicit choice sends its ID. Private names
are never copied into the shared label, and a newly hidden current promoter name
disappears from the editor. Only explicit reload or verified completion clears
the draft baseline. Selected form fields are not reset by background refresh.

## Evidence boundary

815 frontend units pass,11 added actual intent/controller/form/host cases.
Coverage includes agent/manager/administrator, exact paths/counters, unknown
phase and omission/null/link distinctions, frozen request/key/callback,
completion-only reads/navigation, explicit current/reload selection, newer
parent acceptance race, foreign/stale/archived review, validation, hydration,
source outage, current privacy masking, denial and disposal. Older workspace
assertions now locate the editor within its scoped provider rather than assuming
an unowned root. Lint/types/build/history and static Frontend Taste app lint2
pass,0 findings. Existing selected components and truthful states were applied;
no new concept, unselected AFTER fix or unavailable skill execution is claimed.

Two cases in `frontend/tests/e2e/development-edit-recovery.spec.ts` are prepared/
typechecked, not run: phone agent lost acknowledgement and desktop agent current
result-read outage. Isolated synthetic actors, transient body/key comparisons,
disabled traces/video/screenshots and detached cleanup remain.

Development creation and property listing still use the generic command owner;
remaining exact domain fields/actions/contexts and old native selectors are open.
Actual SQL/concurrent stock/native/device/focus/zoom/visual/performance/CI/AFTER/
product acceptance is pending. No actual app/browser/HTTP/DB/account/private
configuration/service/worker/scanner/simulator/import/export/transfer access or
workaround. Migrations0036/0037 remain unapplied; main and254 frozen inputs are
unchanged. No push/merge/deploy. Full redesign goal remains active.


## Subsequent creation checkpoint,2026-10-29

[Programme creation recovery](development-creation-recovery-local.md) replaces its
older generic handler while retaining the separate selected wizard. The earlier
remaining list records this checkpoint's original boundary; the property listing
wizard still requires generic-owner recovery.
