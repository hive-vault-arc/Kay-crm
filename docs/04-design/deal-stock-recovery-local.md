# Selected reservation and outcome recovery

Date:2026-10-29. Branch:`codex/redesign`.
Status: source integration; actual-stack/native/product acceptance pending.
Extends the [ordinary affair action contract](deal-action-recovery-local.md).
Existing [API contracts](api-contracts.md), stock, reservation and outcome rules
remain authoritative; no backend mutation or grant changes.

## Dedicated review, shared request ownership

The selected header/Kanban stage menu still opens separate reservation/release
and close/reopen confirmations. Their selected facts, effects, warnings, amount,
date, explanation and reason remain. Release and reopening prerequisites still
require a second ordinary-stage confirmation; a menu choice never combines them
into an implicit stock or stage write. No mobile Kanban or new tabs are added.

Previously these panels owned another mutable fingerprint/key, repeated a
confirmed mutation after refresh failure, and read effects without a coherent
parent/version check. The shared affair owner now accepts four additional strict
intents: reserve, release-reservation, close and reopen. Full parsed stock IDs,
versions, fingerprint, exact amount/date/outcome/reason and key remain frozen
after unknown dispatch. Current originating account/role proof, receipt identity/
kind/newer affair version, current result and disposal/denial checks are shared.
An acknowledged result retries completion only. The originating async UI callback
is awaited; a failed parent handoff cannot silently lose recovery or repeat POST.

## Coherent current facts

An opening action retains its original reserve/release or close/reopen direction.
Before confirmation, the current affair must match the requested ID and be at
least as new as the opening review. Outcome review brackets the stock endpoint
between two scoped affair reads. Parent version and offering projection must
agree; stock offering/target/development versions must match that projection.
A missing physical target or foreign/stale/changing response cannot authorize a
new save. Backend source confirms the stock endpoint uses the same affair
offering projection; this source inspection is not runtime/SQL acceptance.

The current unrestricted account/role proof precedes that review. Only the owner’s
offered snapshot is accepted. A known conflict retains input and requires the
explicit availability/effects refresh before reconfirmation. A changed offering,
physical target, active reservation, canonical contact, archive or incompatible
action direction ends the opening action read-only. It does not silently become
another reserve/release/close/reopen. The user returns to the actual current fiche.

Unknown work blocks fields, refresh, Return, Escape and replacement actions,
including stale callbacks and synchronous double submit. The original retry
remains available even if newer parent props arrive. Verified current results
are passed into the existing prerequisite queue without another unowned reload;
the next ordinary confirmation remains separate. Exact MAD strings, annual/monthly
context, null stock fields for unlinked lost/cancelled outcomes, original outcome
history and optional finance remain unchanged.

## Verification boundary

762 frontend units pass,11 added actual stock reader/owner/dialog cases. They
cover all four commands, lost acknowledgement and completion-only retry, async
handoff failure, version/fingerprint preservation, exact decimal amounts,
coherent/foreign/stale/changing stock reads, explicit conflicts, changed targets/
contact/reservation/direction, null inventory, role denial and disposal. Existing
751 cases still pass. Lint/types/build/history and static Frontend Taste app lint3
pass,0 findings. Selected grouping/truthful states were applied; no new concept,
unselected AFTER fix or unavailable skill execution is claimed.

Reservation/outcome browser helpers now enter through the selected stage menu.
Two isolated cases in `frontend/tests/e2e/deal-stock-recovery.spec.ts` are prepared/
typechecked, not run: phone reservation lost acknowledgement and desktop closure
acknowledged result-read failure. They disable traces/video/screenshots and keep
body/key checks transient with detached synthetic actor cleanup. Broader old
selectors, actual SQL/concurrent stock/native/focus/zoom/device/visual/performance/
CI/AFTER/product acceptance remain pending. Backend unchanged/not rerun.

No actual app/browser/HTTP/DB/account/private config/service/worker/scanner/
simulator/import/export/transfer access or workaround. Migrations0036/0037 remain
unapplied; main and all254 frozen inputs remain unchanged. No push/merge/deploy.
The full migration goal remains active for remaining exact fields/actions/context,
legacy browser migration and the later required acceptance stage.


Subsequent source integration,2026-10-29: manager external inventory results now
have their own [request/record recovery contract](external-stock-recovery-local.md).
This extends source coverage without claiming actual concurrent stock acceptance.
