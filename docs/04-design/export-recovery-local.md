# Selected CSV export request recovery

Date:2026-10-28. Branch:`codex/redesign`.
Status: source integration; actual stack/native/product review pending.
[SP-19 contract](discovery-contract.md) remains authoritative.

## Selected surface and concrete gaps

Frozen `src/data-operations.js` and the selected directories provide filtered
CSV export and Mes exports with Date/Contenu/État/Fichier. The real interface
keeps the existing scoped filter review, explicit acknowledgement, selected
drawer spacing/actions, desktop columns and compact phone/drawer cards. It adds
no scope, columns, external destination, download shortcut or illustrative data.

An interrupted request previously allowed dismissal and replacement with another
filter/key. The parent directory could also unmount its export owner on a list
loading/error transition, discarding recovery. The contextual list does not
actually render duplicate export controls: the earlier toolbar expression is not
mounted in that branch. Inspection of the returned tree established one owner;
no nonexistent duplicate was removed.

## Request, account and projection ownership

The export owner now stays mounted in Contacts, Prospects, contextual prospect
lists and the Contact overview while their read is loading or failing. Current
unavailable reads disable new requests without inventing a zero-count scope.
A retained review remains the opening snapshot, separate from a current count.
Transient parent failures do not replace an unresolved operation. Agents still
have no export action. A current authority denial immediately masks and clears
the private review, aborts transport and refuses stale handlers/reopening in that
lifetime. Transport cancellation is an effect; rendering owns denied projection
state, without a set-state-in-effect suppression.

Creation first refreshes the current identity/CSRF under the same AbortSignal.
Only an unrestricted manager/administrator can dispatch. The first accepted
identity binds retry to that actor; a different signed-in account cannot replay
the former account's operation. Backend role/actor/session/Origin/CSRF and scope
remain authoritative.

Before dispatch, a failed identity read permits correction. Once a sent response
is unknown, the original reviewed kind/filters, key and actor binding remain
pinned. Dismissal, Escape, outside interaction, checkbox edits, history navigation
and replacement requests are blocked. The explicit same-request retry remains
available. A failed retry preflight does not erase an earlier unknown result.
After acknowledgement, recovery completes the saved job response without another
create call. A known ordinary rejection releases an unacknowledged attempt;
authority loss masks it. Disposal aborts its read/write and ignores late results.

The facade additionally rejects create replies for another kind, detail replies
for another export UUID and permits bound to another export, alongside the
existing exact private transfer URL checks. These become a safe503 without a
partial result. The command also checks the acknowledged kind. No backend job,
worker, CSV escaping/content, receipt, filter, transfer or retention rule changes.

## Verification boundary

598 frontend units pass, including13 added real hook/transport/facade/host/UI
cases. They cover preflight versus dispatch, exact retry after changed props,
acknowledged completion, foreign kind/ID, same-actor proof, denial, disposal,
parent loading/failure, modal/navigation locks and one persistent contextual
owner. Existing Contact denial expectations now check the retained disabled
owner and its authority error, rather than incorrectly requiring its disposal.
The existing unit file remains registered in the real frontend runner.

Two cases in `frontend/tests/e2e/export-recovery.spec.ts` are prepared/typechecked,
not run. Each uses an isolated synthetic actor and the current menu/checkbox/
drawer labels, commits one real job then drops its response, confirms blocked
dismissal and checks same key/body/job plus a single own-history result after
retry. No worker or CSV byte download is started by those cases. Traces, video
and screenshots are disabled; request comparisons use safe booleans and cleanup
detaches the actor context. Older broad discovery helpers/selectors still need
separate reconciliation and actual native verification.

No actual app/browser/HTTP/DB/account/config access or workaround, backend test
rerun, migration, service/worker/transfer, native/SQL/CI/AFTER/product acceptance
or main promotion is claimed. See the
[coverage map](../03-planning/design-migration-coverage-2026-10-28.md).
