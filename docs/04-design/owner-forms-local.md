# Selected owner identity forms

Status: source integration proposal,2026-10-27. C02/C04/C13/C14; native and owner
review pending. This slice implements the routed identity form, not every owner
directory/drawer/legal-link/hierarchy/photo surface.

## Identity and ownership remain separate

`/owners/new` and `/owners/{id}/edit` use the existing canonical Contacts commands.
No owner identity table, property link, enquiry, deal, import or assignment
endpoint is introduced. The backend owner directory still includes Contacts with
the owner role **or** current/former property/development links. A role badge in
this form describes the literal Contact role, not proof of legal ownership or a
negative assertion about historical links.

The frozen owners.js form supplies existing/new contact choice, Coordonnées,
Coordonnées complémentaires and Gestion du contact. The implementation uses the
same dossier header/actions, sections, fields, compact entry/facts and responsive
columns as the selected app. New/edit actions are at the top; errors precede
fields. Phone/e-mail collections, primary flags/labels, country, nationality,
languages, type and other Contact roles remain available. Owner is not removable
in this form. The real language contract remains optional rather than copying
the prototype's illustrative required rule. Layout integration is proposed
pending native/owner review; no new theme/CSS/dependency/chart.

## New contact and explicit reuse

New creation forces owner among valid unique roles and preserves all contact
fields. M/A choose an explicit eligible primary agent; Agent sends no assignment
override and the backend assigns the current actor under its existing rule.
Source/provenance and responsibility are not editable here.

Existing mode uses the current scoped, numbered Contacts chooser, followed by a
fresh protected full-contact read. It adds owner only through the ordinary
versioned Contact PATCH, copying that current contact's full editable fields and
other roles. The new-contact draft and selected new-contact agent are never
substituted into reuse. If the literal role is already present, opening makes no
write. If only historical/legal-link membership exists, adding the literal role
is still an explicit Contact-role action and changes no legal links. The chooser
does not infer a write grant from read access; backend authorization prevails.

Mode/search alone is disposable UI. Typed new-contact fields/agent stay retained
and protected across mode changes; an actual chosen ID is also draft state.
Exactly one pair of collection controllers remains mounted. Choosing a new
contact or returning to new mode aborts the previous lookup; a late response
cannot replace the choice. Archived choices are read-only here and require the
existing restoration workflow, with no automatic restore.

## Commands, conflicts and denial

A synchronous lock spans asynchronous validation and the command. The retry key
is attached to path/method/exact validated body; unchanged interruption retries
that request. Only success accepts the draft and routes to the returned canonical
owner. Unmount aborts lookups and suppresses late redirects; it does not claim to
roll back a submitted backend command.

Full identity edit uses the reviewed expected_version. Conflict retains fields
until explicit current reload or explicit keep-draft-on-current-version choice.
Reuse offers current reload only: it cannot replace a newer identity with an
unused new-contact draft. A conflict snapshot must have the intended contact ID
before it can be adopted. Full comparison includes methods/labels, roles, profile
and responsibility. Definite read/write/chooser/agent denial hides private form
and selected context before retry remounts a fresh authorized read. Private-phone
denial is not an invitation to clone an inaccessible contact.

Accessible duplicate-phone reuse uses the existing confirmation with owner-role
copy; it does not promise a second enquiry or a property link. The owner directory
predicate, merge/canonical behavior, original provenance and legal ownership
commands are unchanged. See the [API contract](api-contracts.md).

Fifteen actual-module units cover payload preservation, creation/assignment,
validation/retry locks, fresh canonical reuse/no-op, archived/denied/stale reads,
conflict choices, unmount, draft modes, collection layout and duplicate wording.
An isolated real-API/browser reuse journey is prepared, not executed; existing
owner name selectors are updated, while broader old directory/detail selectors
remain migration work. [Evidence](../03-planning/design-migration-evidence/owner-forms-2026-10-27.json).
