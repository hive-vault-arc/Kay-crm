# Selected inventory offer commands

Status: source integration proposal,2026-10-27. C04/C08; native/current-role/stock
and owner review pending. This concerns inventory campaigns, not customer
proposals, reservations, Deal outcomes or financial recognition.

## Placement and composition

Frozen `inventory-detail.js` puts editing, availability and external-result
actions beside an offer. `source-views.js` supplies one focused form per command.
The shared offer section now follows those homes instead of a generic Actions
drawer containing several controls at once. Documents/Modifier remain in their
existing page header; missing-offer creation remains on the Offers section.

Edit and availability use individual RecordDrawers with semantic44px icon
triggers, one managed form, selected entry/sections, top labels, responsive input
pairs and shared footer. External results keep their existing reviewed-impact
confirmation dialog through an icon-only trigger. Read-only/engaged campaigns
keep a details drawer and their reservation/overlap/review explanations. Last
confirmation, original conditions and exact monthly/annual price display remain
available. No new layout/theme/kit/dependency or backend route is introduced.

## Rules and command lifetime

M/A gates remain authoritative on the backend. Agents do not gain ordinary
campaign/availability/external-result commands; D43's atomic initial property
offering exception is unchanged. Available/reserved ordinary sale/rental stock
retains the external-result workflow; holiday campaigns do not gain it or dated
booking support. Reserved stock requires explicit authorized release. Sold,
rented, withdrawn and review states cannot be overwritten by ordinary editing.

Amounts stay decimal strings, with comma normalization and optional unknown
price; original annual rent is not silently changed to monthly. Sale has no
period, ordinary rental month/year, holiday day/week/month. New offers remain
draft. Editing a draft cannot make it available; confirmation separately checks
price, legal owners and programme/unit overlaps. Availability creates no
reservation. Conditions, required reasons and expected parent/offering versions
use the existing exact request contracts.

Forms declare actual dirty and busy state. Synchronous locks serialize commands;
the existing command controller keeps the key for unchanged path/method/body.
Only accepted success clears the draft. Definite denial removes private input
before fresh retry; transient failure keeps it. Departed reads abort and late
or foreign-target acknowledgements cannot close the form as success. Backend
rollback is not inferred from cancellation or unmount.

## Explicit current comparison

An inventory-version conflict offers a deliberate current parent read through
the existing property/development endpoint. Target identity/level and embedded
offering parent identity are checked. Comparison does not replace inputs or send
another write. Current price, period, conditions, state, archive status and legal
owner count are displayed before keep/reload. Reload uses the shared discard
guard; keep adopts both reviewed current versions while preserving inputs.

The original campaign ID remains fixed. A newly current replacement, archived
target, reserved/terminal/review state or foreign projection cannot become a
writable baseline. In particular a missing old campaign cannot turn an edit into
creation or modification of another campaign. A newer draft cannot inherit a
stale available state without the separate availability confirmation.

## Evidence and limits

Thirteen actual-module model/controller/composition cases are registered in the
full385-case frontend unit gate. They cover exact amounts/periods, distinct
targets/versions, current identities and stock locks, focused composition,
validation, dirty state, duplicate/unknown retries, deliberate rebase/reload,
denial/abort/unmount and command placement. Two isolated1440-programme/390-property
native journeys are prepared, not executed. Existing inventory browser helpers
still need reconciliation with the focused controls.

Shared shadcn/Tailwind/semantic icons and scoped compiled geometry are reused;
source/hash checks do not prove native visual/focus/touch/zoom/accessibility or
real permission/stock/race behavior. Mandatory original-machine skill files stay
unavailable/not claimed; dense CRM/forms exclude marketing design-taste. Existing
system/React guidance and AFTER timing remain. No real records, DB, service,
migration, private config, main/push/merge or deployment. Other migration work,
including PDF provenance and final native/full-stack/CI/AFTER/owner gates, stays
open. [Evidence](../03-planning/design-migration-evidence/offering-forms-2026-10-27.json).
