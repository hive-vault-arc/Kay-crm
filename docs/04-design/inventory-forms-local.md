# Selected inventory owner and structure forms

Status: source integration proposal,2026-10-27. C04/C13/C14. Native and product
review remain pending. This covers legal-owner editing and programme structure;
owner identity is documented [separately](owner-forms-local.md).

## Selected composition

The frozen `source-views.js` supplies legal-owner/contact choice, explicit shared
labels, structure entries and separate block/floor/type forms. These use the
existing selected RecordDrawer, RecordSection, RecordEntry, typed semantic icons
and shadcn controls. The drawer supplies the outer inset and scroll owner. Forms
have no additional reading cap, nested surface or table. Labels are above fields;
paired inputs collapse using the existing drawer container query. Existing
section separation supplies spacing without a second grid gap. One metadata fact
uses both card columns rather than leaving the right half unused.

The structure view has compact cards with actions and numbered pages only when
needed. Entering an editor replaces the list, rather than stacking a form, blocks
and another floor editor. Returning checks that panel's actual draft. Structure
tabs retain their own controls/drafts, consistent with the shared workspace; only
the selected tab is visible. Blocks expose their floors, and floors link to the
actual filtered Units destination. An edited floor keeps its existing block;
there is no client-inferred reparenting. Archived programmes are read-only.

Dense CRM/form surfaces remain outside design-taste's marketing workflow. Shared
system/React guidance and the user's AFTER timing are retained. Original-machine
mandatory skills remain unavailable here and are not claimed executed. No new
kit, chart, dependency, typography, animation or prototype change is introduced.

## Legal owners and protected identities

The current PUT contract replaces the complete owner set. The former UI omitted
links with a null protected contact, then could submit the visible subset. Such
a projection is now read-only: its authorized shared labels remain visible, but
no partial PUT is permitted. Explicit refresh reads the protected current dossier;
editing resumes only with a complete identity projection and active dossier.
No hidden contact/link/origin ID is inferred, exposed or invented.

An active complete list uses the existing scoped, numbered Contacts chooser.
Rapid repeated choices cannot add duplicate IDs; the limit remains100. Adding a
contact starts with an empty commercial label. Names, phones and other private
data are never copied into that shared text. Removing an entry dissociates only
that legal link on save, not the canonical Contact. No Contact-role change,
automatic promoteur ownership or programme-to-unit owner inheritance is added.
Available/reserved campaigns still cannot lose their last legal owner; backend
authority and [API contracts](api-contracts.md) prevail.

Conflict first reads the full current owner list for the same dossier and level.
The draft stays intact. Reload uses the standard discard guard. Explicit keep
uses the reviewed current version and warns that the submitted draft will
replace the complete current list, including concurrent additions. A protected
or archived comparison cannot be kept for a write. Reload can display that
read-only state. The current list becomes the dirty baseline, so a retained draft
that differs from it remains protected even if it matched the original list.

## Structure commands and current comparisons

Block/floor code, label and display order retain their contracts:40/160 characters,
integer order0–1,000,000. Reusable types retain the five supported categories and
optional positive area/rooms defaults. A decimal comma is normalized for the
existing exact decimal API. Unfilled optional defaults remain null. A type has no
price, availability or reservation and editing defaults changes no existing unit.
The prototype's illustrative type display-order field is not invented in the
real type contract.

POST/PATCH paths and parent expected_version are unchanged. The API has numbered
hierarchy collections rather than individual hierarchy GET routes. On explicit
comparison, the UI reads the current programme, finds the exact item in its real
collection (including later pages), verifies item/parent identity, then rereads
the programme. Different bracketing versions reject that comparison and require
a new read. Missing, foreign or malformed results cannot become a baseline.
This is a conservative UI check; the backend version/stock rules remain decisive.

The comparison displays that item's current fields. Reload discards only after
the shared guard; explicit keep retains the draft on the reviewed version. New
creation can keep its draft against a current active programme. No automatic
retry, overwrite, archive/restore or unit mutation is introduced.

## Draft, retry and authority boundaries

Each form declares actual editable values and read/command busy state to the
shared navigation guard. Searching the contact chooser alone is not a draft.
Synchronous locks prevent duplicate writes or overlapping comparison reads.
The existing command hook retains the key for identical path/method/validated
body, and now returns its handled failure to callers that need to clear private
context; its other callers remain compatible. Current401/403/404 removes private
fields/selection. Reads abort on unmount and late acknowledgements do not invoke
the departed form's success action. A submitted backend command is not claimed
rolled back by unmount.

No backend/API grant, schema, legal link semantics, provenance, real record,
database, service, migration, import/export or private configuration changed.
The [security check](../SECURITY_CHECK.md) records the same boundary.

## Evidence and remaining work

Fourteen new actual-module controller/model cases are registered in the existing
unit gate.334 frontend units pass, together with lint/typecheck and pinned
Next16.4.2 build. The first broad unit run still had320 cases because the new
file was not registered; the runner was corrected and the334-case gate passed.
Two isolated native journeys at1440/390 are prepared in
`frontend/tests/e2e/inventory-forms.spec.ts`, not executed. Older inventory helper/
detail selectors still require migration; they are not inferred passing.

Native drawer focus/keyboard/touch/zoom, real current-role/merge/version/stock
interactions, actual database and final full-stack/AFTER/owner/CI gates remain
open under the existing app-access restriction. Source/compiled CSS inspection
does not prove visual/native fidelity. Owner directory/drawer entry, photos and
the remaining branch-wide migration work are separate outstanding scope.
[Evidence](../03-planning/design-migration-evidence/inventory-forms-2026-10-27.json).


## Current hierarchy context and block-intent follow-through,2026-10-29

The shared selected picker now verifies programme/block parent IDs on every
returned row. Wrong/mixed-parent pages show the existing dependency-error/retry
state, with no choices or partial counts; healthy retry retains caller selection.
Current mixed-category counts, paging and compatible/off-page choices remain.
The existing wizard already blocks saving a chosen block without its floor;
actual-owner cases now verify both guarded correction and direct-programme units.
No new block field or floor requirement. [Contract](hierarchy-picker-context-local.md).
938 frontend units and lint/types/build/history/static app lint1 pass. Two native
cases are prepared, not run. Backend unchanged/not rerun; actual SQL/native/device/
rights/stock/CI/AFTER/product acceptance remains pending.
