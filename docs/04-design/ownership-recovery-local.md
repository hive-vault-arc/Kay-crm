# Selected contact management recovery

Date:2026-10-28. Branch:`codex/redesign`.
Status: source integration; actual stack/native/product review pending.
The [SP-06 contract](../03-planning/sprints/06-ownership-contact-history.md)
continues to own permissions, merge policy, history and lifecycle behavior.

## Selected surface and confirmed gaps

Contacts retain Aperçu/Activités, inline coordinates, responsibility and linked
dossiers below responsibility. Owners retain Aperçu/Activités and one compact
right-side Patrimoine area, as selected in the frozen contact/owner references.
Management remains contextual to responsibility; no rejected Dossiers tab,
duplicate portfolio, drawer table, new page or replacement visual system.

The real management form preserves transfer with optional previous-agent
retention, collaborator add/remove, archive, restore and explicitly chosen merge
survivor, reason, version refresh and the reviewed impact dialog. Previously a
lost response could discard that review and generate a replacement key; a saved
operation could also be repeated when its completion read failed. Impact headings
incorrectly labelled source/survivor by array position. These are corrected within
the existing shared form and selected component spacing.

## Command lifetime and response coherence

One synchronous owner binds source contact and role. Its lifetime survives a
background version update; it is not keyed by contact version. Explicit refresh
updates versions without erasing the editable reason. A canonical alias read
never silently retargets a reviewed mutation: it instead offers an explicit link
to the kept contact. Ordinary canonical GET reads remain supported.

Each preview and confirmation obtains current identity/CSRF proof, requires the
same role and actor, and refuses required password change. Agents retain only
their existing merge action; backend current scope and role checks remain
authoritative. The preview is bound to exact source/survivor IDs and versions,
contact cardinality and resulting primary agent. Response ordering is immaterial;
headings follow IDs. Confirmed receipts must match the reviewed target/operation.
Malformed or foreign replies fail closed without projecting unrelated records.

After an unknown dispatched response, original intent, versions, proof and key
remain pinned. Field edits, replacement previews, refresh, cancel and Escape are
locked; only the original retry can dispatch. A failed identity preflight does
not turn an earlier unknown outcome into a new operation. A known conflict or
validation rejection requires a new review. After acknowledgement, a failed
completion retries only the saved result/read, with no second mutation.

Current denial clears private review, aborts transport and masks Contact/Owner
details, preserving only a generic acknowledgement notice if this operation is
known saved. Disposal aborts reads/writes and rejects late/stale callbacks.
Parent completion reads receive that same lifetime signal before updating data
or closing the drawer. Draft values exclude preview proof/response content; no
browser storage or logging is introduced.

No backend, endpoint, database or receipt-policy change is made. Existing
ordinary24-hour receipt retention, exact mutation target, alias rejection,
linked-module merge policy, immutable true-actor history, locks and permissions
remain. This is not permanent replay or full-product acceptance.

## Verification boundary

639 frontend units pass, including18 added actual hook/transport/facade/dialog/
parent cases. Existing preview/commit/follow-up/refresh denial coverage is retained
with strict real fixtures. The new suite is registered in the real runner.
Lint/typecheck/build/history pass. The initial React immutability diagnostic was
corrected by replacing attempt snapshots without suppression; explicit receipt
presence also satisfies TypeScript. Frontend Taste applies to selected grouping,
spacing and truthful recovery states; static app lint covers4 UI sources with0
findings. No new concept, palette, layout or audit-only AFTER fix is selected.
Unavailable original-machine antislop/design-system-ops execution is not claimed.

Two Contacts/Owners cases in `frontend/tests/e2e/ownership-recovery.spec.ts` are
prepared/typechecked, not run: lost acknowledgement with exact retry/one history
event, and saved operation followed by read failure without another write. They
use synthetic isolated fixtures, current selected labels, disabled traces/video/
screenshots, boolean request comparisons and detached context cleanup.

Backend behavior is unchanged and was not rerun. No actual app/browser/HTTP/DB/
account/configuration/service/worker/transfer access or workaround, migration,
SQL/native/device/zoom/CI/AFTER/product acceptance or main promotion is claimed.
Older broad selectors and remaining detail/context coverage continue in the
[migration coverage map](../03-planning/design-migration-coverage-2026-10-28.md).
