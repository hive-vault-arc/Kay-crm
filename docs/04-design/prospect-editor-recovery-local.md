# Selected full prospect editor recovery

Date:2026-10-28. Branch:`codex/redesign`.
Status: source integration; actual stack/native/product review pending.
The [prospect command contract](prospect-edit-recovery-local.md) and existing
[API](api-contracts.md) remain authoritative.

## Fields and selected surface

The full edit sheet retains its selected header actions, Contact and
Qualification du prospect sections, top labels and responsive field grouping.
Contact fields remain name/type, complete phone/e-mail collections and primary
choices, roles, residence, nationality and languages. Qualification remains
budget, campaign, rating, status and optional message. A changed contact enters
the existing atomic `contact_fields` shape with its own expected version; an
unchanged contact is omitted. No source, provenance, responsibility, assignment,
conversion or inventory authority is added to the edit payload.

The existing required-language/budget and optional-empty-message rules remain.
Conflict comparison and explicit complete reload remain in the same sheet.
Already converted prospects retain their existing read-only affair destination.
No field or section is replaced by an older CRM layout.

## Confirmed gaps and completion ownership

The old form could replace a failed fingerprint/key after a changed draft,
discard the editor on contact/metadata read failure, repeat a saved PATCH when
completion failed, and reset from local raw contact values rather than current
server values. It also lacked lifetime cancellation for validation/reload.

The full editor now uses the existing strict enquiry command owner. Original
atomic body, both versions and key remain pinned after unknown dispatch;
same-actor/role proof and the existing backend scope/transaction/history rules
remain. Local validation has a synchronous lock and managed busy state. Late
validation cannot dispatch or update state after disposal. Unknown retries bypass
new validation and use only the original request; inputs and navigation remain
protected. A known conflict requires explicit reload before a replacement save.

After acknowledgement, only the contact read/completion is retried. Same-ID
contact reads must be at least the version acknowledged by the PATCH. Successful
completion resets both forms and versions from the result/current contact,
including normalized values and the accepted header name, before accepting the
draft baseline. An unchanged repeated Save cannot write again; a genuinely new
draft can explicitly begin another review in the same sheet.

Contact/enquiry IDs are checked before reset or comparison. Ordinary canonical
Contact GET remains valid: when its ID changes after acknowledgement or during
explicit reload, a current enquiry read must prove that same relationship. A
verified merge ends in a read-only link to the updated prospect, without
retargeting the editor or applying another contact's values to it. An unverified
foreign reply fails closed. Versions of different canonical identities are never
compared as if they belonged to the same record. A newly converted enquiry read
also ends read-only rather than parsing it as writable qualification.

The enquiry/contact-keyed form survives contact/metadata loading or transient
failure using its last authorized reads. New saves are disabled while those
reads are unavailable, while original unknown recovery remains accessible.
Current denial removes the private form; owned completion denial retains only a
generic saved notice when acknowledged. Disposal aborts reads and refuses late
resets/success. Backend endpoints, permissions, atomic edit, versions, receipts,
merge policy and true-actor history are unchanged; no persistent storage.

## Verification boundary

677 frontend units pass, including11 added actual full-editor/controller/host
cases. They cover atomic snapshot, both versions/collections, completion-only
retry, normalized baselines, deliberate next save, validation/disposal,
foreign/stale/canonical reads, conflict reload, converted state, availability,
denial and retained validation rules. Existing dossier atomic-edit coverage
remains with separate per-component hook state and real command ownership;
its dirty assertion now checks the React boolean rendered as the same DOM value.
Lint/types/build/history pass. Frontend Taste applies to selected grouping,
spacing and truthful states; static app lint covers1 UI source with0 findings.
No new concept, unselected AFTER fix or unavailable skill execution is claimed.

Two cases in `frontend/tests/e2e/editor-recovery.spec.ts` are prepared/typechecked,
not run: lost atomic PATCH acknowledgement and acknowledged contact-read outage.
They use isolated synthetic fixtures, safe request/version/collection comparisons,
disabled traces/video/screenshots and detached context cleanup. Actual merge
races and role/native/device review remain pending.

Backend unchanged/not rerun. No actual app/browser/HTTP/DB/account/configuration/
service/worker/transfer access or workaround, executed migration, SQL/native/
device/zoom/CI/AFTER/product acceptance or main promotion is claimed. Prospect
creation/conversion and remaining domain/field/selector work continue in the
[coverage map](../03-planning/design-migration-coverage-2026-10-28.md).
