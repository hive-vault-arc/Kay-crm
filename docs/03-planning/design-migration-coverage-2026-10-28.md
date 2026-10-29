# Selected-design migration coverage map

Date: 2026-10-29. Branch: `codex/redesign`.
[Plan](design-prototype-migration-2026-10-25.md) ·
[Execution](design-prototype-migration-execution.md).

This is a current source map, not native, database or product acceptance. The
frozen reference remains `C:/Users/ali-a/Documents/the vault/designs/kay`;
its254 manifest inputs are protected. Selected organization/appearance wins
visual conflicts; actual authority, private files, exact values and business
contracts remain authoritative. Demo dispatchers and fixture arrays are never
production services. A located source slice is not proof that every field,
edge state or old test selector has been reconciled.

## Route, field and command ownership

| Selected capability / fields and commands | Selected home / current Next route and UI owner | Real service owner and current source boundary | Remaining reconciliation |
| --- | --- | --- | --- |
| Shell, theme, search, inbox, account; login/change own password/logout/session expiry | `src/workspace.js`, `src/global-search.js`, `src/mobile-search.js`; real `features/shell`, `features/auth`, `features/realtime`; `/login`, `/change-password`, authenticated workspace | `app/identity`, `app/realtime`; revocable sessions, current role, guarded dirty navigation; selected source foundation | Native focus/route/expiry/refresh/contrast/zoom and old selectors |
| Prospects: name/phones/email/country/nationality/languages, source/campaign/rating, budget/message/status, assigned agent, received dates; create/reuse/edit/inline fields/convert/assign/archive/restore | `src/pages.js`, `src/forms.js`, `src/contact-methods.js`, `src/source-commands.js`; `/leads`, `/leads/new`, `/leads/{id}`, `/leads/{id}/edit`; `features/contacts/lead-list.tsx`, `lead-record.tsx` | `app/contacts`, `app/deals`; separate enquiry identity/current scope, real phone resolution, version/receipt/explicit conversion | Field/context refinements and legacy browser selector migration; private/duplicate/retry native flows |
| Contacts: Agent/Langue/Dossiers/Pays/Rôle/Créé/Archivage/Tri; per-contact prospective/deal counts, import/export | `src/pages.js`, `src/directory-filters.js`; `/contacts`, legacy `/leads?view=contacts`; `features/contacts/contact-directory.tsx` | **Confirmed gap repaired in this source slice:** formerly q/archive only; `app/contacts/directory.py`, queries/router and `app/discovery` now share scoped predicates/counts/export filters. [Contract](../04-design/contact-directory-local.md) | Prepared4 PostgreSQL/2 browser cases not run; actual plans/performance/filter focus and final selected comparison pending |
| Contact overview/activity; responsibility/collaborators, dossiers below responsibility, Recherches; full edit/note/transfer/collaborators/merge/archive/restore/history | `src/contact-drawer.js`, `src/records.js`, `src/activity-ui.js`; `/contacts/{id}`; `features/contacts/contact-record.tsx`, `contact-dossiers.tsx`, ownership controls | `app/contacts/ownership_router.py`, merge/link policy, `app/requirements`, `app/activities`, `app/work`, `app/schedule`; Contact has no Dossiers tab | Eight canonical edit groups mapped; original actor/body/key/counter recovery and fresh completion source-covered. [Contract](../04-design/contact-edit-recovery-local.md). Real alias/scope/drawer/native and remaining action acceptance |
| Recherches: intent/budget/criteria/null/importance, shortlist exact offers/opinion/history; create/edit/remove/compare/version acceptance | `src/parity-ui.js`, `src/parity-model.js`; Contact/Lead/Deal contextual drawer; `features/requirements` | `app/requirements`; real rows, parent scope, exact offering/version/intent; source slice already implemented | Actual scope/stock/retry/denial and native keyboard/touch comparison |
| Deals: contact/project/budget/reasons/next action, stage/rating; overview/projects/activities/documents, per-value edit, proposals/reserve/release/close/reopen | `src/source-views.js`, `src/source-commands.js`, `src/parity-ui.js`, `src/dossier-lifecycle-model.js`; `/deals`, `/deals/new`, `/deals/{id}`; `features/deals/deal-workspace.tsx` | `app/deals`, `app/project_links`, `app/activities`; explicit transitions/proposals, independent stock guards and immutable history | Per-field context/old selector audit, real concurrent stock/version/outcome and native state menus |
| Programmes: reference/name/category/location/briefing/developer, descriptive preparation/marketing phase; overview/offers/presentation/structure/documents/edit | `src/inventory-detail.js`, `src/inventory-ui.js`; `/projects?kind=programmes`, `/projects/new`, `/projects/{id}`, `/projects/{id}/edit`; `features/inventory/development-*` | `app/inventory/hierarchy_*`; descriptive nullable phase separated from offering state, immutable original snapshot, negotiated legacy reads. [Phase](../04-design/development-phase-local.md) | Migration0037 unapplied; prepared real SQL/native history/phase/rights and whole-development partial-commit scenarios |
| Units: name/reference/category/block/floor/type/availability/transaction/archive, exact price/surface/rooms/sort; create/edit/template/structure/offer actions | `src/inventory-ui.js`, `src/inventory-parity-demo.js`; `/projects/{id}?tab=units` and typed unit/template context; `features/inventory/unit-directory.tsx` | `app/inventory`; physical inventory/hierarchy/templates distinct, scoped exact same-offer ranges; parent-bound picker rows. [Context](../04-design/hierarchy-picker-context-local.md) | Real SQL/filter plans/deep-link/reset and native drawer/structure stepper parity |
| Independent properties: identity/location/full characteristics/equipment/occupation, all offer kinds and photos; category radio/desktop view/phone image-left cards | `src/property-listing-model.js`, `src/inventory-detail.js`; `/projects?kind=properties`, `/projects/properties/new`, `/projects/properties/{id}`, `/projects/properties/{id}/edit`; `features/inventory/property-*`, `record-details.tsx` | `app/inventory`; exact money/annual rent, agent initial draft exception/current photo capability, real file recovery. [Directory](../04-design/inventory-directory-local.md) | 24 detail keys/29 amenities mapped; hidden room fact retained. [Field map](../04-design/property-field-reconciliation-local.md). Actual category/legacy/native/rights/stock/photo/transfer acceptance; existing block/floor guard confirmed in source |
| Owners: canonical contact identity and legal owner/developer links; overview/activity, right-only Patrimoine current/former links; existing contact/reuse/create/edit | `src/owners.js`, `src/owners-model.js`, `src/owner-inline-model.js`; `/owners`, `/owners/new`, `/owners/{id}`, `/owners/{id}/edit`; `features/owners` | Contacts owner-directory/portfolio plus inventory ownership; shared stock never grants private owner authority | Actual current/former link/denial/empty rail/phone/accessibility and legacy URL/selector reconciliation |
| Files/photos: choose/drop/remove native file, upload/version/retry, preview/download/archive/scanner recovery; cancel returns to existing uploaded list | `src/file-operations.js`, `src/file-model.js`; contextual documents/photo drawers and Lead/Deal Documents tabs; `features/files/file-panel.tsx`, photo forms/gallery | `app/files`; real scanner/private storage, current capabilities, bounded permits and origin/session rechecks | Actual file/scan/transfer/recovery/ten-slot/version/native cancellation; no public URLs or duplicate uploaded-list panel |
| Prepared PDFs: model-specific values/draft, prepare/history tabs, true creator/status/versions/retry/download; approved styled blank appendix | `src/generated-ui.js`, `src/generated-model.js`; contextual Documents/PDF and retained routed document workspace; `features/generated/document-workspace.tsx` | `app/generated`;12 pinned styled appendices, originals/provenance retained, early same-key replay/current parent/template access. [Reconciliation](../04-design/pdf-appendix-reconciliation.md) | Real transfer/replay/security/native field/history and final full-stack verification; owner appendix choice resolved, no merge implied |
| Finance: M/A commissions/terms/receipts, exact decimals, expected versions, inline receipts and dossier history | `src/parity-ui.js`, `src/parity-model.js`; Deal Finance drawer; `features/finance/finance-panel.tsx` | `app/finance`; exact five-command field/receipt map, current role/contact, append-only history and uncached creation expiry guard; no agent amounts | Prepared functional/recovery/visible-Chrome cases not run; actual ledger/clock/concurrency/role-loss/device/AFTER acceptance |
| Work, inbox and visits: task owner/due/date/instructions/status, internal read state, authoritative Casablanca booking/status/notes/follow-up, desktop week and phone agenda | `src/activity-ui.js`, `src/visit-ui.js`, `src/calendar-operations.js`, `src/reminder-model.js`, `src/visit-model.js`; `/visits`, `/visits/new`, `/visits/{id}`, `/notifications`, contextual work; `features/work`, `features/schedule` | `app/work`, `app/schedule`, PostgreSQL reminder/outbox; prepared general Notes separate from outcome/next action | Migration0036 unapplied; actual civil-time/freebusy/notifications/follow-up/retry and old browser selector reconciliation |
| Dashboard/reports: authoritative period/attribution metrics, exact money, pipeline/chart/alerts, scoped paged drilldowns | `src/work-reports.js`, `src/report-model.js`; workspace dashboard/reports section; `features/reports/workspace-*`, `report-*` | `app/reports`; current/period distinction, M/A versus assigned-or-shared Agent projection, Bklit charts. [Report workspace](../04-design/report-workspace-local.md) | Actual SQL/coherence/role changes/native charts/zoom/contrast and final performance |
| Discovery/audit/lifecycle/export jobs: escaped search/counts, typed authors/targets, prepared-PDF search, review/ack/private download; source import CSV/map/whole-batch retry | `src/global-search.js`, `src/audit-model.js`, `src/data-operations.js`; `/search`, audit workspace, Leads import/export panels; `features/discovery`, `features/imports` | `app/discovery`, `app/imports`, archive services; scope before labels/counts, durable PostgreSQL job identity, current transfer authority | Full filter/action field audit beyond Contacts, saved-job/revocation/real worker/native transfer; **no retention execution** |
| Staff/settings/intake: admin chosen initial/reset passwords, first own change, delete/revoke, hours impact, safe website source intake state | `src/settings-pages.js`, `src/settings-operations.js`, `src/policy-windows.js`; `/settings`, users/new/edit, working-hours, `/website-simulator`; `features/users`, `features/intake` | `app/identity`, `app/schedule`, `app/intake`; D37/session/last-admin/real signature/rate and current source policy | Identity-safe original-field/role/impact/retry/denial audit; no credentials in evidence; no external sender/deployment |
| Help: hub/category side-by-side guide cards/search/reader/related anchors; no essential FAQ block | `src/help.js`, `src/help-model.js`; `/help`, `/help/{slug}`; `features/help` | Authenticated local content/real route references, not a fabricated support channel | Full linked route/content/focus/mobile/reader sizing and native selected comparison |

## Confirmed changes versus proposals

Contacts counts intentionally describe the **existing nonarchived dossier lists**,
not the prototype's unrestricted fixture-array lengths. Converted prospects are
excluded just as on ContactDossiers; closed deals remain included. The UI states
this meaning. Creation sort uses contact creation, not enquiry reception. No
business lifecycle or permission is broadened by either adaptation.

The nullable programme phase/legacy unknown policy remains a technical proposal
pending product review. New selected PDF appendix provenance is owner-approved.
No other assumed business policy is promoted by this map.

## Continue from here

This cluster map assigns current UI/service owners and identifies a real missing
vertical slice; it does not close P0. Continue exact per-field/control and command
coverage against current strict schemas and frozen handlers, especially contact/
lead/deal field context, inventory characteristics/equipment, settings and job
filters. Review aliases and migrate old selectors against current selected
markup. Keep genuine missing capability work separate from unselected AFTER
visual findings. P8 is still the final actual-stack/native/device/CI review;
P9 merge remains owner-gated. App restrictions do not authorize alternate access.

## Directory field follow-through,2026-10-28

[Prospect/Affair filter source reconciliation](../04-design/dossier-directory-local.md)
now covers the selected unassigned prospect choice, separate actual enquiry
assignees/contact responsibility (including inactive readable labels), and Affair
creation dates alongside retained modification criteria. Read scope precedes
all totals/status/stage counts/pages; command assignment remains UUID-only.
Prepared earlier Contacts browser bodies now use a runtime-validated factory.
Four real SQL/two new native cases remain unrun. Continue exact inventory/detail/
settings/job field and command context coverage; this does not close P0.

## Unit/property form field follow-through,2026-10-28

[Shared listing field map](../04-design/unit-listing-workflow-local.md) records
the selected five-step unit flow, every location/characteristic/equipment payload
home and full review. The separate three-step unit creator is removed. Partial
unit details retain BR-26 draft semantics while standalone rich requirements
remain; the technical integration proposal awaits product review. Type choices,
placement/stock locks, zero values and guarded cancel are source-covered. The
illustrative vacancy default is not invented; current stock flags stay per offer.
Four SQL/two native cases and the shared unit helper remain unrun. Continue exact
remaining detail/settings/job coverage and broader legacy-selector migration.

## Staff command and editor follow-through,2026-10-28

[Staff field/action map](../04-design/staff-workflow-local.md) reconciles selected
name/e-mail/role/initial password, profile save and reset/delete without inventing
directory filters or changing the Settings layout. Real D37/version/last-admin/
revocation/history contracts remain. Shared profile/security ownership now pins
unknown retries and separates acknowledgement from completion. Fresh same-actor
authority precedes dispatch; editor lifetimes and successful responses bind to
the selected account, with credential-safe denial/disposal.

585 frontend units pass, including12 new cases registered in the real unit
runner. Two browser recovery cases are prepared/typechecked, not run; required
staff labels in the older browser suite are reconciled. Actual account/SQL/
native/device/AFTER/CI/product checks remain pending. Continue remaining exact
detail/job/intake coverage and legacy-selector reconciliation; P0/P8 remain open.

## Export request ownership follow-through,2026-10-28

[Export action/field map](../04-design/export-recovery-local.md) retains the
selected full-filter review, explicit confirmation, Mes exports four columns and
phone/drawer cards. Original kind/filters/key and same current M/A actor survive
unknown replies; acknowledged recovery never creates another job. Directory
and contextual owners survive loading/transient read failure. Authority loss
masks the old review/aborts transport; kind/detail/permit identities fail closed.
No backend worker/CSV/receipt/transfer rule changes or duplicate-control removal.

598 frontend units pass, including13 added cases. Two new current-label browser
cases are prepared/typechecked, not run. Older broad discovery fixture/helpers/
selectors still need reconciliation; actual worker/private CSV/native/device/
AFTER/CI/product checks remain pending. Continue remaining import/intake/detail
coverage; this does not close P0/P8 or the full redesign goal.

## Import transfer/review follow-through,2026-10-28

[Import action/field map](../04-design/import-resume-local.md) retains file/
fallback, all eight logical-row fields, mapping/preview and atomic approval in
the selected layout. Reopened awaiting/uploading batches can explicitly resume
without another metadata create. Route lifetimes prevent an old selection from
surviving a changed batch URL. Unknown metadata pins original file/fallback/key;
its own retry can cross its child lock while new uploads retain the draft guard.
Synchronous transfer/review ownership, fresh same-actor M/A proof, dispatched
approval tracking, acknowledgement/disposal and foreign-reply guards are covered.
Shared backend M/A access, CSV/hash/generation/permanent-result/provenance and
atomic rules remain unchanged.

612 frontend units pass, including14 added cases; three current-label native
cases are prepared/typechecked, not run. Actual transfer/SQL/native/device/AFTER/
CI/product gates remain pending. Continue intake/detail and broader old-selector
coverage; this does not complete P0/P8 or the redesign goal.

## Public intake field follow-through,2026-10-28

[Public field/action map](../04-design/intake-form-local.md) retains the selected
card and receipt-only workflow, adds the real optional property-reference input
and preserves the real optional-message rule. Reference remains opaque enquiry
text with no stock/inventory/private lookup. Local combined text/UTF-8 bounds,
exact-byte retry, public field/path allowlists and disposal guards are covered;
the backend existing forbidden-control rule now also checks the reference.
Source signing/current authority/atomic receipt and processing behavior remain.

558 backend/621 frontend units pass, including11/9 added cases; three simulator
cases are prepared/typechecked, not run. Older broad intake helpers/selectors,
actual signed service/SQL/worker/native/device/AFTER/CI/product checks remain
pending. Continue remaining detail and wider selector coverage; P0/P8 and the
full redesign goal remain open.

## Contact/Owner management follow-through,2026-10-28

[Management action map](../04-design/ownership-recovery-local.md) retains all
existing operation fields inside selected responsibility/drawer organization.
One source/role lifetime survives version updates; reviewed intent/version/
proof/key and actor remain pinned after unknown dispatch. Saved completion
retries only its read. Current denial/disposal mask/cancel late work, canonical
refresh cannot retarget a mutation, and merge labels follow IDs. Client/facade
coherence complements unchanged backend scope/history/merge/receipt rules.

639 frontend units pass, including18 added cases; two current-label native cases
are prepared/typechecked, not run. Lint/types/build/history and static app lint4
pass. Remaining detail/context, older broad selectors, actual native/SQL/device/
AFTER/CI/product acceptance and migrations0036/0037 remain pending. No backend
rerun or actual access is claimed. P0/P8 and the full redesign goal remain open.

## Note/activity/assignment follow-through,2026-10-28

[Entry field/action map](../04-design/entry-recovery-local.md) retains contact
kind/text, full Prospect/Deal activity metadata and explicit assignment agent/
queue/reason/version in selected drawers. Original immutable target/body/key
and fresh same-actor/role proof own unknown retries; acknowledged completion
does not write again. Current denial/disposal masks/cancels late work. Assignment
identity survives version refresh, transient options errors retain recovery,
and explicit scoped refresh preserves the draft while updating real versions.
Client/facade receipt coherence retains unchanged backend authority/history.

653 frontend units pass,14 added; lint/types/build/history and static app lint11
pass. Four native cases are prepared/typechecked, not run. Remaining menus/forms,
detail/context and older broad selectors continue; actual native/SQL/device/
AFTER/CI/product acceptance and migrations0036/0037 remain pending. No backend
rerun or actual access is claimed. P0/P8 and the full redesign goal remain open.

## Prospect status/inline follow-through,2026-10-28

[Status/inline field-action map](../04-design/prospect-edit-recovery-local.md)
retains selected menu groups/states and Budget/Qualification/Source/Description
editors. Unknown PATCH recovery pins original fields/version/key and same actor/
role proof; acknowledged completion cannot repeat the write. Known conflicts
require explicit rebase. Board opening reviews and inline metadata owners survive
transient reads without discarding the command; current denial masks them.
Result/contact/current coherence preserves legitimate canonical Contact reads.
Shared inline recovery keeps its selected geometry and accessible retry action.

666 frontend units pass,13 added; lint/types/build/history and static app lint5
pass. Two native cases are prepared/typechecked, not run. Full create/editor/
conversion recovery, remaining domain commands/fields and older broad selectors
remain; actual native/SQL/device/AFTER/CI/product acceptance and migrations0036/
0037 are pending. Backend unchanged/not rerun; no actual access claimed. P0/P8
and the full redesign goal remain open.

## Full prospect editor follow-through,2026-10-28

[Full editor field/action map](../04-design/prospect-editor-recovery-local.md)
retains selected Contact/Qualification grouping, all contact collections and
qualification fields, plus the existing atomic contact/enquiry versions. Unknown
saves keep the original request; acknowledged completion retries only the scoped
contact read and resets server-normalized baselines. Genuine next drafts can
begin another save, while unchanged repeated Save cannot write again. Host reads
retain the owner through transient failure; validation, disposal and denial guard
late updates. Verified canonical/converted reads end read-only with a real return
path rather than silently retargeting the mutation.

677 frontend units pass,11 added; lint/types/build/history and static app lint1
pass. Two native cases are prepared/typechecked, not run. Prospect creation/
conversion, remaining domain commands/fields and older broad selectors remain;
actual native/SQL/merge/device/AFTER/CI/product acceptance and migrations0036/0037
are pending. Backend unchanged/not rerun; no actual access claimed. P0/P8 and the
full redesign goal remain open.

## Prospect creation follow-through,2026-10-28

[Creation field/action map](../04-design/prospect-creation-recovery-local.md)
retains the selected Contact/Qualification/Responsabilité sheet, complete contact
collections, explicit existing-contact reuse, M/A owner/queue and Agent authority.
Original POST body/submission/key stay pinned after unknown dispatch; first/retry
proof binds the actual originating actor/role. Results must match provenance,
creator and any explicit existing contact. Acknowledged completion retries only
navigation, and a completed creation cannot rearm another POST. Known duplicate
rejection permits explicit current canonical reuse. Metadata hosts retain drafts,
block new saves while unavailable and keep original recovery usable. Committed
availability, validation/disposal and current denial guard stale/late actions.

691 frontend units pass,14 added; lint/types/build/history and static app lint1
pass. Two native new/existing-contact lost-ack cases prepared/typechecked, not
run. Backend unchanged/not rerun. Prospect conversion, remaining domain fields/
commands/contexts and older broad selectors remain; actual native/SQL/device/
AFTER/CI/product acceptance and migrations0036/0037 remain pending. No actual
access or workaround, main/push/merge/deploy. P0/P8 and full redesign remain open.

## Prospect conversion follow-through,2026-10-28

[Conversion field/action map](../04-design/prospect-conversion-recovery-local.md)
retains the selected separate project/budget/reason confirmation. Original source
version/body/key survive unknown dispatch, newer converted props and metadata
outages. Same-actor/role proof precedes dispatch and acknowledged current source/
affair reads; destination identity/version/creator/canonical contact must agree
before navigation. Read/navigation failure cannot repeat an acknowledged POST.
Known conflicts require explicit source reload/new confirmation; canonical,
archived and converted reads finish read-only. Synchronous dismissal protection,
retained hosts, denial and disposal guard private/late actions. Board conversion
receives current source availability while retaining its opening review.

707 frontend units pass,16 added, plus existing board status/conversion coverage;
lint/types/build/history and static app lint4 pass. Two native acknowledgement/
destination-read cases prepared/typechecked, not run. Backend unchanged/not rerun.
Remaining domain commands/fields/contexts and older browser selectors continue;
actual native/SQL/device/AFTER/CI/product acceptance and migrations0036/0037 remain
pending. No actual access or workaround, main/push/merge/deploy. P0/P8 and the
full redesign goal remain open.

## Affair form follow-through,2026-10-29

[Affair form field/action map](../04-design/deal-form-recovery-local.md) retains
the selected three-section sheet, full contact/qualification/project/context
fields, creation-only stage, zero and separate atomic edit versions. Unknown
POST/PATCH retains original body/key; acknowledged completion proves current
affair/contact and resets normalized baselines without another write. Atomic
contact completion requires expected version plus one only for the original ID;
canonical IDs keep their own counters. Known conflicts explicitly reload both
versions; canonical/closed/archived reads finish read-only. Exact prefill IDs,
announced contact-dependent search removal, retained hosts, disposal/denial and
verified parent handoff/busy release repair confirmed workflow gaps.

727 frontend units pass,20 added; lint/types/build/history and static app lint4
pass. Three native phone creation/desktop edit lost-acknowledgement and phone
edit contact-read outage cases prepared/typechecked, not run. Backend unchanged/
not rerun. Other domain actions/fields/contexts and broader old selectors remain;
actual native/SQL/device/AFTER/CI/product checks and migrations0036/0037 remain
pending. No actual access or workaround, main/push/merge/deploy. P0/P8 and the
full redesign goal remain open.


## Affair action follow-through,2026-10-29

[Action field/map contract](../04-design/deal-action-recovery-local.md) retains
the selected workspace/header/menu, all nine inline fields and Projects-tab
client proposals. The shared owner pins strict parent/proposal intent and
unknown body/key, proves originating actor/role and validated current results,
and retries acknowledged completion without another write. Known conflicts
require offered/current acceptance; inline keep preserves current unrelated
values. Unknown work protects input/dismissal/new actions and retains its
original once-only UI callback, including global retry. Transient metadata/detail
reads retain authorized drafts; current denial still masks them. Board scope
now forwards the directory actor/role. Legacy financing is explicitly remediated.

751 frontend units pass,24 added; lint/types/build/history and static app lint11
pass. Two native phone stage-lost-ack/desktop inline-result-read cases prepared/
typechecked, not run. Backend unchanged/not rerun. Dedicated reservation/outcome
commands, exact remaining field/context reconciliation and old selectors remain;
actual SQL/native/device/AFTER/CI/product checks and migrations0036/0037 remain
pending. No actual access/workaround, main/push/merge/deploy. P0/P8/full goal open.


## Affair stock-action follow-through,2026-10-29

[Stock action map](../04-design/deal-stock-recovery-local.md) retains separate
selected reserve/release/close/reopen confirmations and reviewed effects. The
shared owner now freezes these strict stock intents, proves original account/
role and current results, and retries acknowledged completion/async handoff
without POST. Outcome review brackets matching parent/version/offering reads;
exact target/offering/development versions must agree. Changed contact/target/
reservation/direction ends read-only. Unknown fields/dismissal/refresh stay
protected; a verified result feeds the existing separate-stage prerequisite
queue without another read. Exact amounts/date/reasons and backend stock/finance/
history rules remain.

762 frontend units pass,11 added; lint/types/build/history and static app lint3
pass. Reservation/outcome helpers use the selected menu; two native reserve-ack/
close-result-read cases prepared/typechecked, not run. Backend unchanged/not
rerun. Manager external stock outcomes and remaining exact field/action/context
reconciliation/old selectors continue; actual SQL/concurrent stock/native/device/
AFTER/CI/product checks and migrations0036/0037 remain pending. No actual access/
workaround, main/push/merge/deploy. P0/P8/full goal open.


## External inventory-result follow-through,2026-10-29

[External-result map](../04-design/external-stock-recovery-local.md) retains the
selected per-offer icon/confirmation, safe stock effects, date/shared reason and
M/A boundary. A dedicated owner pins original target/offering/account/role and
strict body/key; current proof and coherent reviewed facts precede dispatch.
Validated receipt/current target and awaited UI handoff precede host acceptance;
acknowledged failures retry completion only. Replaced/retired offerings end
read-only. Protected property/programme hosts retain the opening record through
background/source changes, accept verified results monotonically and still mask
current denial. View routes key and forward the real actor/role.

782 frontend units pass,20 added; lint/types/build/history/static app lint3 pass.
Two native property-read/programme-ack cases prepared/typechecked, not run.
Backend unchanged/not rerun. Generic inventory command users (development
creation/edit, hierarchy, offering/availability, owners, property listing wizard),
remaining exact field/context reconciliation and old selectors continue. Actual
SQL/concurrent stock/native/device/AFTER/CI/product checks and migrations0036/0037
remain pending. No actual access/workaround, main/push/merge/deploy. Goal active.


## Inventory record-form follow-through,2026-10-29

[Record-form map](../04-design/inventory-record-command-recovery-local.md) retains
selected owners/offering/availability/hierarchy homes and fields. Scoped strict
original requests/keys/callbacks, current actor/role proof, exact receipts/current
parent, protected unknown work, explicit current conflict acceptance and awaited
monotonic host handoff cover those three form families. 804 frontend units pass,22
added; lint/types/build/history/static app lint8 pass. Three native cases prepared/
typechecked, not run. Development creation/edit and property listing generic
commands, remaining exact domain field/action/context reconciliation and legacy
selectors continue. Backend unchanged/not rerun. Actual SQL/native/concurrent
stock/device/AFTER/CI/product acceptance and migrations0036/0037 remain pending.
No actual access/workaround, main/push/merge/deploy. P0/P8/full goal remain open.


## Programme editor follow-through,2026-10-29

[Programme editor map](../04-design/development-edit-recovery-local.md) retains
selected fields/adjacent summary, phase capability and promoter privacy contracts.
Scoped original PATCH/key/callback, current identity, protected unknown work,
completion-only recovery, explicit current acceptance/reload and normalized dirty
baselines cover the edit route. All scoped record comparisons now reject a version
older than a parent received before acceptance. 815 frontend units pass,11 added;
lint/types/build/history/static app lint2 pass. Two native cases prepared/typechecked,
not run. Development creation/property listing generic owners, exact remaining
domain reconciliation and old selectors continue. Backend unchanged/not rerun;
actual SQL/native/concurrent stock/device/AFTER/CI/product acceptance and
migrations0036/0037 pending. No actual access/workaround, main/push/merge/deploy.
P0/P8/full goal remain open.


## Programme creation follow-through,2026-10-29

[Programme creation map](../04-design/development-creation-recovery-local.md)
retains selected steps/fields/summary and phase/promoter privacy. Original strict
POST/body/key/callback, real originating account/role, protected unknown work and
verified completion-only recovery cover creation. 828 frontend units pass,13 added;
lint/types/build/history/static app lint3 pass. Two native cases prepared/typechecked,
not run. Property listing generic owner, exact remaining domain reconciliation and
old selectors continue. Backend unchanged/not rerun; actual SQL/native/concurrent
stock/device/AFTER/CI/product acceptance and migrations0036/0037 pending. No actual
access/workaround, main/push/merge/deploy. P0/P8/full goal remain open.


## Property listing follow-through,2026-10-29

[Listing recovery map](../04-design/property-listing-recovery-local.md) retains
selected independent/unit create/edit fields, stepper and complete review. Exact
original operation/key/callback, current actor/host, protected unknown work,
verified completion-only recovery and explicit current reconciliation cover all
four flows. Property+first-offer counters stay2/1; existing scope/hierarchy/stock
rules remain backend authoritative. 848 frontend units pass,20 added; lint/types/
build/history/static app lint5 pass. Three native cases prepared/typechecked, not
run. The other generic consumer found in discovery/lifecycle-panel.tsx, remaining
exact domain reconciliation and old selectors continue. Backend unchanged/not
rerun; actual SQL/native/concurrent stock/device/AFTER/CI/product acceptance and
migrations0036/0037 pending. No actual access/workaround, main/push/merge/deploy.
P0/P8/full goal remain open.


## Inventory lifecycle follow-through,2026-10-29

[Lifecycle map](../04-design/inventory-lifecycle-recovery-local.md) retains the
selected confirmation/reason and conservative archive/restore boundary. Scoped
original action/key/body/callback, current M/A proof, exact receipt/current state,
protected unknown work and verified parent completion replace the generic writer.
Explicit current review cannot flip actions or bypass campaigns/children; ordinary
refresh is separate from saved completion. 865 frontend units pass,17 added; lint/
types/build/history/static app lint3 pass. Two native cases prepared/typechecked,
not run. Zero legacy generic references remain in frontend source/tests. Separate
enquiry/deal lifecycle controls, exact remaining domain reconciliation and old
selectors continue. Backend unchanged/not rerun; actual SQL/native/concurrent stock/
device/AFTER/CI/product acceptance and migrations0036/0037 pending. No actual access/
workaround, main/push/merge/deploy. P0/P8/full goal remain open.


## Prospect/affair lifecycle follow-through,2026-10-29

[Lifecycle map](../04-design/record-lifecycle-recovery-local.md) closes the separate
source-control gap identified after inventory lifecycle. The selected confirmation
retains original kind/action/body/key/callback, current identity and distinct
agent relationships, exact newer receipt/current proof and verified parent result.
All four detail/list hosts retain unfinished work; current denial clears held
private views. Backend30-day restoration and linked affair blockers remain.
890 frontend units pass,25 added; lint/types/build/history/static app lint7 pass.
Two native cases prepared/typechecked, not run. Exact remaining domain
reconciliation and legacy selectors continue. Backend unchanged/not rerun; actual
SQL/native/concurrency/device/AFTER/CI/product acceptance and migrations0036/0037
pending. No actual access/workaround, main/push/merge/deploy. P0/P8/full goal open.


## Financial command follow-through,2026-10-29

[Financial field/action map](../04-design/finance-command-recovery-local.md)
reconciles all five existing command bodies and selected form/confirmation homes.
Actual originating M/A, strict cloned intent, original key/callback, exact receipt/
current proof, explicit current acceptance and post-handoff draft acceptance
replace fingerprint-only ownership. Private denial, stale submits and sticky
unknown409 are covered; recovery departure retains its existing warning.
915 frontend units pass,25 added; lint/types/build/history/static app lint6 pass.
Two native cases prepared/typechecked, not run. Backend unchanged/not rerun;
remaining exact domain reconciliation and legacy selectors continue. Actual
ledger/SQL/native/concurrency/device/security/AFTER/CI/product acceptance and
migrations0036/0037 pending. No actual access/workaround, main/push/merge/deploy.
P0/P8/full goal remain open.


Required source follow-through: Finance creation checks but does not advance its
Deal version, while backend retry receipts expire after24 hours. Source review
therefore identifies a possible duplicate creation on replay after pruning if
the parent counter is unchanged. Durable or authoritative safe creation replay
must be reconciled before readiness; the current immediate-retry frontend cases
are not retention-expiry/ledger proof. No backend retention policy changed.


## Financial creation expiry follow-through,2026-10-29

The preceding source risk now has a timestamped first-application guard and
scoped no-store issuance, preserving24-hour receipts, retained legacy replay,
ordinary Deal counters/history and all M/A authority. The proposed five-minute
start window is not a new business retention policy. Unknown original body/key
cannot be replaced after expiry. [Contract](../04-design/finance-creation-keys-local.md).
927 frontend/572 connection-forbidden backend units pass; build/history exit0,
lint/type terminal output retained. Three SQL/one native cases prepared, not run.
Actual SQL/ledger/concurrency/native/device/security/CI/AFTER/product acceptance,
Ruff/mypy, exact remaining domain/context and old selectors remain pending.
No actual access/workaround/migration/main/push/merge/deploy. P0/P8/goal stay open.


## Finance native-review preparation follow-through,2026-10-29

The known older Finance Chrome selector gap is repaired in source without
changing the selected application. One prepared review retains empty/invalid/
exact history/original correction, keyboard/touch, current conflict/recovery,
loading/denial/Agent, six widths,44px/4.5 checks and actual200% zoom. It now measures
the portalled drawer/confirmation rather than main, checks full-width cards and
preserves old evidence with15 fresh intended capture names. Focused lint/types
and AST checks pass; no native case/frame was executed/created. Prior production
checks remain retained. [Details](../05-quality/finance-native-reconciliation.md).
P0 other domain/context/selector work and P8 actual acceptance remain open.


## Property detail fields follow-through,2026-10-29

All24 strict detail keys map to selected labels/payload/formatter, with29 matching
amenity choices. A reproduced unrelated-room-edit loss now retains the accepted
saved orientation in payload/review; explicit current acceptance uses the fresh
fact. No extra control, design or backend rule.932 frontend/573 connection-forbidden
backend units, lint/types/build/history/static app lint1 pass. Two phone/desktop
native cases are prepared, not run. [Field map](../04-design/property-field-reconciliation-local.md).
Exact block-only selection/floor/review semantics, broader P0 context/selector work
and P8 actual SQL/stock/file/native/device/security/CI/AFTER/product gates remain.
No actual access/workaround/migration/main/push/merge/deploy. Full goal active.


## Hierarchy context follow-through,2026-10-29

The block-only save guard was already present and is now checked through the
actual owner, including corrected floor attachment and direct-programme intent.
Shared pickers now refuse shape-valid foreign/mixed-parent pages and restore
healthy scoped choices on retry, preserving counts/categories/paging/selection.
938 units/six added and frontend gates/static app lint1 pass. Two390/1440 native
cases prepared/typechecked, not run. [Context](../04-design/hierarchy-picker-context-local.md).
Backend unchanged/not rerun; actual SQL/native/device/security/CI/AFTER/product
acceptance and migrations0036/0037 remain. Continue exact Contact/Lead/Deal field
contexts, settings/job filters and aliases/old selectors. P0/P8/full goal stay open.
No actual access/workaround/main/push/merge/deploy.


## Canonical Contact edit field and command follow-through,2026-10-29

Full and inline coordinates now share original operation ownership, awaited
completion and fresh scoped read; metadata/version updates retain mounted drafts.
Contact/Owner/Prospect/Deal bindings carry current actor/role. Eight Contact, four
Enquiry and nine Deal inline groups are source-mapped without merging ownership
or provenance commands.949 frontend units pass; three native cases prepared,
not run. [Contract](../04-design/contact-edit-recovery-local.md) and
[evidence](design-migration-evidence/contact-edit-recovery-2026-10-29.json).
Continue exact settings/job/alias/legacy-selector review and P8; this is not full
branch or actual SQL/native/security/CI/AFTER/product acceptance.


## Canonical Contact alias projection follow-through,2026-10-29

Contact now uses its scoped canonical identity for saved projections, matching
Owner; two actual-workspace regressions prove the stale name/archive correction.
Different survivors refresh the original scoped root; same-counter fresh reads
still win.951 frontend units pass; one added native case prepared, not run.
[Contract](../04-design/contact-alias-projection-local.md) and
[evidence](design-migration-evidence/contact-alias-projection-2026-10-29.json).
This closes the located source projection gap, not all aliases/merge/permissions/
legacy selectors or P8 actual acceptance.


## Working-hours field and operation follow-through,2026-10-29

Capacity, all weekday/time triples, period/break actions and preview/save/compare
map to the selected drawer. Original administrator/proposal/hash/counter/key/
callback survive unknown saves; current completion and fresh comparison remain
separate. Parent outages retain drafts.961 frontend units pass; two new native
cases and one revised AT-40 source scenario remain prepared/unrun.
[Contract](../04-design/policy-command-recovery-local.md) and
[evidence](design-migration-evidence/policy-command-recovery-2026-10-29.json).
Backend unchanged; actual SQL/native/security/CI/AFTER/product and remaining exact
job/filter/alias/legacy-selector review are not closed.


## Contact ownership native-path follow-through,2026-10-29

Prepared helpers/scenarios now target actual selected two-tab Contact homes,
attribution disclosure and portal management/entry/assignment; no old tabs are
restored. Five ownership cases and one deal Contact timeline segment keep their
business assertions. ESLint/types pass, native cases unrun; wider seven helper
consumers and other selectors remain pending. Production unchanged; prior gates
retained. [Path map](../05-quality/contact-native-paths-local.md) and
[evidence](design-migration-evidence/contact-native-paths-2026-10-29.json).
No actual SQL/native/security/CI/AFTER/product or full-goal completion inferred.


## Export history/delivery follow-through,2026-10-29

Selected four columns/cards/complete totals/paging/polling remain. Known current
list denial/withdrawal cancels pending delivery; stale/read/hydration/disposed
handlers cannot dispatch. Actual actor/role and live client handoff are bound.
966 frontend units pass; two simulated metadata/held-permit native cases prepared,
not run. [Contract](../04-design/export-delivery-local.md) and
[evidence](design-migration-evidence/export-delivery-2026-10-29.json).
Backend unchanged; no real worker/private transfer/role-revocation/SQL/native/CI/
AFTER/product acceptance or wider job/filter/alias/legacy-selector closure.


## Owner form field/operation follow-through,2026-10-29

Eight canonical field groups, explicit M/A responsibility, new/existing choice,
owner-role addition/no-write opening, full edit and fresh compare choices map to
the selected form. Original operation and parent handoff remain owned through
interruption; host/metadata outages retain drafts without automatic rebasing.
977 frontend units and source gates pass. Three new native recovery cases plus
updated older owner/legal-owner paths are prepared, not run; broader shared
inventory consumers remain unaccepted. [Contract](../04-design/owner-form-recovery-local.md)
and [evidence](design-migration-evidence/owner-form-recovery-2026-10-29.json).
Actual SQL/native/device/security/CI/AFTER/product and remaining exact field/job/
alias/legacy-selector review remain open; P0/P8/full goal are not closed.


## Standalone inventory selected paths,2026-10-29

Seven native source scenarios and shared inventory helpers use selected sections,
right owners/offer/availability/Documents/history drawers, category radios and
property wizard unknown-result/fresh-comparison behavior. Three direct business
commands,6 timeouts and3 service-control calls remain unchanged. Focused lint and
types pass; native scenarios and the wider8 helper consumers remain unaccepted.
Production unchanged; prior977 frontend/573 backend gates retained. P0/P8/full
goal and exact remaining field/job/alias/selector work stay open.
[Path map](../05-quality/inventory-native-paths-local.md).
