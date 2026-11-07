# Canonical contact edit recovery

Date:2026-10-29. Branch:`codex/redesign`.
[Migration](../03-planning/design-prototype-migration-2026-10-25.md) ·
[Evidence](../03-planning/design-migration-evidence/contact-edit-recovery-2026-10-29.json).

## Selected fields and their owners

The frozen design remains the appearance and organization reference. This slice
changes command ownership and recovery, not its tokens, glyphs, motion, tab
distribution or sidebar composition. Frontend Taste applies to truthful form
states and existing field grouping; static scanning is not a rendered review.
Unavailable original-machine skills are not claimed; AFTER timing is retained.

| Selected field/group | Actual field and selected home |
| --- | --- |
| Nom; personne/organisation | Contact `name`, `type`; full coordinates drawer and individual fields |
| Téléphones; principal/secondaires | Contact `phones`; retain every number, label and primary choice, including secondary-method editors |
| E-mails; principal/supplémentaires | Contact `emails`; retain every address, label and primary choice; an empty collection remains empty |
| Rôles | Contact `roles`; full and individual contact editors |
| Pays; nationalité; langues | Contact `country`, `nationality`, `languages`; full and individual editors and additional coordinates |
| Budget; qualification; source; message du prospect | Enquiry `initial_budget`, `rating`, `campaign_source`, `message`; four existing enquiry inline owners, not canonical contact fields |
| Qualification et suivi de l’affaire | Deal `initial_budget`, `rating`, `purchase_reasons`, `payment_method`, `number_of_rooms`, `campaign_source`, `notes`, `projects`, `next_action`; nine existing deal inline owners |

There are eight canonical Contact groups, four Enquiry inline fields and nine
Deal inline fields. Responsibility, original provenance, collaborators,
enquiry assignment and merge retain their separate commands and authority.
This map is source reconciliation, not complete acceptance of those workflows.

## One confirmed operation and current completion

`use-contact-edit-command.ts` owns an immutable, cloned, schema-checked body,
expected Contact counter, UUID idempotency key, original completion callback and
opening contact/actor/role. Both full and inline editors use it. A changed draft
cannot replace an interrupted operation. An unknown result followed by409
remains unknown; it cannot be silently rebased into another write.

The existing backend caches the complete post-edit Contact for24hours, after its
version increases once. Acknowledgement therefore requires the exact contact,
expected counter plus one and coherent primary phone/e-mail projections. Real
server phone/e-mail normalization remains authoritative; the client does not
guess canonical output. The existing route, request and backend contracts do
not change.

Current identity is checked before dispatch. After acknowledgement, a fresh
same-actor/role identity proof and scoped Contact read must succeed before the
original callback is awaited. Current data may be newer than the historical
receipt but cannot be older than it or a newer host projection. Read/handoff
failure retains acknowledgement and retries completion without another PATCH.
A merged alias returning a different contact is refused rather than silently
retargeting the confirmed operation. Disposal suppresses late state/callbacks.

A definite version conflict requires an explicit fresh current comparison and
acceptance of that exact offered object. Full forms may retain the entire draft;
inline forms keep only their edited field and take all other fields from the
accepted current version. Current archive status prevents a new edit. Existing
open full-drawer recovery can finish while its archived trigger is hidden;
actual backend replay/read authority remains authoritative.

## Draft and private-state boundaries

Opening lifetimes use contact/actor/role, not changing Contact version keys.
Transient metadata/read failure retains the mounted form and collections while
disabling new edits.401/403/404 hides private fields and comparisons; a known
acknowledgement permits only a generic saved notice. No private browser storage,
new event bus, guessed permission or external credential delivery is introduced.

The full drawer retains the existing recovery-aware departure warning. Inline
recovery blocks cancel/Escape and disables field controls. Save accepts only the
confirmed draft after awaited parent completion; unsent raw replacement values
are not marked saved. Actual actor/role is forwarded from Contact, Owner,
Prospect and Deal roots. Parent same-version projections already prefer fresh
reads, so canonical contact updates do not require a root-version rule change.

## Verification limits

949 frontend synthetic units pass, including eleven added controller/form cases.
Lint, types, build, history-bootstrap and static app scanning of eleven UI files
pass. An intermediate exhaustive-dependencies warning was fixed by memoizing the
alias refusal; no warning was suppressed. Three390/1440 isolated browser cases
are prepared/typechecked only, with captures/traces/videos disabled. Backend
production is unchanged; prior573 connection-forbidden units are retained, not
rerun. Actual SQL/rights/concurrency/native/device/security/CI/AFTER/product gates,
pending migrations0036/0037 and broader field/alias/legacy-selector coverage
remain open. No actual app, DB, account, private configuration, service, transfer,
migration, push, merge or deployment was accessed or executed for this slice.
