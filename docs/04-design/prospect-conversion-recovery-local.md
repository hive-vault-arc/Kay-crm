# Selected prospect conversion recovery

Date:2026-10-28. Branch:`codex/redesign`.
Status: source integration; actual stack/native/product review pending.
Existing [API](api-contracts.md), [creation recovery](prospect-creation-recovery-local.md)
and [prospect edits](prospect-edit-recovery-local.md) remain authoritative.

## Selected workflow and fields

Conversion remains a separate explicit prospect action and board confirmation.
The selected dialog retains its title, description, catalog programme/standalone
property/external project picker, budget, purchase reasons, language prerequisite
and Confirm/Cancel actions. It submits exactly one project, reviewed source
version, budget and purchase reasons. It does not create a free title, override
source/contact/responsibility, reserve a unit/offering, record finance or send an
external message. Existing backend conversion keeps its canonical contact,
campaign/rating/message snapshot, atomic history and true actor.

Selected spacing, responsive grouping, components, tokens, icons and motion are
retained. New notices/actions appear only for real recovery/read-only states.
The picker has an optional authority-denial callback; other consumers retain
their existing behavior. No new business state, endpoint or permission.

## Original request and cross-domain completion

Previously a changed failed conversion could replace its body/key, metadata
failure could discard its form, newer converted props could replace the dialog,
and failed navigation could repeat the POST. The conversion owner now freezes
the opening source version and parsed project/budget/reasons/body/key. First and
retry dispatch use fresh unrestricted identity and retain the same actor/role;
details additionally bind the originating account/role supplied by the route.
The board binds its first accepted current identity. This preserves backend
authority rather than inferring grants from UI fields.

Unknown dispatch retains the original attempt. Inputs, Cancel, Escape and stale
handlers cannot replace/close it; a synchronous parent protection ref also
guards dismissal before React renders busy state. Retry uses only that original
body/key. Known conflicts block another submit until explicit current source
reload. That reload retains the user's chosen project/budget/reasons, updates
the reviewed source version, and requires another explicit confirmation/new key.
Canonical, archived or converted current sources finish read-only with the real
updated prospect/affair link, without retargeting another mutation.

Conversion creates a different record, so its command owner distinguishes POST
acknowledgement, authoritative cross-domain reads and navigation. A conversion
receipt must not carry customer-proposal result fields. After a receipt, fresh
same-actor/role proof precedes current enquiry and destination affair reads.
Their IDs, minimum destination version, source relationship, creator and current
canonical contact must agree before navigation. Legitimate canonical contact
changes are accepted through the current source/destination relationship, not
by comparing unrelated identity versions or rewriting the original request.

Read/navigation failure after a coherent receipt retries completion, not POST.
Foreign/stale read responses cannot navigate or reset the draft. A proven foreign
receipt (correct-ID affair belonging to another source/creator) is not a valid
acknowledgement: only the same original operation/key may retrieve its result
again. A successful conversion cannot be resubmitted, and closing retains its
known destination. Existing receipt retention remains bounded; no permanent
replay guarantee is introduced.

## Hosts, lifetime and privacy

Opening review ownership survives newer/converted props and metadata loading or
transient failure. Current missing/failed board reads and metadata block new
submissions while original recovery remains available. Current authoritative
metadata/project/command/source/destination denial masks the private dialog and
reaches the detail/board owner; an acknowledged operation may retain only a
generic saved notice. Disposal or identity replacement aborts requests and
prevents late state updates/navigation. No persistent browser storage.

## Evidence and remaining work

707 frontend units pass,16 added in the registered conversion suite. Actual
dialog/controller/picker/board tests cover original snapshot/key, props/metadata
outages, completion-only reads/navigation, explicit conflicts, canonical/read-only
results, foreign/stale/proposal results, first/retry identity, denial, disposal,
hydration and required project/budget/reasons/languages. The composite harness
owns hook state by parent/key and models cleanup; a picker test invocation was
corrected to enter that component owner. The existing board test now covers both
status and conversion availability. No warning/test suppression.

Lint/types/build/history and static Frontend Taste app lint4 pass,0 findings.
Taste applies to preserved selected grouping and truthful recovery states; no
new concept, unselected AFTER fix or unavailable skill execution is claimed.
Two cases in `frontend/tests/e2e/conversion-recovery.spec.ts` are prepared and
typechecked, not run: lost conversion acknowledgement and acknowledged destination
read outage at desktop/phone widths. They use isolated synthetic actors, transient
safe comparisons, disabled traces/video/screenshots and detached cleanup.

Backend unchanged/not rerun. No actual app/DB/account/config/service/worker/
scanner/simulator/import/export/transfer access, workaround or migration execution.
Actual SQL/role/native/focus/zoom/device/visual/performance/CI/AFTER/product checks
and migrations0036/0037 remain pending. Remaining domain commands/fields/contexts
and broader legacy browser selectors remain open; the full redesign is active.
