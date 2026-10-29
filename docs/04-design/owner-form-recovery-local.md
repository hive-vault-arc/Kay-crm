# Selected owner form: operation and draft recovery

Source checkpoint,2026-10-29; C02/C04/C13/C14. Proposal for technical integration
within the frozen selected owner form; actual-stack and product review pending.
This supersedes the retry/conflict implementation description in the earlier
[owner form checkpoint](owner-forms-local.md), not its identity/ownership rules.

## Selected homes and field ownership

`/owners/new`, `/owners/{id}/edit` and the existing create/edit drawers continue
using the selected dossier header or single drawer footer, new/existing contact
choice and Coordonnées/Gestion du contact grouping. There is no new root tab,
section, CSS, token, dependency, glyph, motion or backend endpoint. The two owner
tabs and right-only compact Patrimoine remain unchanged.

| Values/actions | Source and command boundary |
| --- | --- |
| Name and person/organization type | Canonical Contact fields, full form validation |
| Phones and e-mails | Full collections including labels/primary flags; server normalization authoritative |
| Country, nationality and languages | Remaining canonical profile groups; optional language contract retained |
| Roles | Other literal roles retained; owner is required by this purpose-specific form |
| New-contact responsibility | Explicit M/A eligible agent; Agent sends no override; original actor performs creation |
| Existing contact selection | Scoped chooser then protected full Contact read; new-contact fields/assignment never replace it |
| Add owner role | Ordinary full Contact PATCH at the selected current counter; no legal link, enquiry or deal creation |
| Open existing owner | Current protected read, active owner-role check and handoff; no mutation |
| Full edit | Same canonical Contact ID and reviewed expected counter; no responsibility/provenance fields |
| Compare/reload/keep draft | Explicit fresh identity/read after definite conflict; exact offered object and counter acceptance |

## One owned operation

The full form uses `owner-form-intent.ts` and `use-owner-form-command.ts`.
Starting validation and dispatch is serialized. A validated create/edit/add-role
intent is cloned with its original target, body, key and completion callback.
Mode, assignee, raw form state, replacement callbacks and newer host projections
cannot substitute another operation after dispatch. Unknown results retain this
operation even if a later retry conflicts; an unknown result is not a fresh
editable draft. Cancellation remains disabled while pending/recovering.

Actual SSR actor ID and role now reach routed forms, directory creation/preview
and record editing. Fresh `/auth/me` proof precedes dispatch and completion;
actor/role/password-policy changes refuse private completion. Backend Contact
scope, edit authorization, phone denial, current counters and cached command
receipts remain authoritative. No permission or business rule is added.

Edited receipts require the exact ID, next counter, coherent primary-method
projection and requested role set. New creation binds initial version, active
manual source, actual creator, intended responsibility, name/type and owner
purpose. The client does not guess normalized phone/e-mail strings. A receipt
is followed by a fresh matching protected Contact read at least as new as the
receipt and known host counter. An alias appearing during this operation cannot
retarget completion. Initial routed/chooser alias resolution is still supported.

Once a receipt is acknowledged, retry performs only current proof/read and the
original awaited parent handoff. A failed read or parent completion cannot
dispatch another write. An existing-owner opening has its own current-read and
original-handoff recovery, without inventing an acknowledgement for a write.
Disposal aborts active work and suppresses late private callbacks; it does not
promise rollback of a submitted backend command.

## Retained drafts and explicit comparison

Transient metadata/contact loading errors retain the mounted form, typed values
and original counter; new operations wait for readable current context. A newer
host Contact version does not remount or silently rebase the draft. Unknown
operation recovery remains available through a transient metadata outage.
Current 401/403/404 masks private fields/choices; a fresh retry remounts the
authorized boundary. Receipt-aware operation denial reports a generic recorded
notice through the record boundary. Parent metadata denial is not itself proof
that a write was acknowledged.

A definite conflict does not trust `error.details.current`. The explicit compare
action obtains current identity and Contact data; only the exact fresh offered
object may be accepted. Old handlers cannot bypass its accepted counter. Full
edit offers guarded reload or explicit keep-draft-on-current-version. Reuse
offers reload only, preserving the canonical contact rather than an unrelated
new-contact draft. Archived current data remains read-only.

## Verification and native preparation

The initial actual-form regression fails before correction because interruption
leaves replacement fields enabled and no recovery marker. Final focused29 and
full977 frontend units pass, including11 added cases registered in the real
runner. Existing tests now model strict initial/next receipts and independent
fresh conflict reads, rather than invalid fixture success or exception snapshots.
Lint/types/build/history checks pass; static Frontend Taste app scan has0
findings in4 changed UI files. Static checks are not native visual acceptance.

Three isolated owner create/edit/add-role recovery cases are prepared/typechecked
at390/1440px, with captures off. Faults follow real isolated command responses
when eventually run; they are not executed now. The older owner journey now
targets phone actions, right-rail portfolio/current/former labels and property
history drawer. `addOwners` targets the selected legal-owner drawer and tonal
entries; its three other direct consumer files retain other unreviewed paths, so this
does not certify the inventory/development/visible-Chrome suites.

Backend unchanged; prior573 connection-forbidden units retained, not rerun.
Actual SQL/native/device/identity/role-loss/merge/CI/security/AFTER/product gates,
migrations0036/0037 and remaining exact field/job/alias/legacy-selector work stay
pending. No app/DB/account/private-config/service/worker/transfer access or
alternate access, migration, main edit, push, merge or deployment was performed.
[Evidence](../03-planning/design-migration-evidence/owner-form-recovery-2026-10-29.json).
