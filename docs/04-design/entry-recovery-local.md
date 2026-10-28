# Selected notes, activities and assignment recovery

Date:2026-10-28. Branch:`codex/redesign`.
Status: source integration; actual stack/native/product review pending.
Existing [ownership](../03-planning/sprints/06-ownership-contact-history.md),
[API](api-contracts.md) and activity contracts remain authoritative.

## Fields and selected placement

| Real fields/action | Selected home and current implementation | Preserved service boundary |
| --- | --- | --- |
| Contact note/interaction kind and text | Activités → Ajouter une activité; `contact-note-form.tsx`, shared by Contact and Owner history | Existing `POST /contacts/{id}/notes`; five existing kinds,4000-character text, true actor/time, no external send or booking |
| Prospect/Deal activity kind, text, optional duration/direction and three project labels | Activités drawer and desktop Prospect board exchange action; `activity-form.tsx` | Existing scoped `POST /enquiries/{id}/activities` and `/deals/{id}/activities`; immutable history, explicit descriptive project labels, no inventory/stock change |
| Prospect assigned agent or explicit responsible queue, reason and expected version | Suivi → Attribuer le prospect drawer; `enquiry-assignment.tsx` | Existing M/A-only `POST /enquiries/{id}/assign`; contact scope/active eligibility/version/receipt/true-actor history remain authoritative |

Frozen `src/activity-ui.js` supplies the selected drawer/table fields and contact
metadata distinction. Contacts retain their existing narrower note contract;
no unsupported duration/project write is invented for that endpoint. Existing
tabs, compact cards, section margins, top labels and semantic Button actions
remain. The new assignment refresh action uses the same form action group.

## Confirmed gaps and correction

These forms formerly fingerprinted the current editable draft after failure.
A lost response followed by an edit could therefore create another operation;
there was no shared lifetime cancellation or acknowledgement-only completion.
The assignment drawer was also keyed by version, permitting background updates
to discard its operation. These gaps are corrected without restoring old tabs
or moving controls out of their selected contextual drawers.

One small entry controller admits only those three real route shapes and their
strict existing payloads. It takes an immutable snapshot and synchronous command
lock before dispatch. Fresh unrestricted identity/CSRF binds retries to the same
actor and role; an Agent cannot dispatch assignment. The backend remains the
authority for role, contact, current eligibility, receipt and transaction rules.

Unknown dispatch pins the original target/body/key, including note kind/text,
activity metadata and assignment version/reason/agent/queue. Editing, cancel,
replacement submission and version refresh cannot interrupt it. Its explicit
retry uses that same snapshot, even after another failed identity preflight.
Known ordinary rejection permits correction; acknowledged completion retries
only the saved result/callback, with no second mutation. Finished stale handlers
cannot write again. Disposal aborts transport and ignores late results.

Notes/assignment receipts must match their original contact and operation; the
facade checks note target/action and assignment action. Activity results retain
their real ID-only contract rather than inventing a parent echo. Current denial
masks form/history/parent projections, cancels transport and preserves only a
generic notice if this operation was acknowledged. Assignment options denial is
derived before effect cancellation, while transient options failure retains an
unknown command and prevents a new one.

Assignment is keyed by enquiry/contact identity, never version. Explicit refresh
reads actual enquiry/contact versions under one fresh identity and lifetime
signal, preserves the selected agent/queue and reason, and clears a prior query
failure through its existing refresh mechanism. A merged/foreign read cannot
silently retarget the operation. Missing choices remain explicit and cannot be
submitted as invented agent IDs. No backend, endpoint, grant, receipt-retention,
merge policy, outbox or external messaging change is made.

## Verification boundary

653 frontend units pass, including14 added route/body/receipt, actual controller,
transport, form, history denial and refresh cases. Existing activity hydration,
optional-context, overlap, denial and history-drawer tests remain; a successful
stale submit is now correctly refused before a fresh denied instance is tested.
The new suite is registered in the real runner. Lint/types/build/history pass.
Static Frontend Taste app lint covers11 changed UI sources with0 findings; its
grouping/spacing/truthful state guidance is applied within the selected design.
There is no new visual concept or unselected AFTER audit-only fix; unavailable
original-machine skills and native inspection are not claimed.

Four cases in `frontend/tests/e2e/entry-recovery.spec.ts` are prepared/typechecked,
not run: Contact note, Prospect activity, Deal activity and explicit queue
assignment lost-response recovery. They compare request identity with safe
booleans and verify one history event using isolated synthetic fixtures. Traces,
videos and screenshots are off; cleanup detaches the current context first.

Backend unchanged/not rerun. No actual app/browser/HTTP/DB/account/configuration/
service/worker/transfer access or workaround, executed migration, SQL/native/
device/zoom/CI/AFTER/product acceptance or main promotion is claimed. Remaining
form/menu, field/context and old-selector work continues in the
[coverage map](../03-planning/design-migration-coverage-2026-10-28.md).
