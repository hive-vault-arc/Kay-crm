# Selected prospect creation recovery

Date:2026-10-28. Branch:`codex/redesign`.
Status: source integration; actual stack/native/product review pending.
Existing [API](api-contracts.md) and
[prospect command recovery](prospect-edit-recovery-local.md) remain authoritative.

## Selected field and action map

The creation sheet retains its header actions and Contact, Qualification du
prospect and Responsabilité sections. Contact mode remains explicit: complete
new-contact identity/phone/e-mail/primary/role/residence/nationality/language
fields, or a chosen accessible existing contact. Existing responsibility is
preserved. M/A select the new contact's responsible agent and explicitly choose
responsible-agent assignment or the unassigned queue. Agents submit neither
assignment nor responsible-agent override; backend authority remains decisive.

Budget, campaign, rating, writable initial status and optional message remain.
Language and budget requirements are unchanged. Creation still uses the existing
atomic enquiry POST, manual source and a stable source-submission UUID. Conversion
remains a separate workflow. No selected section, control geometry, responsive
grouping, styling, token, motion or icon family is replaced.

## Confirmed gaps and recovery ownership

Previously a changed failed draft could replace its key/body, metadata failure
could unmount the form, and repeated save/navigation completion or late contact
reuse could lose ownership of the original operation. Creation now extends the
existing strict enquiry command owner, preserving existing PATCH consumers.

The server route supplies the real originating account and role. Fresh current
identity proof before dispatch must match both and allow ordinary work. Original
parsed body, source-submission identity and key are retained after an unknown
dispatch; inputs, reuse and cancellation cannot alter that attempt. Retry bypasses
new validation and sends only that original request. Acknowledged completion
retries only navigation; a completed creation cannot be rearmed as another POST.
This remains the existing bounded receipt/replay contract, not permanent replay.

Creation results must match submitted source/submission, actual creator and any
explicit existing-contact identity before navigation. A foreign/malformed reply
remains uncertain and recoverable with the original key. Ordinary known rejection
permits correction or explicit duplicate reuse with a fresh key and the same
source-submission UUID. Duplicate reuse proves current identity, reads only the
accessible chosen contact, accepts legitimate canonical Contact GET and places
that explicitly selected contact into the next undispatched draft. It never
retargets an uncertain operation. Required-language handling and primary submit
focus return remain.

Validation is synchronously owned and visibly busy. Layout-commit availability
tracking blocks a pending validation when current metadata becomes unavailable;
refs are not read/written during render. The metadata host retains the draft
through loading/transient failure, disables new saves while unavailable and keeps
unknown recovery usable. Current metadata, selector, assignment or owned-command
denial masks the form. Disposal/identity replacement aborts requests and refuses
late validation, reuse, success or navigation. Origin binding survives effect
setup/cleanup. No persistent browser storage or backend rule change.

## Verification boundary

691 frontend units pass,14 added in the registered creation suite. They exercise
actual route/controller/form/host behavior: full original snapshot, same key,
metadata loss, stale controls, explicit canonical reuse, M/A queue/Agent payload,
first and retry authority, validation/disposal, acknowledged completion-only
retry, foreign results and completed-operation refusal. Existing dossier retry
tests now supply coherent creation provenance and current synthetic role; helper
traversal/awaiting covers real nested form callbacks. Lint/types/build/history and
static Frontend Taste app lint1 pass with0 findings. React lifecycle ref findings
were fixed without suppression. Taste applies to preserved selected grouping and
truthful states; no new concept, unselected AFTER fix or unavailable skill claim.

Two cases in `frontend/tests/e2e/creation-recovery.spec.ts` are prepared/typechecked,
not run: new-contact and existing-contact lost-acknowledgement recovery at desktop
and phone widths. They use isolated synthetic actors, transient safe comparisons,
disabled traces/video/screenshots and detached cleanup. Actual native/SQL/role/
focus/zoom/device/visual/performance/CI/AFTER/product acceptance remains pending.

Backend, atomicity, scope/permissions, receipt retention, merge policy and true-
actor history remain unchanged; backend tests were not rerun. No actual app/DB/
account/config/service/worker/scanner/simulator/import/export/transfer access,
workaround or migration execution occurred. Main and all254 frozen design inputs
remain unchanged. Prospect conversion, other domain/field/context gaps and legacy
browser selector migration remain open; the full redesign goal is active.
