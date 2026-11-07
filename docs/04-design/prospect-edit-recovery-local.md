# Selected prospect status and inline recovery

Date:2026-10-28. Branch:`codex/redesign`.
Status: source integration; actual stack/native/product review pending.
Existing [API](api-contracts.md), [SP-05](../03-planning/sprints/05-leads-contact-identity.md)
and [SP-06](../03-planning/sprints/06-ownership-contact-history.md) rules remain.

## Selected controls and real fields

The selected colored/icon status menu keeps Suivi/Qualification/Clôture and all
nine writable states. Conversion remains a separate explicit action. The
confirmation retains the opening status, version, message, budget, campaign and
rating; legacy missing budget remains visible and required. The four selected
inline editors remain Budget, Qualification, Source du prospect and Description,
with the same field placement and compact confirm/cancel controls. No source,
responsibility, provenance or conversion fields enter their PATCH payloads.

The existing strict enquiry edit contract and atomic optional contact-field
shape are unchanged. This checkpoint integrates only the status and inline
controllers; full create/editor and conversion recovery remain separate work.
It does not claim every prospect form has been reconciled.

## Confirmed gaps and request ownership

The status dialog previously allowed cancellation/replacement after a lost
response; inline edits could also create another key from an edited failed
draft. A saved callback failure could repeat the PATCH. Board current-read
changes or inline metadata failures could replace the open review/editor.
Those controllers now retain one immutable reviewed body/version/key and use a
synchronous owner. Successful completion requires a new explicit review before
another request; stale submits cannot repeat it.

The shared API helper gains optional proof-before-dispatch/dispatched callbacks
after its existing current identity read. Existing callers retain their path,
method, body, key, CSRF, cancellation and event behavior. The enquiry controller
uses those callbacks to require an unrestricted same actor/role and distinguish
failed identity preflight from a dispatched unknown result. Backend current
authority, versions, transaction, receipt and true-actor history remain decisive.

An unknown response keeps the exact original PATCH. New reviews, edits, cancel,
Escape, comparison refresh and replacement submits are blocked; explicit retry
uses the original snapshot. A failed retry preflight cannot erase an earlier
unknown outcome. Acknowledged completion retries only the saved DTO/callback,
not the PATCH. Disposal aborts transport and refuses late callbacks. Current
denial masks the field/dialog and parent record with only a generic notice if
this operation is known saved.

Known conflicts require explicit review/rebase. The existing inline choices
still reload one field or preserve that field's draft over current unrelated
values; IDs/contact/archive/converted guards apply. Status conflict refresh is
an owned action: it can close its own review after current proof rather than
deadlocking on its own lock. Enquiry result and comparison IDs must match the
reviewed enquiry/contact. The facade additionally rejects foreign enquiry GET,
PATCH and conflict identities; ordinary canonical Contact GET remains valid.

Board move reviews keep their opening authorized DTO across current-read
loading/transient failure/newer status. Inline metadata keeps its editor owner
through a transient failure, disables new saves, and leaves original recovery
available. Current authority denial removes private projection. Shared inline
form geometry is unchanged: recovery locks inputs/cancel/Escape, keeps a retry
action accessible and declares React-owned dirty state to the navigation guard.

## Verification boundary

666 frontend units pass, including13 added actual controller/API-helper/status/
inline/metadata/board/facade cases. Existing status and inline retry tests remain
and use the real command hook; the status fixture is now a strict full enquiry.
Lint/types/build/history pass. Static Frontend Taste app lint covers5 changed UI
sources with0 findings; grouping, spacing and truthful states remain inside the
selected design. No new concept or unselected AFTER audit-only fix is made;
unavailable original-machine skills and native inspection are not claimed.

Two cases in `frontend/tests/e2e/enquiry-recovery.spec.ts` are prepared/typechecked,
not run: status confirmation and inline description lost-response retry. They
use isolated synthetic fixtures, safe request comparisons, one version increment,
unchanged unrelated fields, disabled trace/video/screenshots and detached cleanup.

Backend unchanged/not rerun. No actual app/browser/HTTP/DB/account/configuration/
service/worker/transfer access or workaround, executed migration, SQL/native/
device/zoom/CI/AFTER/product acceptance or main promotion is claimed. Remaining
create/editor/conversion, other domain commands, field/context and old-selector
work continues in the [coverage map](../03-planning/design-migration-coverage-2026-10-28.md).
