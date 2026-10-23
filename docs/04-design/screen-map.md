# KAY screen map and navigation contract

2026-10-20 generated documents: `/leads/{id}/documents` and
`/deals/{id}/documents` open from a visible record-header action. A responsive
model list sits beside the editable prefilled preparation form; a separate
numbered history exposes private permit-bound PDF downloads. There is no new
global sidebar destination. Owner-supplied originals remain blank appendices;
working-draft and finance/notary cautions are visible. See
[generated documents](generated-documents.md).

2026-10-19 inventory creation refinement: `/projects/new`,
`/projects/properties/new` and programme-unit creation use three steps:
identity/type, relevant characteristics or context, then a confirmation summary.
Creation retains entered values when moving backward; edit forms stay direct.
Terrain and commercial units omit residential-only rooms; apartment units inside
a programme require an existing block, floor and reusable type. The wizard uses
only persisted schema fields; pricing, owners, files and campaigns stay on the
created record. `/projects/{id}` and
`/projects/properties/{id}` keep existing tabs/actions but use compact identity,
facts/files and side-by-side sale/rental regions; mobile stacks these surfaces.
No route, permission or inventory lifecycle changed. [Scoped evidence](../03-planning/inventory-design-refresh-2026-10-19.md).

D39 Projects override (2026-10-18): S10 `/projects` keeps standalone/programme
tabs and role-correct creation. Standalone uses warm category/offer/status rail,
automatic search/filter/reset, Cards/List, server sort and numbered pages.
Photo cards show actual clean protected previews, category/name/location and
separate current sale/rental campaigns; missing campaigns say « Aucune ».
Mobile collapses filters to the shared Sheet. Maison, archive and size remain
available; existing programme hierarchy/detail/offering/privacy routes remain.
[Scope and evidence](../03-planning/projects-reference-refresh.md).

D38 calendar override (2026-10-18): S09 `/visits` retains its route and create/
detail lifecycle. One compact toolbar selects the backend-resolved week, accessible
visits or private colleague busy intervals and Week/Agenda/Par type. The left
mini-month/type/status rail collapses to the shared filter Sheet; narrower screens
use the agenda automatically. Actual policy lunch windows and truthful scoped
full-week counts replace reference-only values. Building/people/car Iconsax
identify visit types. No new shell destination, fleet assignment or public details.
[Implementation and evidence](../03-planning/calendar-reference-refresh.md).

D37 account override (2026-10-18): S15 keeps numbered administrator-only users;
create adds a labeled initial-password field with private show/hide. Edit never
changes existing passwords implicitly. Reset accepts a chosen initial password
and current administrator password. Remove activation/handoff and disable
buttons; confirmed Delete hides/removes access, retaining CRM attribution.
First login goes directly to existing forced own-password setup, then fresh login.
No credential email sender or new navigation route.

2026-10-18 activity extension: S05 `/leads/{id}` adds a full-width, numbered,
type-filtered activity table and inline immutable-entry form. S08 `/deals/{id}`
adds its own activity table plus a separate read-only origin Lead table when
explicitly linked. Tables include notes, date, type, duration, direction,
historical project labels and original author; only the named table region
scrolls horizontally. Archive/current authority, existing Deal version history,
Riviera components and navigation remain. No new route/sidebar destination or
screenshot-only stage/delete action is introduced.
[Contract and evidence](../03-planning/lead-deal-activities.md).

D35 (owner-requested IMMO World Lead/Deal alignment) supersedes the earlier
free-title/no-conversion page behavior. `/leads` and `/deals` use compact inline
toolbars and rich configurable tables; the Contacts and Projects rail remains.
`/leads/new` and `/leads/{id}/edit` show canonical client fields beside country/
nationality/languages and qualification. The calling code is selected, not a
free prefix field. `/leads/{id}` offers explicit project/budget/intent conversion
or the saved deal link after conversion. `/deals/new` supports qualified new or
existing clients. `/deals/{id}` retains its paired facts and operational sections,
with direct form edit mode and saved client/qualification history. No arbitrary
deal-title prompt, duplicated client, empty permanent summary column or automatic
stock reservation is introduced. Existing scoped files/work/proposal/outcome/
finance actions remain. [Current evidence and limits](../03-planning/leads-deals-immoworld-alignment.md).

D34 (2026-10-16) supersedes the historical read-only-agent descriptions below:
active agents can create/edit developments, briefing, hierarchy/types and physical
property/unit facts through the existing Projects routes and controls. Legal-owner,
inventory-file, offering/availability, external stock and archive/restore controls
remain M/A-only. Private contacts keep their independent current-scope checks.

SP-20 adds /website-simulator as a synthetic form rendered through the separate
https://127.0.0.1:8001 server; it is not staff registration or a new CRM navigation
entry. Anonymous receipt/status replaces the form. Existing S03/S05 Leads filter
and detail label source “Site web”; contact history identifies the actual web
source. Authorized current staff scope is unchanged.
[Flow/security](website-intake-local.md), [UI evidence](../03-planning/sprints/sp-20-execution.md).

SP-19 adds header Recherche globale (explicit query/kind, safe count/numbered
results), M/A Leads/Contacts export confirmation and /leads?view=exports,
reasoned property/development overview archive/restore and archive list filters.
Dashboard?view=audit gives M/A safe numbered event/actor access; Settings stays
admin-only. Unit-type search links apply unit_type_id to programme units.
[Behaviour contract](discovery-contract.md),
[actual technical/UI evidence](../03-planning/sprints/sp-19-execution.md).

Status: accepted local placement; SP-03–SP-20 scoped screens implemented and technically verified; product reviews/later screens pending
Date: 2026-10-16  
Confirmed decisions: login first, role-scoped dashboard, left navigation for Dashboard/Leads/Deals/Visit Calendar/Projects/Settings, lead as `enquiry`, project briefing optional, administrator-only user and visit-schedule settings.  
Technical proposals: implementation details and final generated route count; local placement/defaults are selected by D29 and the 22-sprint roadmap.  
References: [decisions D23–D25](../../decisions.md), [scope C01–C13](../../core-scope.md), [permissions](../../permissions.md), [business rules](../02-requirements/business-rules.md), [API](api-contracts.md), [UI components](ui-components.md), [design system](design-system.md), and [acceptance tests](../05-quality/acceptance-tests.md).

The original request estimated 19 pages and named 17 screen families. The approved local sprint plan now places the remaining core workflows contextually and selects project units as a detail tab. Implement the named families and support views below, then record the actual route manifest; no artificial page quota or further routine choice is required before local implementation.

## Visual reference and unpictured screens

Use the current [design system](design-system.md), [DESIGN.md](../../DESIGN.md), Riviera branding and the owner's later screen-specific references for appearance across existing screens, tabs, dialogs and contextual panels. Keep every supported field/action and the existing role/business rules; illustrative screenshots do not add backend capabilities. The former nine-image reference was removed under D41.

## Entry and navigation

SP-08 adds `/projects/new`, `/projects/[id]`, `/projects/[id]/edit`; Projects'
programme tab now lists real developments alongside the preserved standalone
tab. Detail tabs are Aperçu/Unités/Blocs et étages/Types réutilisables/Présentation/
Propriétaires/Offres du programme/Historique. `?tab=units` defaults to available
physical units; safe block_id/floor_id links retain the selected hierarchy path.
Paged level pickers and numbered unit rows avoid an unbounded tree. Unit creation
is contextual inside the units tab and opens the existing physical-property
record, with programme/block/floor breadcrumbs. Types have no offer/stock controls.
M/A manage hierarchy, safe links, optional plain briefing and separate whole
campaigns; agents read shared facts without implicit private contact access.
Files remain SP-09. See [SP-08 evidence](../03-planning/sprints/sp-08-evidence.md).

SP-07 support routes: `/projects/properties/new`, `/projects/properties/[id]`,
`/projects/properties/[id]/edit`. Detail uses Aperçu/Propriétaires/Offres/Historique
tabs. Agents read safe facts; new/edit URLs and direct mutations enforce M/A write
authority. Owner display is separate from protected identity. Campaigns retain
original terms and exact annual comparison. No file transfer or development
availability is claimed. See [SP-07 evidence](../03-planning/sprints/sp-07-evidence.md).

An unauthenticated visitor sees login. A normal successful sign-in goes to `/dashboard`; a temporary-password session goes to `/change-password` and remains restricted to the allowed auth routes. An authenticated visitor opening login follows the same credential-state check. Expired/revoked sessions return to login with a validated internal return path and no private data in the URL. A successful temporary-password change requires fresh login as specified by the API.

The authenticated shell has a left sidebar: **Dashboard, Leads, Deals, Visit Calendar, Projects, Propriétaires, Settings**. On narrow screens it becomes an accessible navigation sheet. `Settings` is visible only to administrators for the currently named settings, because managers and agents cannot manage users or scheduling policy. Hiding a link is not authorization; the server checks every request. Navigation labels are French in the product. Shadcn/ui supplies standard controls, Tailwind CSS styles them, and Bklit UI supplies dashboard charts under [D15–D17](../../decisions.md).

## Named screen families

The following English-slug paths and contextual placements guide local implementation. Shared create/edit forms can serve their distinct URLs; pages do not create extra domain tables.

| ID | Screen / proposed route | Main content and actions | Access |
|---|---|---|---|
| S01 | Login `/login` | Email/password, validation and safe error, password-change handoff when required. | Public entry; active credentials only. |
| S02 | Dashboard `/dashboard` | Agency KPIs, activity, alerts, and drill-downs. Manager/administrator see agency-wide permitted data; agent sees only their assigned/primary or collaborative work, with the same scoping on totals and links. The separately shared Projects inventory does not make agency-wide dashboard totals visible to agents. | Authenticated, server-scoped by role. |
| S03 | Leads list `/leads` | Search, filters, numbered pages, configurable visible columns, create lead action, lead row link. A lead is an `enquiry` linked to a `contact`; the list never turns one contact with several enquiries into duplicate identities. | Manager/administrator: agency; agent: assigned/collaborative scope only. |
| S04 | Lead create/edit `/leads/new`, `/leads/[id]/edit` | Reuse or create the contact by normalized phone under duplicate rules; record the enquiry source and message, then edit permitted enquiry fields. The two URLs may share one form implementation. | Manager/administrator, or agent where contact/enquiry scope allows; assignment remains manager/administrator-only. |
| S05 | Lead detail `/leads/[id]` | Enquiry facts, permitted contact summary, related requirements/activity, edit action, and **Create deal** linking to S07 with the permitted contact/enquiry context prefilled. | Same scoped read; no private-contact leak. |
| S06 | Deals list `/deals` | Search, filters, numbered pages, configurable columns, stage and assignment summaries, create action. | Manager/administrator: agency; agent: their permitted contact deals. |
| S07 | Deal create `/deals/new` | Contact selection or prefill from S05, optional requirement/offering, initial stage, next action, validation and duplicate-safe save. This is one deal form reached from Leads or Deals, not two unrelated deal-creation pages. | Manager/administrator or contact-scoped agent. |
| S08 | Deal detail `/deals/[id]` | Pipeline, customer offers, visits/tasks, reservation and outcome, true-actor history; financial controls only to managers/administrators. Reopen and stock conflict states follow the existing contracts. | Manager/administrator or contact-scoped agent. |
| S09 | Visit calendar `/visits` | Calendar, visit create/edit/reschedule, three visit types, colleague free/busy, capacity and out-of-hours feedback, overlap warning with reason, reminders. Office visits may be booked at any time. | Authenticated; private visit detail remains scoped. |
| S10 | Projects list `/projects` | Standalone and programme tabs: category/reference/name/location and campaign filters, safe separate campaign facts, actual unit counts and numbered pages. | All active staff read and create/edit facts (D34); other inventory commands M/A-only. |
| S11 | Project detail `/projects/[id]` | Non-secret facts, location, safe developer/owner display, separate whole-development offerings, optional briefing, bounded block/floor/type tabs and links to actual units. Shared attachments remain SP-09; protected contact details/documents require separate contact access. | All active staff edit facts/briefing/structure (D34); owners/files/offers/lifecycle M/A-only. |
| S12 | Project units tab `/projects/[id]?tab=units` | Default to available physical units, then filter by block, floor, type, category and offering kind; distinguish each actual unit from its reusable type and whole-project offerings. | All active staff create/edit physical-unit facts (D34); stock and availability M/A-only. |
| S13 | Project create/edit `/projects/new`, `/projects/[id]/edit` | Creation is a three-step programme wizard for identity, location/context and review; edit remains a direct form. Hierarchy, ownership and offerings are managed after creation. Incomplete drafts remain possible under H-01/H-02. | All active staff create/edit facts/briefing (D34); developer-contact scope still required. |
| S13a | Propriétaires `/owners`, `/owners/new`, `/owners/[id]`, `/owners/[id]/edit` | Scoped owner-contact directory, private contact details, current and former legal links to physical properties and whole developments, contact timeline, create/edit using the canonical contact identity. Asset links open their existing inventory detail/history; ownership is changed only from the inventory record. | M/A: all contacts; agent: current primary/collaborative contact scope. Shared inventory grants no private owner access. |
| S14 | Settings hub `/settings` | Entry to All Users and Working Hours. Do not expose an empty settings page to non-admin roles. | Administrator only for the currently named settings. |
| S15 | All Users `/settings/users` | Numbered users with role/state, create/edit/reset and confirmed Delete. Delete hides/revokes access and retains historical attribution. No activation/handoff action or API credential response. | Administrator only. |
| S16 | User create/edit `/settings/users/new`, `/settings/users/[id]/edit` | Named account and role; create accepts a chosen initial password, active immediately with forced own-password setup. Edit never implicitly changes existing credentials. | Administrator only. |
| S17 | Working hours `/settings/working-hours` | Edit active weekdays, working intervals, lunch breaks and agency-wide company-car visits-per-hour (initially 2); preview impact on existing future visits before save. | Administrator only; others may read safe availability through the calendar API. |

The optional briefing is inside project detail/create/edit (detail tab `?tab=briefing`), and units use the selected S12 tab. Accepted local Q-08 retains all core workflows using these support contexts:

| Support ID | Placement / route | Work and authority |
|---|---|---|
| SC01 | `/change-password` | Restricted temporary-password flow; own password change and required fresh login. |
| SC02 | Contacts view `/leads?view=contacts`, contact detail `/contacts/[id]` | Full contact identity/edit, enquiries, requirements, timeline, notes and collaboration; S or M/A scope. Shared contact-create form/dialog is also used by lead/owner selectors. |
| SC03 | Standalone view `/projects?view=properties`; `/projects/properties/new`, `/projects/properties/[id]`, `/projects/properties/[id]/edit` | All active staff create/edit standalone and actual-unit facts under D34. D43 requires one positive sale/rental asking price in the creation wizard, saved as an initial draft offering; this is the sole agent offering exception. Detail and cards show current sale/rental prices separately. The same detail/edit supports safe hierarchy breadcrumbs. Owners/files/other offering writes/availability/lifecycle remain M/A-only. |
| SC04 | Dashboard and contact/deal detail panels | Today's/overdue tasks and notifications; follow linked record scope. |
| SC05 | Deal detail finance tab | Optional commissions and receipts; manager/administrator only. |
| SC06 | Leads import/export actions and contextual flows | Manager/administrator bulk operations, atomic import and protected export. |
| SC07 | Contextual global search dialog and `/dashboard?view=audit` | Scoped search; security audit for administrator/operational manager, never agent. Account/work-time Settings stay administrator-only. |

These placements are selected for local sprints; [the sprint index](../03-planning/sprints/README.md) records implementation ownership. They add no unpromoted future capability. Recovery and the local website simulator are support tools rather than top-level staff navigation pages.

## SP-05 implemented placement

S03–S05 now run on `/leads`, `/leads/new`, `/leads/[id]` and
`/leads/[id]/edit`; SC02 runs on `/leads?view=contacts` and `/contacts/[id]`
(identity editing inline). Each page rechecks identity on the server; API scope
is authoritative. Lead edit changes only message/status; shared identity fields
are edited on the contact. Name/type, multiple international phones/emails and
primary choices, contact roles and retained provenance are real fields, not
placeholders. M/A can choose an active responsible agent or manager-queue enquiry;
agents cannot change another owner. Private-number denial shows only the
responsible display name; accessible duplicates use explicit confirmation.

Leads have scoped search/status/source/date/assignment filters, stable numbered
pages, visible-column/order Sheet and ID-only local preference storage. The wide
configurable table is an explicitly labeled focusable horizontal scroller on
mobile, not page overflow. Forms reflow to one column, retain recoverable drafts
and show explicit current-vs-draft version choices. At the SP-05 boundary,
collaboration/history remained explanatory text; SP-06 implements them below.
Requirements and Create Deal remain later work, not enabled or dead controls.
The complete screen catalogue above is not a claim those later modules exist.

## SP-06 implemented placement

SP-06 implements SC02's Identity, Enquiries, Timeline and Assignment tabs on the
same `/contacts/[id]` page. French UI labels are Identité, Demandes, Historique,
Attributions. The context name stays visible outside the tabs. Managers/admins
manage responsibility, explicit collaborator grants, reversible archive/restore
and enquiry queue recovery; scoped agents can add immutable notes/manual entries
and confirm a same-scope merge. Preview names the source/survivor, responsible
agent after the operation, retained/lost/gained scope and real enquiry impact.
Archive filtering is M/A-only in Contacts within Leads. Old merged URLs resolve
only under survivor scope; invalid/private/old-agent reads show the same denied
state. No route, control or fabricated count claims future deals/requirements/
tasks/visits/documents are implemented. See [SP-06 evidence](../03-planning/sprints/sp-06-evidence.md).

## SP-10 contact qualification

Contact detail adds Recherches; Lead detail composes the same RequirementPanel
below enquiry facts. No new route/navigation section. Each search has its own
title, purchase/rental intent, original MAD budget/period, required/preferred
criteria with explicit unknown values and an exact-offering shortlist. Inline
forms distinguish null from0/false and retain failed input; stale versions show
current facts before an explicit reload/replace choice.

The selector labels Bien indépendant, Unité physique and Programme entier,
retains original rent/conditions and shows exact annual equivalents. Search,
category, target level, status, money, area/rooms and paginated programme/block/
floor/type filters act on safe inventory. Types filter actual units, never become
stock. Manual feedback/removal applies only to this requirement and reserves
nothing. Current authorization remains server-owned.

Loading/empty/filtered-empty/error/denied/conflict/read-only/success/pending states
are explicit. Archive retains permitted M/A reads with no mutation controls;
merge retains independent searches under survivor scope. Mobile reflows fields/
actions, long labels wrap, and keyboard focus returns after creation/editing or
removal. Future deals remain SP-11. Earlier SP-05/06 descriptions are historical,
not a claim requirements are still unimplemented. Scoped actual results:
[SP-10 evidence](../03-planning/sprints/sp-10-evidence.md).

## List and state rules

Lead and deal lists must perform authorization **before** search, filtering, counts, sorting and pagination. Proposed lead filters: enquiry status/source, responsible agent where permitted, and received date; proposed deal filters: stage, responsible agent, offering kind and updated date. Project filters follow the existing hierarchy and availability contract. Column selection changes presentation only; it cannot fetch or reveal a field the role cannot read. Persisting a user's column layout across devices is a later design choice, not a new backend requirement. All lists keep stable numbered pages, Next/Previous, and loading, empty, filtered-empty, denied, error, and stale-data states.

Use the same contact identity across leads and deals. A lead detail may prefill deal creation, but creating a deal is a separate explicit action; it does not automatically convert, remove or close the enquiry. Every screen follows the [design system](design-system.md), the mandatory [component](ui-components.md), [styling](styling.md), and [chart](charts.md) rules, and the C13 accessibility checks.

## SP-09 implemented attachment surfaces

S05/contact Documents and S11/development or property Aperçu reuse one
`FilePanel`; no new top-level route/navigation or chart. Contact files require
current private scope, including metadata. Inventory attachments are team-readable
and M/A-writable; legal-owner/developer evidence stays on private Contacts.

French shadcn file-picker/submit, numeric transfer progress, interrupt/resume,
pending quarantine, clean/rejected verdict, recoverable scan error/retry,
clean-only image preview/download, numbered pages and archive confirmation are
implemented. Empty/loading/denied/error states retain the existing record shell.
On property details, a separate Photos section shows the active 10-photo count,
clean-only private previews, WebP conversion/upload progress and archive/retry
controls. Selecting a clean photo opens a full-size private viewer with previous/
next buttons, Left/Right keyboard navigation and Escape to close; focus returns
to the selected thumbnail. Pending or rejected photos cannot be opened. Agents
can view clean photos but cannot upload or archive. Existing
property image attachments appear as photos; non-image files stay in Pièces
jointes. Programmes have their existing attachment panel; the 10-photo cap is
per physical bien, not shared across the programme.
Switching parent resets transient upload state; native picker selection and
dialog/archive focus recovery must pass keyboard, touch and zoom checks.
See [SP-09 evidence](../03-planning/sprints/sp-09-evidence.md) for actual visual
and browser results, separately from Khalid's pending product review.

## SP-14 implemented surfaces

S09 is `/visits`, `/visits/new` and `/visits/{id}`: a seven-day desktop calendar,
chronological mobile agenda, scoped visit detail/history and explicit booking,
rescheduling, confirmation, result and cancellation. A colleague mode reveals
only CRM busy intervals. Server-resolved Casablanca times handle ambiguous and
nonexistent hours without trusting client timezone data. Capacity preview is not
a reservation; overlap explanations cannot override work/lunch/car restrictions.
S17 links administrator-only `/settings/working-hours`: weekday work/lunch rows,
positive company-car capacity and reviewed future-visit impact before save.
Retained errors/drafts, stale-version comparison and terminal/archive read-only
states follow [the local contract](visit-scheduling-local.md). Required technical
evidence and separate product review live in [SP-14 execution](../03-planning/sprints/sp-14-execution.md).

## SP-13 implemented surfaces

S08 keeps the current `/deals/{id}` record and adds explicit won/lost/cancelled
and reopen actions between reservation and ordinary pipeline, with immutable
outcomes below. S11/S12 and standalone/unit inventory retain their routes; each
eligible campaign exposes manager-only external results and safe occupancy/review
states. No navigation redesign or automatic commission step is introduced.
See [outcomes contract](outcomes-local.md) and
[execution evidence](../03-planning/sprints/sp-13-execution.md), including passing scoped gates and separate pending product review.

## SP-11 implemented surfaces

S05 now links explicitly to the single S07 create form with permitted contact/
enquiry context; S06 also reaches it through contact selection. Contact Affaires
and research/shortlist actions reuse it. S06 has scoped stage/current-responsible
filters, dates, kind, stable numbered pages and ID-only columns. S08 includes
pipeline skips, editable next action/context, separate customer proposals,
true-actor snapshot history and inherited private attachments. Archived contacts
are read-only for M/A. Future reservation/close/visit/task/finance commands are
explanations, not enabled stubs. [Local contract](deal-pipeline-local.md) and
[execution record](../03-planning/sprints/sp-11-evidence.md) define actual scope;
earlier “future deals” descriptions above are historical sprint boundaries.

## SP-15 implemented screen extension

S02 displays scoped Today/Overdue work (plus other explicit task filters),
a personal internal inbox/read filter and unresolved ended-visit follow-up.
S05 contact detail gains a Tâches tab; S08 deal detail gains inline task controls.
Task deep links select the existing record context using ?task=UUID, with
current-scope denial before private facts. Create/edit is inline; complete/cancel
uses the existing explicit confirmation. Failure drafts and retry identity are
retained; stale versions require deliberate comparison.

S09 reschedule/cancel/complete changes invalidate old reminders; follow-up opens
the same visit, never an implicit duplicate. Existing French shadcn/Tailwind
tokens/layout are preserved. No new navigation destination, KPI/chart, external
send or calendar integration is introduced. [Contract](tasks-reminders-local.md),
[verification](../03-planning/sprints/sp-15-execution.md).

## Authenticated live updates (2026-10-22)

The shell owns one WSS connection/tab and a scoped live unread bell. Existing
views keep numbered pages, filters and scroll while queries refetch quietly.
Dirty record input defers replacement with a French notice. /notifications is
the protected inbox destination for generic push alerts and the opt-in/out
control, not a new public registration route. Ordinary refresh controls remain
until the hosted gate/release flag; outages restore them. Retry, conflict and
availability-review controls stay. [Contract](realtime.md).

## SP-16 local S08 extension

The existing deal detail /deals/{id} keeps ordinary agent workflow unchanged.
M/A alone receive Dossier/Finance tabs; ?tab=finance selects that existing record
view, not a new navigation destination. Optional terms, separate recognition,
partial receipts and motivated original-preserving corrections are inline with
explicit confirmations and current balance. Agent UI/API has no finance facts.
Failure drafts remain; stale versions require comparison. Normal closing never
requires a commission. [Contract](commissions-local.md),
[verification](../03-planning/sprints/sp-16-execution.md).

## SP-17 local S02 extension

The existing /dashboard keeps readiness, work, inbox and visit follow-up panels.
Reports add current/period definitions, date selection,13 scoped indicator actions,
three Bklit chart/table pairs and inline numbered drill-downs. Managers/admins
see permitted agency data; agents only accessible work and exact linked stock,
without collections. Current30/14-day alerts have independent filters/pages and
never change inventory or deal state. Failed reads remove report facts while
retaining selected server dates and the shell. No new navigation destination.
[Contract](dashboard-local.md), [verification](../03-planning/sprints/sp-17-execution.md).

## SP-18 local S03 extension

M/A Leads toolbar opens /leads?view=import; batch=UUID restores a protected
numbered preview/report in that same view. Agents see neither the action nor
private batch data. The shared French shell contains file/format guidance,
transfer progress/cancel/retry, skipped/error row details, inline per-row and
fallback active-agent choices, new preview and explicit whole-batch confirmation.
Dirty/invalid input blocks approval. Result reload and uncertain approval recovery
preserve the durable batch/key; a corrected file creates a new batch rather than
overwriting evidence. Created-contact links use normal current contact scope.
No sidebar destination, inventory import or chart. Narrow rows stack within
the existing Tailwind/shadcn control geometry.
[Contract](contact-import-local.md), [verification](../03-planning/sprints/sp-18-execution.md).
