# Selected affair creation and full editor recovery

Date:2026-10-29. Branch:`codex/redesign`.
Status: source integration; actual stack/native/product review pending.
Existing [API](api-contracts.md) and
[conversion contract](prospect-conversion-recovery-local.md) remain authoritative.

## Selected fields and context

The selected single sheet retains Contact, Projet et budget and Qualification de
l’affaire, its header actions, responsive columns and top field labels. Contact
identity, full primary phone/e-mail collections, roles, residence, nationality
and languages remain. Creation retains explicit new/existing contacts and M/A
responsible-agent choice; an Agent submits no responsibility override. Existing
contacts retain their responsibility. A prospect context still directs the user
to the separate conversion workflow.

Up to three ordered programme/property/external project interests, budget,
optional linked search/offering and offering version, campaign, rating, purchase
reasons, financing, zero-capable room count, notes and next action remain. Initial
ordinary stage is creation-only. Edit preserves its atomic optional contact
fields and separate contact/affair versions; no stage, stock/reservation, outcome,
commission, provenance or assignment command enters that PATCH.

An existing search belongs to its contact. Changing creation contact/mode clears
that now-invalid link and announces the removal; other qualification remains.
The new-contact mode cannot show a previous contact's searches. Prefilled context
reads must match the exact requested search/offering IDs and contact, rather than
accepting a different accessible row. No new business rule or grant is inferred.

## Command and completion ownership

The old fingerprint could replace a failed operation after edits, metadata/contact
hosts could discard the form, and parent completion could repeat an acknowledged
write. The form command owner now pins the parsed POST/PATCH, versions, selected
context and key after unknown dispatch. Fresh unrestricted identity must match
the originating account/role supplied by creation/detail. Fields, context pickers,
reuse, cancellation and stale handlers cannot replace an uncertain request.

A result must have the expected edit ID and no customer-proposal fields. After a
receipt, same-actor/role proof precedes current affair and full contact reads.
IDs, minimum acknowledged affair version, contact relationship and minimum same-
contact version must agree. An atomic contact edit also requires its expected
contact version plus one while that original contact ID remains; canonical IDs
are not compared against the old contact's counter. Manual creation checks creator
and absence of an enquiry relationship. Foreign receipts retrieve only the same
original request/key; foreign/stale current reads cannot reset fields. Existing
bounded receipt retention is unchanged; no permanent replay promise.

Acknowledged read/parent completion failure retries completion without POST/PATCH.
Successful edit resets complete fields, projects, offering, contact, versions and
managed baselines from authoritative normalized reads. Unchanged repeated Save
cannot write again; a deliberate later draft can begin a new reviewed save.
Creation cannot rearm another create. Known edit conflicts retain the draft and
offer scoped comparison/explicit complete reload, including both versions.
Canonical/archived/closed current results end read-only at the real affair link,
without retargeting another contact's mutation or comparing unrelated versions.

## Lifetime, hosts and handoff

Metadata/contact/prefill hosts retain authorized drafts through transient read
failure, disable new saves while unavailable and keep original recovery usable.
Validation is synchronously owned; committed availability prevents a pending
validation from dispatching after a read becomes unavailable. Reuse/current reads
have the same identity proof and cancellation. Current selector/metadata/contact/
command denial masks private work; acknowledged denial retains only a generic
saved notice. Disposal and actor/contact/context replacement abort late work.
No persistent browser storage.

The detail host retains its opening editor during source outages and accepts
the already-verified affair at completion, avoiding a second unowned reload.
Closing releases parent busy state. A transient old read error can appear beside
the verified result; current authority denial still removes the private record.
Shared context picker denial is optional and preserves other consumers.

## Verification boundary

727 frontend units pass,20 added actual route/form/controller/context/record-host
cases. Existing dossier tests retain exact collections, zero, qualification,
context, both versions, conflict reload and retry coverage using coherent full
receipts and the real command owner. New cases cover lost acknowledgement,
completion-only retry, normalized baselines, deliberate next edit, known conflicts,
canonical/closed reads, explicit duplicate reuse, invalid linked context, identity,
foreign receipts/reads, metadata/validation/disposal and parent busy/read handoff.
Lint/types/build/history and static Frontend Taste app lint4 pass,0 findings.
Taste applies to selected grouping and truthful states; no new concept, unselected
AFTER fix or unavailable skill execution is claimed. No suppressions introduced.

Three cases in `frontend/tests/e2e/deal-form-recovery.spec.ts` are prepared/
typechecked, not run: phone creation lost acknowledgement, desktop atomic edit
lost acknowledgement and phone edit acknowledged contact-read outage. They use
isolated synthetic actors, transient safe comparisons, disabled traces/video/
screenshots and detached cleanup. Actual role/SQL/native/focus/zoom/device/visual/
performance/CI/AFTER/product checks and migrations0036/0037 remain pending.

Backend unchanged/not rerun. No actual app/DB/account/config/service/worker/
scanner/simulator/import/export/transfer access, workaround, migration, main/
push/merge/deploy. All254 frozen design inputs remain unchanged. Other domain
commands, exact field/action/context audit and broader legacy selectors continue;
the full redesign goal remains active.
