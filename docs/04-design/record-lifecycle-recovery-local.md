# Selected prospect and affair lifecycle recovery

Date:2026-10-29. Branch:`codex/redesign`.
Status: source integration; actual-stack/native/product acceptance pending.
Extends [SP-19 discovery](discovery-contract.md),
[prospect recovery](prospect-edit-recovery-local.md),
[affair recovery](deal-action-recovery-local.md) and
[inventory lifecycle recovery](inventory-lifecycle-recovery-local.md).
Backend unchanged; this boundary retains the distinct prospect/affair rules.

## Existing authority, state and layout

The selected Actions menu and selected-row control retain the shadcn confirmation,
explicit archive/restore action, mandatory reason, explanatory 30-day copy and
Conserver la fiche cancellation. Existing tokens, glyphs, responsive rows/cards,
tabs, spacing and motion remain. Current-version comparison uses the same dialog
width and normal wrapping; no table, extra tab or new component kit is introduced.
Frontend Taste applies to truthful status, readable grouping and contained
responsive controls within this approved composition; no concept redesign or
browser inspection is claimed. Original-machine antislop/design-system-ops skills
remain unavailable; AFTER timing is unchanged.

Backend source in `backend/app/archive/records.py` remains authoritative. An agent
must be the prospect's assigned agent or the affair contact's primary agent;
these relationships are deliberately different. Managers/administrators retain
their existing scoped authority. A contact must be active. Restoration retains
the backend 30-day deadline. Affair archive retains reservation-release, active
visit and open task blockers. No release, cancellation, time-window override,
grant, history deletion or retention command is added. Client comparison does
not infer expiry from the browser clock or clear a linked blocker.

## One confirmation and verified completion

Each confirmation owns kind/ID, originating actor/role, opening operation,
counter, label and reason. Parent archive/counter updates cannot flip the open
operation. Strict expected_version/reason validation, an exact POST route and a
cloned body precede dispatch. Fresh unrestricted current identity and a current
scoped record check initial authority/state/counter. Changed readable authority
ends in a read-only comparison rather than falsely treating all readable records
as forbidden. An offered current version must be accepted explicitly; fabricated,
older or different-state acceptance cannot authorize a new attempt.

An ambiguous dispatched request retains its original operation/body/key and
awaited parent callback. A replay reaches the original receipt without first
requiring the obsolete pre-command version/state. Facades and controller require
the requested ID and a strictly newer receipt counter. After acknowledgement,
fresh identity and a strict matching current dossier at least as new as both
receipt and host precede the original handoff. At the exact receipt counter the
archive state must agree. A later inverse action can legitimately leave a newer
current record; it does not erase historical completion or trigger another POST.
A currently authorized canonical contact relationship is read from the current
dossier, not silently retargeted into another lifecycle mutation.

Completion read/callback failures retry completion only. An uncertain request
followed by a conflict remains uncertain: backend receipt pruning after24 hours
does not establish that the first operation never committed. New bodies/keys,
reason edits, duplicate submit, comparison and dismissal cannot replace unknown
work. No recovery data is persisted in browser storage. Ordinary cancellation
uses the existing draft guard; deferred discard and asynchronous results cannot
update a disposed owner. Current denial masks private form data and can retain
only a generic acknowledgement when already proven saved.

## Detail and selected-row host lifetimes

All four entry points supply their real role/actor context. Both directories hold
the selected page while its confirmation is open, locking row selection and
preserving the owner when a quiet result removes the archived row or fails
temporarily. Supplemental refresh and held-page release precede selection
clearing, which can immediately unmount the completed owner. Detail pages hold
the displayed action through transient reads and install the verified dossier
before releasing the confirmation. Closing resets the trigger's protection for
the next explicit confirmation. Prospect detail can display its verified
result beside a transient read error. The containing Actions popover is not
disabled by its own lifecycle protection, avoiding descendant unmount.

Current access denial always replaces the held view and clears its retained
projection. Retrying a denied read cannot briefly revive the private snapshot
while the authorized replacement is still loading. Actor/role/target/context
changes establish separate component lifetimes. Existing desktop/phone card,
table, tab and side-panel organization is preserved.

## Evidence and remaining boundary

890 frontend units pass,25 added for actual owner/dialog/contracts/facades and
all four hosts: strict input, both kinds/operations, current role/relationship,
receipt/current state, lost acknowledgement, callback/read failure, original
intent/key, explicit comparison, linked blockers, expired restore, sticky unknown
conflict, selected-page retention, current denial and disposal. Older host
harnesses now execute their scoped wrapper and real projection hook without
removing their existing assertions. Lint/types/build/history pass. Static
Frontend Taste app lint checks seven changed UI files with0 findings; this is
not rendered/device/focus/zoom acceptance.

Two cases in `frontend/tests/e2e/record-lifecycle-recovery.spec.ts` are prepared/
typechecked, not run: phone manager prospect archive with lost acknowledgement
and desktop manager affair restore with acknowledged completion-read outage.
They use fresh synthetic dossiers, disabled traces/video/screenshots, in-memory
body/key comparisons and detached actor cleanup. Backend unchanged/not rerun.
Actual SQL/concurrency/native/device/accessibility/visual/performance/CI/AFTER/
product acceptance remains pending, as do remaining exact domain reconciliation,
older native selectors and migrations0036/0037. Main and254 frozen inputs remain
unchanged. No actual app/browser/HTTP/DB/account/private configuration/worker/
service/scanner/simulator/import/export/transfer/retention access or workaround;
no push/merge/deploy. Full redesign goal remains active.
