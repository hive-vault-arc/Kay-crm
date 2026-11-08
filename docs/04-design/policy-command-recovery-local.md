# Working-hours command recovery

Date:2026-10-29. Branch:`codex/redesign`.
[Scheduling authority](visit-scheduling-local.md) ·
[Evidence](../03-planning/design-migration-evidence/policy-command-recovery-2026-10-29.json).

## Selected fields and business boundary

The selected Settings navigation, seven-day summary, support area and detailed
period/pause drawer remain. No token, glyph, layout, motion or business rule is
replaced. Frontend Taste applies to truthful existing form states and grouping;
static app lint is not a rendered audit. AFTER timing remains unchanged.

| Field/action | Preserved home and meaning |
| --- | --- |
| Agency company-car capacity | Integer1–1000; global capacity per touched hour |
| Working periods | All weekday/start/end triples across seven days; up to42 rows; new rows blank |
| Breaks | Separate weekday/start/end triples, up to42 rows; no inferred lunch default |
| Add/remove | Per-day controls retain all other rows; UI-only keys never enter the payload |
| Casablanca time zone/current version | Read-only backend policy context; no client clock or permission substitute |
| Preview | Exact proposed fields/expected counter, affected total and first100 visits, real preview hash |
| Save/retry/comparison | Explicit reviewed save; original-operation retry; current comparison retains the draft and requires a new impact preview |

Office visits remain possible at any hour. Off-site windows, breaks, company-car
hour accounting, future-visit versions/hash, concurrency, events and current
administrator authorization remain authoritative in the existing backend.
The backend returns the proposed next policy counter for both preview and save;
the save caches that complete impact response for24hours. No API/schema,
database, retention or worker change is introduced.

## Concrete correction and ownership

An actual-form regression first proves that an interrupted PUT leaves the policy
controls editable. The legacy draft fingerprint could then admit another preview
and another save key. `usePolicyCommand` now owns the original administrator,
body/counter/hash/key and completion callback. Unknown saves retain that operation,
including through a later409; replacement previews, comparisons and ordinary
cancel cannot silently replace it. The existing recovery-aware outer departure
guard remains available for an explicit departure.

Preview replies must match every requested period, pause, capacity and next
counter, with coherent unique/bounded affected rows. Editing invalidates the
lease immediately; late replies and stale save handlers cannot restore it.
A save acknowledgement additionally matches the reviewed hash. Fresh same-actor
administrator proof and a scoped current policy read precede awaited completion.
Historical receipts may complete with a newer current policy, never an older one.
Read/handoff failure retries completion without another PUT. Disposal aborts
transport and suppresses late projection. Current denial hides impact/comparison
and retains only a generic notice when acknowledgement was known.

A definite version/hash conflict obtains a fresh comparison. Only the exact
offered policy can be accepted; all input stays, the expected version advances
and a new impact preview is mandatory. A failed comparison cannot be bypassed
using a stale handler. Parent transient reads retain the mounted draft and disable
new operations; changing host counters does not remount the form. Actual SSR
administrator identity keys and binds the page/editor lifetime.

## Evidence and limits

Focused21 and full961 frontend units pass, ten added. Legacy form fixtures now
derive previews from actual proposed fields and next counter, and model current
readback after save. An unused legacy authority constant produced a focused lint
warning and was removed without suppression. Final lint/types/build/history and
static app lint2 pass. Two390/1440 isolated receipt-loss/completion-read cases
are prepared/typechecked, not run. The existing AT-40 native scenario now opens
the selected drawer and uses current row labels; it also remains unrun.

Backend production unchanged; prior573 connection-forbidden units retained, not
rerun. No actual app/browser/HTTP/DB/accounts/private configuration/services/
transfer access or workaround, migration/main/push/merge/deploy. All254 frozen
inputs and unrelated work remain preserved. Actual SQL/native/device/security/
CI/AFTER/product gates, migrations0036/0037 and wider exact job/filter/alias/
legacy-selector reconciliation remain pending. Full goal remains active.
