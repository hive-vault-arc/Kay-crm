# Selected KAY workspace migration: execution

Updated: 2026-10-27
Branch: `codex/redesign`
Base/main: `e0bdc09feed0c3920b63cda635e5cf4cf42e08b1`
Plan: [selected-design migration](design-prototype-migration-2026-10-25.md)

## Current owner instruction

The owner authorizes sustained implementation until the redesign branch is
finished. Final verification/product approval follows that implementation;
merging remains explicitly gated. Routine technical checks continue during
implementation. Native review is not a reason to stop unrelated source work,
and its absence must never be reported as a pass.

The prototype's current appearance and intentional UX organization remain the
target. Missing real capabilities fit that design. Backend authority and
private data/file rules stay intact. No demo data is migrated into the CRM.

## Progress

| Phase | Source state | Remaining acceptance/work |
| --- | --- | --- |
| P0 reference/coverage | Frozen snapshot and starting inventory prepared; source unchanged; command/field reconciliation ongoing | Complete per-domain coverage and genuine conflict resolutions |
| P1 foundation | Committed `fed7ded`; selected theme, Inter/assets, controls, shell/auth and Contacts entry; later batches extend to62 source-pinned glyphs and selected status palette | Native review later |
| P2 shared interactions | Shared compact directory/record headers, responsive cards, retained lazy tabs, sections, drawers, one-at-a-time inline fields and click/unload draft guards implemented | Remaining inventory/work/admin form parity, Back/Forward handling, responsive focus and native interaction checks |
| P3 Leads/Contacts | Contacts2-tab overview/activity, dossiers below responsibility, supporting drawers; Leads4-tab detail/status picker; Lead/Contact/Deal directory cards and compact tool placement; desktop-only paged Kanban, per-value editing and full Contact/Lead create/edit sheet implemented | Remaining document parity, browser selector migration and native review |
| P4 inventory/owners | Selected compact image cards, programme2-tab/standalone dossier, Units filter drawer, right-side Patrimoine and clickable short steppers implemented; typed mixed-programme query correction | Remaining exact hierarchy/owner/photo form presentation and native review |
| P5 Deals/finance/PDF | Deal4-tab workspace, ordinary/status/reservation/outcome menu, per-value editing, full create/edit sheet and role-gated Finance drawer composed from real controllers | Remaining exact offer/PDF layouts and provenance; final native security/stock/focus checks |
| P6 work/schedule | Task/notification entries plus selected day-column calendar, drawer filters, phone agenda, date-only booking, grouped task/activity forms plus routed visit drawers and retained calendar implemented; current commands retained | Prepared separate general Notes storage/API/history (migration0036 unapplied); inbox refinements and native workflow review |
| P7 remaining surfaces | Help/settings/dashboard compositions plus desktop search preview, phone search Sheet and authenticated full-result page wired to real current scoped APIs | Prepared-PDF search parity; remaining report tools/audit/jobs and directory refinements; native/full-stack/product review |
| P8 final verification | Pending owner-directed after-implementation stage | Native/full-stack/visual/accessibility/CI gate |
| P9 merge | Not authorized yet | Owner confirmation of final verified candidate |

## Foundation batch

- Central selected-workspace light/dark/geometry/motion tokens preserve the
  existing semantic Tailwind/shadcn API. Historical Riviera exports remain for
  provenance; they no longer dictate the selected appearance.
- Actual CSS cascade inspection found the final rail width96px, overriding an
  earlier76px declaration. Geometry and color variable namespaces are separate
  so `header`/`sidebar` color roles cannot accidentally become lengths.
- Copied the exact Inter Variable, KAY wordmark and atmosphere assets from the
  selected reference. Retained original font/icon licenses. Runtime theme
  preference is an allowlisted non-sensitive cookie, unrelated to authorization.
- Replaced the former large gold sidebar/illustration and duplicate account
  placement with the selected compact icon rail/global bar and account popover.
  Existing session monitor, live updates, scoped search, inbox and logout remain.
- Added `/contacts` through the existing authenticated ContactDirectory and
  current real role. The old `/leads?view=contacts` remains available. Safe return
  paths admit only the new exact internal route, not arbitrary URLs/query input.
- All45 existing semantic icon exports now resolve to the selected frozen
  visual family, plus5 theme/help/owner aliases. Source shapes are hash-checked
  in the typed icon layer, with full original notices; package/direct-SVG
  checks remain enforced. No icon runtime dependency was installed.
- Shared controls now use the selected graphite/soft/pill treatment. This is
  not a claim that unchanged feature layouts already match the prototype.

## Actual checks and retained corrections

- First type check passed. Initial lint found a new theme-trigger icon mapping
  and an unused type-only tone table; these were corrected without weakening
  inventory enforcement.
- Initial frontend units passed103. The three added workspace checks first
  exposed that the server test compiler did not parse TSX. It now receives the
  actual filename and React JSX transform; all106 frontend units then passed.
  Added actual React SVG/accessibility/export coverage; all107 now pass.
  These include real facade/contracts plus appearance and authenticated-route
  checks, not native UI or database/browser acceptance.
- The first production build compiled, then failed a security guard because
  the installed Next version was16.4.0 while package/lock pinned16.4.2. Do not
  count that build as passed or follow its instruction to retry past the warning.
- `npm ci` installed the existing lockfile; installed Next is now16.4.2, with
  package manifests/lockfile unchanged. Install audit reports0 vulnerabilities.
  Existing ESLint deprecation and unapproved optional resolver-install-script
  warnings were reported; no blanket install-script approval was issued.
- Final batch lint passes, including50 semantic icons/0 violations and380
  Button sites/0 violations. Type checking passes. Frontend dependency security
  check reports runtime0/full0 vulnerabilities and0 exceptions.
- Following the final glyph/field refinements, fresh lint, type checking,
  all107 units and the pinned Next16.4.2 production build pass. The prior build
  terminal result was unavailable after context rollover; the fresh final build
  exited0. Scope, command results and source hashes are saved in
  [foundation evidence](design-migration-evidence/foundation-2026-10-26.json).

## Boundaries

No backend rule, real account, database, worker, scanner, private file,
production/deployment or main-branch operation has changed. The pre-existing35
local lessons additions and untracked motion-plan note remain separate work.

No browser/CUA/CDP/HTTP app inspection or workaround was performed. Existing
browser-access restriction and unavailable original-machine mandatory skill
files remain recorded. Native fidelity/input/zoom/accessibility, real-stack
security, AFTER audit and product acceptance are pending; source/model checks
do not establish them. The owner selected final verification after implementation.

## Shared interactions and first records batch

Source implementation now uses the selected compact headers, pearl dossier and
support rail, internal section rules and44px pill tabs. Contacts has only Aperçu
and Activités. Dossiers liés sits below Responsabilité; Recherches opens its
existing authoritative panel. Tasks/documents/management use supporting drawers,
with the actual versioned forms, file permits and confirmation flows retained.
Leads has Aperçu, Projets, Activités and Documents, with shared contact facts and
compact grouped status options. Direct edit/document routes remain available.

The selected status palette is frozen separately, including the owner’s later
soft badge surfaces and light/dark variants. The same `new` wire identifier has
an explicit deal context so Nouvelle does not inherit Nouveau’s rose surface.
All51 glyph shapes remain source-hashed; no package dependency was added.

Directory headers no longer use the coastal hero. Phone search/filter controls
are icons opening a real Sheet; utilities use the current compact popover. Real
numbered result sets become short entity cards on phones, retaining selection
in the table controller. Détails shares the metadata row rather than occupying
an unconditional extra row. Linked projects have a shared hover region and
separation between entries. Contact/activity mobile presenters retain the full
authored details rather than discarding fields to shorten the preview.

Visited record panels stay mounted; unvisited panels load lazily. New guarded
drawers distinguish cancellation from successful closure. Click navigation and
reload/unload use the shared dirty boundary; tracking also works when live
updates are disabled. Discard releases deferred nonmutating live refreshes.
Back/Forward interception and responsive focus restoration remain explicit P2
work, not inferred passed behavior.

The lead status command uses the existing full edit schema and PATCH facade.
It snapshots the reviewed version and other lead fields, preserves the same
retry key after an interrupted result, and never sends contact/source/assignment
replacement fields. A missing required budget is qualified before confirmation.
Existing backend authorization remains authoritative. No backend/schema changed.

Two interface adaptations are proposals necessitated by current read contracts:
the CRM pages contact-linked prospects and affairs separately, so Dossiers liés
keeps two accurate pagers instead of inventing a merged page; visits uses an
explicit month and its current total, with initial civil date and both month
boundaries resolved by the existing Casablanca backend endpoints. Neither is a
new business rule or an unbounded portfolio/visit count.

Validation: lint passes with51 semantic icons and392 Button sites, zero inventory
violations; fresh type checking passes; all111 frontend units pass; pinned
Next16.4.2 production build passes. Four new synthetic interaction cases cover
navigation exclusions, reviewed-version/retry preservation, retained tab drafts
and cancel/busy/discard behavior. No browser or real-stack pass is claimed.
The first lint run caught a render-callback/ref boundary in the drawer; the
handler now resolves its unique content element when invoked, without disabling
the React rule. [Batch evidence](design-migration-evidence/records-2026-10-26.json)
records scope and source hashes. Historical browser selectors still expecting
eight Contact tabs require migration during the remaining implementation.

## Next work

Continue the inventory/owner slice and remaining shared inline/form/PDF patterns,
preserving the current typed services and current authority.
Use the coverage ledger to prevent omission of a moved or less-visible action.
Do not stop at a token-only restyle or call the whole branch complete while
feature layouts remain unported.

## Deal workspace batch

After `ac2001e`, the Deal record uses the same4-tab dossier and natural support
rail as Leads. Next action/tasks, visits and M/A-only Finance are on the support
side. Contact facts, qualification, notes, linked offer and client proposals stay
in Aperçu; linked projects and both activity histories have their own sections.
Documents retains the existing protected file panel and PDF route. Existing
comparison, archive ownership, live snapshot reconciliation and editing remain.
Twenty-row directory defaults now match the selected prototype, within the
existing bounded numbered API; optional larger sizes remain available.

The compact stage menu snapshots ordinary transitions and delegates reservation,
release, close and reopen to the existing ReservationPanel/OutcomePanel commands.
Their dialog-only entry reuses the original versioned payload, stock review,
confirmation, required reasons and retry identity; it adds no alternate mutation
path. Outcome dialog entry loads the authoritative existing stock-review endpoint
and aborts its read if closed. Menu/dialog focus ownership and return targets are
explicit. Eight more selected source glyph aliases distinguish file, blocked,
failed, new/qualified/rejected contact, handshake and flag states; registry59.
The document action now uses FileText rather than the empty-state Search glyph.
Badge/fact styling also applies to Radix portals outside the shell DOM.

All112 frontend units pass. The additional Deal menu case checks stock-action
delegation, reviewed-version preservation after a newer projection, failed retry
draft retention, terminal reopening and read-only presentation. Lint passes with
59 icons/394 Button sites/zero violations. The pinned Next16.4.2 build, including
fresh TypeScript, passes. [Deal batch evidence](design-migration-evidence/deals-2026-10-26.json)
records source hashes and the scoped security review. No backend/DB/native pass
or completed whole-branch fidelity is implied.

## Inventory and owner batch

Programme and standalone property records now share the real dossier header,
top Documents/Modifier actions and natural-height Photos/Propriétaires rail.
Programme keeps Aperçu/Unités; property facts, present listing details and offers
stay together. Every listing field is accounted for; zero floors/garage values
remain visible. Offer creation sits beside its section heading and delegates to
the existing versioned commands. Protected party names still require the current
Contacts projection. No photo count or commercialisation state is invented.

Units uses a short search/action row and a criteria drawer; all current category,
offering, block, floor, reusable type and archive filters remain real and bounded.
The existing available-offers default is retained and labeled. Unsupported
prototype unit sort/price criteria are not shown as fake controls. Project cards
use the selected280px auto-fit grid and80px left image on phones. Phone Projects
always uses cards while retaining the desktop view selection. Owners keeps one
Patrimoine area on the right with retained current/past pagers, no duplicated
main tab and no zero-result pager.

All inventory steppers use the selected quiet horizontal track, short labels and
number circles. Every step is directly reachable without committing or clearing
drafts; final save still validates skipped sections. The shared Button inventory
admits only this specifically identified numeric step control as a reviewed data
control; other action/icon requirements remain enforced. Controlled record links
also retain their outgoing visited panel.

One source draft initially applied an overly broad manager flag. It was corrected
before commit: D34 active agents retain programme facts, hierarchy, briefing and
unit editing. Offers, owners, ordinary attachments and archive retain M/A gating;
photo upload/resume keeps its separate authoritative capability. A test of the
actual programme view exercises each role and the archived boundary.

A genuine pre-existing query mismatch rejected mixed programmes despite their
valid stored/create category. A development-only query model/facade now accepts
the programme enum; properties/units retain their original category validation.
Only the development list route uses it. Shared numbered-page construction uses
the common query fields. No database, mutation, permission, public URL or worker
contract changes. The documented list contract is explicit and scoped positive,
negative, duplicate/unknown-filter and property-isolation cases pass.

Validation: frontend lint/typecheck/build pass,59 semantic icons/391 Button sites,
zero inventory violations,118 frontend units. Backend Ruff/check/format and
inventory mypy pass. The first broad unit collection exposed a stale environment
missing ReportLab. Installing the existing hash-locked development requirements
then refreshing editable package metadata restored the current pins; pip check
passes, with manifests/locks unchanged. The fail-closed unit runner (DB connections
denied) passes292,683 deselected. No app HTTP/native browser/DB/security race or
full-product verification is claimed. Final review remains after implementation.

[Inventory batch evidence](design-migration-evidence/inventory-2026-10-26.json) records the exact source hashes and scoped commands.

## Documents, picker and narrow collections batch

The selected upload surface now has the actual single-file native chooser/drop
target, named selection, size, remove control and consistent insets. Document
Add opens only its uploader; cancellation stays at the existing list/tab, with
the shared unsaved confirmation. Successful upload closes that uploader and
announces quarantine on the list. Interrupted metadata creation retains its key;
existing-document version upload retains its identity and original metadata
requirements, fetches the current version, then uses the original private permit/
byte flow. It does not create another document or change metadata. Version counts
are explicitly recent/bounded (49+), not an invented total. The source's more
general replacement UX is adapted to the actual fixed-metadata API.

The same picker is used for automatic photo conversion/upload. Original-author
recovery, existing slots, capability checks, ten-photo limit, conversion and
scanner workflow are unchanged. Pending photos expose the existing busy state
to the containing drawer guard. File states now use the selected semantic badge
surfaces with explicit icons; quarantine/failure explanations remain visible.

Main document lists keep aligned columns on desktop, becoming shaded entries in
Sheets and on phones. A shared Sheet context now selects card presentation for
every shared DataTable in a side panel, retaining full cells/actions. Phone tables
without a dedicated compact presenter also receive the complete labeled card
fallback. Desktop main tables remain tables. Selection stays in the existing
controller, and the horizontal scrolling hint is absent in cards/drawers. The
same real cell renderers are reused; native resize/focus checks remain pending.

Validation: lint/typecheck/build pass,59 semantic icons/393 Button sites/zero
violations;122 frontend units pass. Added actual-component synthetic checks cover
single/drop/cancel/disabled selection, uploader cancellation, interrupted retry
identity, version metadata rejection and current-version permit dispatch. Actual
React/TanStack SSR verifies full card values/actions/selection, escaped text,
dedicated presenter preference and retained desktop table presentation. These do
not prove native dialogs, real private-byte/scanner behavior, focus or visual
fidelity. No backend/facade/dependency/storage/permission contract changed.

[Document batch evidence](design-migration-evidence/files-2026-10-26.json) records the source hashes and scoped commands.

## Help workspace batch

The approved Home composition now uses compact search and topic cards with two
direct guide links and a current-role count per topic. No removed FAQ section is
reintroduced. The topic/search catalog uses parallel guide cards and the selected
20-item numbered static page size. The reader places the first instruction
section beside supporting sections, retaining every paragraph, step, note and
related permitted link. It keeps the existing current-role static catalog and
server copied-slug denial; no prototype demo article replaces real guidance.

Topic/query/page URLs are bounded and role-filtered on the server; browser
navigation can reproduce them. Search has a native GET fallback and remains
outside the business draft guard. Short/mobile viewports retain normal native
overflow instead of clipping guide links to force a fixed screenshot. The desktop
frame uses its available height; exact target-size no-scroll/zoom behavior still
requires final native verification.

Lint/typecheck and the pinned production build pass;125 frontend units pass.
Actual-component SSR checks home/catalog routing, safe query text and preservation
of every section/instruction/note. Additional route/query/page tests cover copied
restricted topics and current-role guide filtering. A first SSR fixture omitted
icon stubs and failed; the fixture was corrected, with no production gate removed.
Native reading, keyboard, Back/Forward focus and visual acceptance remain pending.

[Help batch evidence](design-migration-evidence/help-2026-10-26.json) records source hashes and checks.

## Work entries and pagination batch

Tasks now share the selected tonal full-width entry pattern in dossier drawers
and daily work. Title/status, due/responsible metadata, real dossier/property
links and disclosed instructions/outcome use the available width. The existing
task creation, selection, versioned finish/edit and origin checks remain on their
controllers. Urgency compares the API's now instant and Casablanca today/due_local,
never the prototype demo date or browser's current clock. Daily work/inbox boxes
no longer impose independent fixed-height scrolling regions.

Notification entries use actual kinds, read state, due/created times and permitted
dossier links. Mark-read uses the existing command; a current denial hides prior
entries and unread totals. Current reminders, PushControl and all errors remain.
Only ordinary bounded20-row list preferences changed, within the existing API.

Single-page pagination now keeps its accurate result caption without disabled
controls. An out-of-range page after records disappear keeps a Back/direct-page
escape and an explicit empty-page caption, rather than a reversed result range.
Compact supporting lists use authoritative has_previous/has_next flags, so a
reduced final page does not strand the user. Numbered API pagination is unchanged.

Lint/typecheck/build pass;128 frontend units pass (59 glyphs/392 Button sites,
zero violations). New synthetic cases cover server-clock/civil-day urgency,
terminal tasks, notification denial after prior data, and reduced/single-page
navigation. Native time/input/focus/resize and real task/reminder/database tests
remain pending. This is not the completed calendar/dashboard or whole branch.

[Work-entry batch evidence](design-migration-evidence/work-2026-10-26.json) records source hashes and scoped checks.

## Desktop directory Kanban batch

The selected List/Kanban pills now operate on the real Lead/Deal directories.
Phones retain List beside search/filter icons and never mount/read the lanes;
the allowlisted non-sensitive cookie preserves only the desktop display mode.
Contact-embedded lists keep their existing numbered table/cards. Each Kanban
column has its own scoped API status filter, ten-row numbered page and server
total. All applied search/assignment/archive/date/sort filters survive. A selected
status fills the available result width instead of leaving blank neighboring
columns. No current-page grouping is presented as the complete pipeline.

Cards preserve real contact/phone, assignment, budget, project and offering
context, source-pinned icons and tonal columns. Internal editable-card dragging
only requests a review; outside/button/same-stage/cancelled drags never write.
Lead transitions fetch the full current enquiry before reusing the original
versioned status/conversion forms. Deal cards reuse the ordinary stage, stock
reservation, release, outcome and reopening controllers. Releasing/reopening
for an ordinary target first completes that reviewed operation, then asks for
a second ordinary transition using the newly loaded version and a new reason.
There is no optimistic or silently chained stock mutation.

The original DealRecord command boundary is shared with the board: identical
request bodies retain their retry identity even when the response/reload is
interrupted; concurrent submissions are locked. Editors are owned outside the
filter-keyed lanes, so filtering and phone resizing do not recreate their drafts.
Explicit List navigation uses the existing unsaved/busy guard. Current scope
denial removes the board; private IDs/names are never persisted in preferences.

Lint, standalone typecheck, production build with fresh TypeScript, dependency
security check and138 frontend units pass. First new tests exposed a synthetic parent/child
hook-state collision and a missing default Link stub; the fixtures were corrected,
not the shipping behavior or gates. Native drag/autoscroll, keyboard/focus, exact
visual fidelity and real stock/database race tests remain for final verification.
This batch does not finish the remaining forms/calendar/report/PDF migration.

[Kanban evidence](design-migration-evidence/kanban-2026-10-26.json) records exact hashes and command results.

## Selected calendar and booking context batch

The former hourly grid/mini-month rail is replaced on this route by the frozen
prototype's compact toolbar, seven day columns, tonal visit cards and drawer
filters. Week/Agenda/Par type retain desktop choice; phones use the chronological
agenda, with a CSS agenda fallback before hydration. Cancel editors are owned
outside the keyed week/filter collections, so resizing/changing view does not
recreate a reason draft. Rules show the actual policy/capacity, all work windows
and lunch rows without inventing availability. The desktop collection uses the
remaining viewport; short/phone views keep native page overflow.

Authoritative week resolution, server-local offset strings, scoped50-row pages,
full-range facets and current/empty/denied states remain. All status choices,
including zero-count choices, stay available. Applied selections persist when
changing weeks or entering/leaving free/busy. Private busy columns/agenda reuse
only the original safe interval endpoint, with no visit IDs/names/type/status
filters. Multi-day visits appear on every touched day; an exact midnight end
does not appear on the next day. Cards keep real route/context/status and review
flags; the detailed label retains the complete authoritative time interval.

Day links now carry a bounded valid date through contact selection to the real
booking form. This is a date-only hint, never a default hour/instant. Split
date/time inputs preserve partial entry; the existing backend resolver still
rejects skipped times and requires an explicit repeated-hour occurrence. Final
booking still needs original context/participants/rules/preview validation.
Controlled form fields now mark drafts explicitly; Back/Cancel use the shared
unsaved/busy guard. Preselected date-only defaults are initially clean.

Visit actions now retain the snapshot reviewed when opened, including across
interrupted retries and later parent refresh. Their original reason/body/key
checks remain; a synchronous lock blocks duplicate submit. Current authority
denial propagates to remove prior calendar/detail content. No backend, timezone,
stock, worker, facade, package or storage contract changed.

Lint/typecheck/build pass with62 glyphs/404 Button sites/zero violations;147
frontend units pass, including9 new actual-component/controller/SSR cases. A
PostCSS parse verifies61 rules/14 referenced roles/zero missing roles. These
are source/synthetic checks: no native viewport/focus/scroll/drag/zoom, browser
calendar acceptance, real booking/capacity/DST race or complete product pass is
claimed. The branch still needs remaining forms, record inline editing, PDF,
report/admin/search surfaces and final owner-directed verification.

[Calendar evidence](design-migration-evidence/calendar-2026-10-26.json) records source hashes and commands.

## Inline dossier fields and draft-read retention batch

Contact, prospect and affair values now use the selected quiet value/hover/edit
pattern, with short local controls, explicit save/revert and the same fact-row
spacing. A shared scope allows one inline field at a time and guards switching
away from a draft or pending command. Escape/revert restores the saved value;
loading/error states can be cancelled. The ordinary full Modifier forms remain.
Values have an accessible current-value description; call/mail links remain
separate native actions rather than nested links inside buttons.

Contact fields reuse the existing full schema, canonical contact PATCH and field
arrays. Names, type, roles, country, nationality, languages, all phone/email rows,
labels and exact primary selection survive. Main Lead/Deal rows keep primary
methods stable; secondary methods load only when Autres coordonnées is opened.
Changing a field does not persist provenance, assignment or unrelated profile
changes. Conflict recovery shows the current field and can reload it or rebase
only the edited field onto current unrelated values; kept input stays dirty.
Current denial removes prior content. Empty/unmatched calling-code metadata
keeps a full international input rather than assuming another country or crashing.

Prospect edits preserve the reviewed message/status/qualification/version and
stable retry identity. A missing legacy budget remains explicitly required;
converted/archived qualification stays read-only. Affair edits reuse the original
atomic full-edit command, complete project choices, linked offering/version and
reviewed version. Missing budget/motifs/projects must be completed, zero rooms
remain zero, and no stage/reservation/stock/outcome command is substituted. A
failed command retains its draft; the existing explicit compare/reset now really
remounts displayed affair forms and cannot run while its command is pending.

Review found that a transient quiet read could tear down a dirty editor. Quiet
refreshes now use the established deferral path for detail/field metadata. Only
an existing same-path validated projection may be held on a transient5xx read
while a draft is dirty. Current401/403/404 errors still clear it; initial/new-record
reads, list failures and explicit hard refresh are not hidden. Existing deferred
refresh notices are reused. No new cache/storage, endpoint, authorization,
worker, database, session, dependency or business rule is introduced.

Source/controller checks cover single-field switching/cancel/busy, complete
collection preservation and primary selection, same-key interrupted retries,
contact conflict rebase without unrelated overwrite, current denial, required
legacy qualification, exact affair edit boundary, lazy secondary methods and
metadata failure fallback. Four actual-hook cases additionally cover transient
draft reads, authority loss, list/hard reads and first/different-record loading.
Lint/typecheck/build pass and162 frontend units pass (62 glyphs/418 Button
sites/zero inventory violations). A new hook harness initially violated the
component naming lint rule; the fixture was corrected without relaxing the gate.
These are synthetic/source checks; native focus, breakpoint geometry, keyboard,
zoom and real record/security races remain in the final verification stage.
Dense CRM/form scope retains the existing system; missing original-machine UI
skills and AFTER timing remain as previously recorded.

[Inline evidence](design-migration-evidence/inline-2026-10-26.json) records exact source hashes and command results.


## Full Contact/Lead/Deal forms

The selected creation sheet now replaces the old parallel card composition.
Prospect and affair create/edit forms have one continuous panel, separated
Contact/Qualification or Contact/Projet et budget/Qualification sections and one
save/cancel action row beside the title. Duplicate route/editor headings and
bottom action strips were removed. The shared form field recipe uses horizontal
labels in wide panels, labels above controls in narrower panels and one column
on phones or narrow drawers. The contact editor uses the same field spacing.
Phone methods and residence sit opposite email methods, languages, nationality
and roles. The live arrays retain every label and explicit primary selection.

Contact reuse remains explicit and scoped. Picker results are compact full-width
choices with name, primary phone and responsible agent; Enter in picker search
searches rather than submitting the enclosing dossier. Existing numbered pages
remain, with no inactive single-page controls. Programme/property/external project
choices, one-to-three qualification projects, exact budget strings, optional
linked search/offering versions, initial ordinary stage and zero rooms remain.
The prototype's relance and immutable source fields still use their real existing
workflows; no unsupported date/provenance mutation was added.

Managed draft tracking now compares only editable business values; typing picker
search text does not mark a dossier changed. Successful writes and explicit
current-version reloads accept a new baseline. Failed/interrupted writes retain
it. Shared input tracking respects that ownership, and link navigation is blocked
while a managed command is pending even if it had no dirty fields. Explicit
cancel uses the existing discard dialog. Synchronous locks cover async validation
as well as the original versioned commands; unchanged-body retries keep their
original key. Lead edits reset both form baselines only after success.

Ten actual component/controller cases cover these boundaries, including contact
reuse/assignment, complete atomic bodies, collection/zero retention, double
submit, interrupted retry, conflict retention/reload, managed picker input and
pending-command navigation. The first two test failures were an incorrect mock
export for NativeSelect; that fixture was corrected. Initial lint also found the
now-unused DealIcon import after removing a duplicate heading; it was removed.
Final lint/typecheck and the pinned Next16.4.2 production build pass;172 frontend
units pass. Form CSS parses as32 rules with4 existing role references, all found.
All254 frozen prototype inputs still match their recorded hashes.

These are source/synthetic checks, not rendered geometry, focus/zoom or real
record/security acceptance. The original-machine mandatory UI skill paths remain
unavailable; dense CRM/product forms remain outside design-taste's marketing
workflow, and AFTER timing stays unchanged. Native/product review follows the
remaining implementation. No backend, facade, dependency, storage, database,
worker, main, push or merge change is included.

[Full-form evidence](design-migration-evidence/forms-2026-10-26.json).


## Task/activity drawers and physical-property task context

Activity creation now opens in the selected shared RecordDrawer instead of an
inline card inside the history. Cancel, Escape and close use its existing guarded
exit; successful save closes the form and refreshes the numbered history. Type,
full notes, duration/direction and three optional contextual project labels use
shared controls, consistent insets and section spacing. Cancel then save matches
the other drawer forms. Current authority loss removes the draft/history rather
than retaining previous private content. Controls stay disabled until hydration;
the native fallback method is POST, never a query string carrying typed notes.

Task create/edit now uses the drawer width without a reading cap or nested card.
Title and instructions precede the paired Casablanca due-time/authorized owner,
then dossier context and an optional physical-property link. Follow-up keeps its
compact existing presentation. Managed draft ownership includes real controlled
fields, protects cancel and marks commands busy; the existing lock, exact
versioned payload/retry identity, scope, compare and reminder flow remain.

The selected task design included a property context that the existing API
already accepts but the form omitted. WorkPropertySelect uses only the shared
physical properties endpoint (standalone assets and units), active inventory,
scoped detail reads and numbered25-row pages. It preserves the current UUID when
filtering/paging, reads an off-page saved link through a separate mounted loader
and changes the body only after explicit selection/removal. It never chooses an
offering, reserves stock or changes availability. Archived/missing linked records
remain explained without silently clearing the task's saved link. This exposes
an existing field, without a backend/facade/schema or permission change.

Initial type checking rejected a speculative optional useQuery path. The hook's
real contract requires an API path; the off-page summary now mounts its own
proper scoped read while the parent search/control stays mounted. A codemod's
literal interpolation markers were found in the immediate render read and
replaced with the original complete fields before checks. Lint later identified
an unused path in one test fixture; the fixture now uses its stable path.

Final lint/typecheck and the pinned Next16.4.2 production build pass;178 frontend
units pass (62 glyphs/415 Button sites/zero violations). Form CSS parses as37
rules/4 existing roles with no missing role.

Six new actual-controller cases cover resolved-time-only writes, reviewed task
versions/property context, busy/duplicate/retry/draft behavior, activity context,
hydration/POST fallback, denial, drawer ownership and selected-property pagination.
Native focus/layout/touch/zoom and real current-authority/worker/database acceptance
remain pending. Detailed visit/finance/admin forms and other migration phases are
not declared complete by this slice. [Evidence](design-migration-evidence/work-forms-2026-10-26.json).


## Routed visit drawers and controlled command lifetime

The selected visit drawer now sits over a calendar owned by the persistent
visits layout. Existing /visits, /visits/new and /visits/{uuid} pages keep their
exact identity/UUID/bounded-query checks; the layout renders no calendar for an
anonymous or password-change identity. Opening/closing a visit no longer replaces
the calendar composition. The intended week/filter retention follows that source
ownership; actual native route/focus retention still needs final verification.
Closing the guarded route replaces the in-app location with /visits and hands
focus to its retained heading, instead of assuming browser Back is safe.

Creation uses a scoped contact chooser and a guarded change-contact step. Date-only
context survives selection without inventing an hour, title, place or participant
from prototype demo data. Save replaces the creation route with the saved UUID.
Rescheduling uses the original full DTO and a reviewed snapshot/version. It now
retains the saved overlap explanation; general notes and terminal outcomes are
not folded into that field. A draft stays a draft and does not require a booking
preview, matching the existing server and prototype rules. Confirming/finishing/
cancelling remain explicit commands and required reasons are preserved.

Forms use paired type/title and start/end controls, the existing scoped physical
property selector, authorized participant controls and subordinate policy/history
sections. The read view uses compact facts, status colors, meaningful links,
result cards and one primary action with the other commands in Actions. The root
owns one reviewed command snapshot. History loads on disclosure, stays mounted
through editing and paginates the existing bounded100-event response in20-entry
cards. A history/comparison authority denial removes the previous private view.
Availability checks and saves share one synchronous operation lock, stale interval
previews are discarded, and explicit version rebase requires another preview.
Terminal, archived or changed canonical-contact comparisons cannot be rebased.

Review found a clean-but-pending managed form could be replaced by a quiet read.
Detail/field-metadata deferral now includes a managed busy form, still requiring
an existing validated same-path projection. Initial/different-record reads, lists,
hard refreshes and current401/403/404 errors keep their fail-closed behavior.
Controlled draft owners release deferred reads after editing and commands finish
or the form unmounts, using the existing field-free event. Both generic input
trackers now respect managed ownership, including when live updates are enabled.
The same busy lease is wired through existing Contact/Lead/Deal/Task forms.

Fifteen new actual component/controller/hook/SSR cases cover full visit payloads,
resolved instants and property context, serialized preview/save, retries, draft
rescheduling, explicit comparison, denial, lazy retained history, command snapshots,
protected route composition, focus handoff and draft/live lifetimes. One assertion
initially compared VM-realm object prototypes; normalizing only the fixture
comparison fixed it. A multi-file edit stopped on reassignment of a const path;
the remaining page-key edit was applied separately. Wrong-root reference reads
were corrected before their contents were used. No failed command was counted
as a pass. Final lint/typecheck/build and193 frontend units pass (62 glyphs/421
Button sites/zero violations). Form CSS parses with50 rules/4 existing roles;
all254 prototype input hashes still match.

Remaining field mapping: the selected prototype persists a separate visit Notes
value. Current visit storage/write DTOs expose overlap_reason and outcome, not a
corresponding general-notes path. That capability is unfinished and needs its
own scoped persistence/history/compatibility slice; no fake input was shipped or
unrelated business field overwritten. This is a concrete P0/P6 gap, not completion
of the full scheduling migration. Native overlay/keyboard/zoom/touch/route/race
review remains pending, with the existing app-access restriction and AFTER timing.
No backend, facade, worker, database, dependency, production, main, push or merge
change was made in this slice.

[Visit drawer evidence](design-migration-evidence/visits-2026-10-26.json).


## Separate visit Notes: persistence and compatibility

The selected prototype's general Notes now has its own optional visit field,
independent of overlap explanations and terminal outcomes. Create/reschedule
retain the complete existing command, actor/version and retry identity. Omitted
notes on a legacy edit preserve the stored value; an explicit empty string clears
it. Terminal commands retain notes without accepting an unrelated notes edit.
New snapshots include the value while historical snapshots remain unchanged.
The form/read view place notes with the existing subordinate disclosure, and
comparison exposes current notes before an explicit conflict rebase.

The facade opts into X-Kay-Visit-Notes:1 only on visit metadata and calendar/context.
Older frontend clients receive their exact legacy record/list/history shape;
projection copies never remove notes from stored JSON. New clients recognize an
optional notes_supported flag for creation and an optional notes field on detail.
Against an older backend, the field stays absent and the body omits it. Existing
pre-notes receipt digests remain identical when notes was omitted. This header
negotiates representation only; current contact scope still authorizes every read
and write. Free/busy keeps only interval/busy metadata and receives no notes header.

Revision0036_visit_notes is prepared, not applied. It adds an empty-default visit
column and a deferred constraint requiring current notes to match the current
immutable event snapshot. It never backfills or rewrites historical snapshots.
Downgrade refuses development or retained note-bearing data/history. Deployment
order requires the additive schema before the new backend; old clients can then
remain in service. After notes exist, backend rollback needs a reviewed compatible
build rather than deletion or a schema downgrade. A1000-character technical cap,
aligned with existing visit text bounds, is an implementation proposal, not a new
commercial/permission rule. No migration/database service or real data was used.

Actual checks:198 frontend units, lint/typecheck and pinned Next16.4.2 production
build pass;301 database-forbidden backend units pass (685 integration cases are
explicitly deselected), Ruff passes and mypy passes for12 schedule modules. The
Alembic script graph has36 revisions and one head0036 over0035 without opening a
database. New real-PostgreSQL persistence/retry/clear/scope/free-busy/history-guard
cases are prepared but not run. Source tests do not establish real trigger/locking,
booking/security races or native input/focus acceptance. Both that final stage and
the remaining P0-P7 implementation stay open; no main/push/merge or dependency change.

[Visit Notes evidence](design-migration-evidence/visit-notes-2026-10-26.json).


## Selected settings navigation and real overview

The selected288px administration navigation now accompanies the overview, user
list, user create/edit and working-hours routes. It becomes a compact local pill
strip below1280px and centers the current section inside that strip, following
the reference without changing the page scroll position. Each route retains its
exact existing administrator/identity gate and UUID handling. The user-list action
sits with its content heading; the duplicate Paramètres button is replaced by
consistent navigation. Existing staff forms, reset/delete commands and policy
preview/save services remain untouched. Detailed form composition remains open.

The overview uses the real users total, only the returned first3 named summaries,
and the actual policy's distinct open weekdays/capacity/timezone. It labels the
account total as comptes rather than inventing an active-only aggregate. Empty,
loading and independent transient failures have explicit content. Current authority
denial on either read removes both summaries, including prior staff names. No
prototype demo person/count/default hours are copied.

Shared semantic surfaces, four existing roles, typed glyphs and shadcn Buttons
compose the hierarchy; no page-width cap, new kit/token/font/chart/dependency is
introduced. Four actual SSR/route cases cover current navigation, real total vs
page counts, distinct weekdays, safe error/denial and exact admin destinations.
Initial source typechecking caught unsupported19/15/17 icon size props; supported
20/16 grid sizes now pass. New tests initially omitted explicit React/JSX runtime
fixtures, then lint caught a children-prop fixture; both were corrected without
relaxing the loader/lint contracts. Final lint/typecheck/build and202 frontend
units pass (62 glyphs/420 Button sites/zero violations). Settings CSS parses
with51 rules/4 existing roles/zero missing definitions. Native responsive layout,
local-strip focus/reveal, zoom and real account workflows remain for final review.
No backend, identity/session, credential, real account or main/push/merge change
is part of this settings slice.

[Settings source evidence](design-migration-evidence/settings-2026-10-26.json).


## Staff detail forms and detailed working-policy drawer

The selected staff create/edit hierarchy now owns one settings header with Back,
Cancel and Save actions, a main identity/role card and a content-sized right-hand
security card. The layouts stack on narrow screens and keep top labels. Account
state uses the existing colored Badge vocabulary; initial expiry, first-login
password replacement, session revocation and preserved attribution remain explicit.
Existing create/edit/reset/delete routes, administrator proof/CSRF, reviewed versions
and backend last-administrator/deletion safeguards are unchanged. No real staff
operation, initial-password delivery or backend/session change was performed.

The full user form serializes validation/submission, preserves an interrupted
command body/key and holds its reviewed record snapshot. Ordinary edits send no
password. Native fallback is POST and controls are hydration-gated. Managed draft
ownership records actual identity/role fields and only a password-presence marker;
no plaintext credential enters the draft baseline/event. Credentials remain only
in transient inputs and the existing retry owner, clearing on success/authority
denial. Security actions are blocked while sibling identity edits are dirty/busy.
Reset/delete confirmation captures its shown record/version, serializes execution
and clears credentials on dismissal/success/denial. Current denials remove the
prior editor; explicit read retry clears stale data before loading. Successful
commands retain feedback through the new-version form remount.

Working hours now follows the selected detailed-policy composition: seven compact
read-only day rows, a capacity/timezone support card and one guarded detailed
drawer. All existing multiple work periods and pauses remain distinct per day;
none is flattened into the prototype's illustrative simple-week defaults. New
rows start blank and both42-row category bounds remain. The drawer uses matching
soft day groups, top-label time controls and icon removal actions.

The original strict complete proposal, version, preview hash and save DTO remain.
Preview never saves. A synchronous operation lock serializes requests, while an
immediately invalidated preview lease/signature and edit epoch reject stale save
handlers and late previews. Conflict comparison shows the complete current week,
retains the proposal and requires a new preview after explicit version selection.
Retry retains the same complete reviewed save body/key. Current command/comparison
denial removes previous drawer/impact content. Affected visits use existing cards.

Nine new actual component/controller cases cover these DTOs, transient credential
lifetimes using boolean-only secret assertions, draft/cancel/hydration boundaries,
reviewed reset versions, retry locks, full period retention, preview invalidation,
comparison and denial. Existing route fixtures now reflect the form-owned single
workspace while preserving exact admin destinations. Typechecking caught an
optional-error union and it was narrowed explicitly. One root-cwd npm invocation
failed before running a check and was rerun from frontend; one malformed editor
script failed before mutation and was corrected. No failed attempt is a pass.

Final lint/typecheck/build and211 frontend units pass (62 glyphs/425 Button sites/
zero violations). Settings CSS parses with73 rules/4 existing roles/zero missing
definitions. Native account/reset/delete/booking workflows, revised browser
selectors, final layout/focus/zoom/accessibility and AFTER/product review remain
pending. Remaining migration phases are not narrowed or declared complete.

[Settings form evidence](design-migration-evidence/settings-forms-2026-10-27.json).


## Authoritative data path for the selected dashboard

The reference's four headline values and bounded appointment/follow-up/task/stock/
team previews are not all provided by the old report projection. New separate
read-only workspace/records/agents endpoints now provide those actual authorized
rowsets. Existing13-metric reports, finance and attribution APIs are untouched.
This slice prepares the complete data/typed-facade path; it does not substitute
the old five KPI cards for the selected four or claim dashboard visuals complete.

Counts apply current identity/contact scope before period/filter/group/page/limit,
inside one read-only repeatable snapshot. Received enquiries, current active deals,
nonexpired scheduled/confirmed visits starting in the period, and currently
follow-up unconverted enquiries remain distinct. Previous comparisons exist only
for received cohorts and use equal-length dates/current scope; no past ownership/
status snapshot or future-visit comparison is invented. Existing BR-18 takes
precedence over the prototype's single demo filter: current portfolio follows
current primary responsibility, while period outcomes keep primary at closing.
Current caller contact scope still authorizes both.

Preview totals precede2/3-entry limits; paged headline records reuse exact source
predicates. Team cohorts preserve their current-responsibility meaning without
replacing true-actor activity. Catalogue targets resolve UUID-backed qualified
interests, discussed/visited links and selected offerings, deduplicated per target/
active deal. Free-text names never identify stock and whole programmes never expand
to child units. Current campaigns use exact MAD strings; no owner/contact grant or
public photo URL is added. Tasks preserve explicit Lead/Deal context. Refresh-topic
matching includes task/visit/stock changes only on the new workspace paths.

Nine new database-forbidden cases compile actual PostgreSQL statements for all
three roles, exercise complete zero projections, date boundaries, strict queries,
identity-first failure, historical closing filtering, non-cartesian team groups
and exact campaign/target identities. Four real-PostgreSQL acceptance cases are
prepared, not run. SQLAlchemy2.1 variadic Select typing was corrected without
ignores; a new integration import order was sorted. Final Ruff/mypy pass for9
report modules;310 connection-forbidden units pass/689 integration cases deselected.

Six new strict facade/contract cases plus the existing suite pass217 frontend
units. Lint/typecheck/build pass (62 glyphs/425 Button sites/zero violations).
The selected layout/chart/card/tool composition, actual PostgreSQL behavior/
performance/scope races and native/AFTER/product verification remain open. No
migration, dependency, real data/service, production, main, push or merge operation.

[Dashboard data contract](../04-design/dashboard-workspace-local.md) ·
[Source evidence](design-migration-evidence/dashboard-data-2026-10-27.json).

## Selected dashboard composition and supporting drawers

2026-10-27. `/dashboard` now uses the frozen welcome/four-KPI composition and
the real workspace projection. The source1150/980/1600px grid transitions and
later830px mobile override are reconciled with the actual CSS import order:
wide screens show pipeline/catalogue/appointments above three supporting cards;
phones retain the final compact two-column KPI grid. Source hero-photo geometry
is retained for this dashboard showcase; project directories keep their existing
short left-image cards. This is source/cascade evidence, not a rendered-layout pass.

The five-stage Bklit semicircle has an exact keyboard-operated count legend,
current active total, reduced-motion behavior and separate period-closing links.
Its square measuring canvas is clipped by the source220/136 viewport, preserving
the85px inner radius. The empty placeholder is decorative only; exact zero values
remain in the legend. Current-stage drawers query the existing scoped Deal list;
headline drawers use exact workspace record rowsets. Closing drawers map the
selected responsible to immutable closing attribution instead of passing a
current-portfolio filter into the legacy report API.

Three catalogue, two appointment and three follow-up/task/team previews use their
complete authorized totals. Photo cards reuse private metadata/clean scan/permit
and object-URL cleanup; no public inventory photo URL is introduced. Property and
programme links use their real distinct routes. Campaign money stays exact MAD,
terms/states remain visible, and task links retain explicit Lead/Deal context
before the historical Contact fallback. Civil tiles use server-supplied local
dates/times; overdue uses the authoritative clock, including ongoing appointments.

The old page-local account/notification controls are removed; the shared shell
already supplies them. New prospect stays in the selected page header. Shared
RecordDrawer provides full work/visit follow-up and lazy detailed reports. All
authorized legacy metrics, contributor charts, exact values, alert filters,
numbered pages and drills remain. Report numeric alternatives are full-width soft
rows instead of tables. Detailed reports explicitly own their filters and retain
current-primary/closing-primary/true-actor distinctions. They copy only their date
keys from workspace context. Main loading/error/denied states remove stale cards
and associated record drawers. Current caller/backend authorization remains final.

Three Bklit pie source files match the frozen source, apart from the local `cn`
import. The exact MIT notice is distributed with the app. `@visx/group@4.0.0` and
`d3-shape@3.2.0` were already locked/installed transitives; their unchanged versions
are now declared direct dependencies because the pie source imports them. No
package version or installed dependency tree changed. Both selected key images
match source hashes; all254 pinned inputs still match.

Eight actual component/controller cases cover default/invalid/draft/applied/reset
filters, denied projection removal, complete KPI totals/zero denominators, stage
and closing rowsets, civil/decimal/private-photo contracts, distinct catalogue and
task routes, and complete supporting metrics without copied portfolio parameters.
The initial invalid union-Omit typing, missing semantic Button mappings, one
locale-abbreviation assertion and one reserved test-variable name were corrected;
failed checks are not passes. CSS review corrected the initial rectangular Bklit
measurement and isolated-file breakpoint assumptions before the final build.

Shared primitives/tokens remain; custom CSS is limited to selected dashboard
geometry/material/cascade. Original-machine antislop/design-system-ops paths remain
unavailable and are not claimed executed. The local design-taste skill explicitly
excludes dashboards; no marketing workflow/aesthetic reinvention was applied.
React guidance was used for typed state, lazy charts/reports, current projection
boundaries and reusable components. AFTER timing is preserved; no audit-only
finding is selected or human approval inferred.

Final source checks:225 frontend units, lint/typecheck and pinned Next16.4.2 build
pass;62 glyphs/444 Button sites/zero violations. Dashboard CSS parses with151 rules,
13 existing roles and zero undefined aliases. Runtime/full dependency audits both
report zero known vulnerabilities. No backend/database/migration/service or real
record operation. Browser/app access remains restricted; native geometry/focus/
keyboard/touch/zoom, PostgreSQL scope races/performance, revised browser selectors,
AFTER and owner verification remain pending. The overall redesign goal remains
active; remaining P0–P8 work is not narrowed, and main/push/merge are untouched.

[Dashboard UI evidence](design-migration-evidence/dashboard-ui-2026-10-27.json).

## Selected global search preview and full results

2026-10-27. The frozen source uses a desktop anchored preview and a full result
view; the previous CRM used its Sheet everywhere. The header now follows that
composition with the existing mobile830px boundary. Eight result previews retain
the complete server total and a full-results link. The440/420px popup uses existing
menu roles and Radix collision/available-height handling; the shared form/result
hierarchy serves the phone Sheet and the new authenticated `/search` page.
No full/drawer result list gains a fixed inner scroll region.

The new route authenticates before reading parameters. q/kind/page remain strict
and bounded, duplicates/unknowns are invalid, and invalid values are not reflected
as fields or component keys. Only bare `/search` is an allowed login return.
Literal queries are URL-encoded. Existing GET facade/session/no-store and backend
scope/count/parent-context contracts remain; no extra phone, file, finance or owner
field is inferred. Document hits open their authorized parent; reusable types open
their actual programme's filtered unit context. Prefetch remains disabled.

Preview reads debounce300ms and mount only while open with a valid current query.
Changing text immediately removes the old query subtree; current errors remove
prior names. History events, route and desktop/phone changes clear/unmount the preview. The ordinary
linked-result Popover uses a labelled nonmodal dialog with arrow/Home/End focus,
Enter activation and Escape return, preserving the selected visible workflow
without claiming input-focus listbox semantics. Escape return suppresses its own
reopen event. Pointer selection keeps focus in the input, and keyboard activation
returns focus there before the shared unsaved guard can open its confirmation;
that return target survives popup closure. Native behavior remains unverified.

Full results retain scoped per-kind counts in the existing Tabs, exact complete
totals and shared numbered pages. Page/facet/query navigation uses the unsaved
guard; the phone's search state remains disposable and clears old results on edits.
Live invalidation now includes files and enquiries in addition to the existing
search domains. No generic query-hook, backend, permission or business-command
implementation changed. The pinned installed Next page/Link documentation was
read for the new route/async params and prefetch handling.

Eight source/controller cases cover bounds/encoding/return paths, auth-before-params,
duplicate/unknown rejection, responsive-mode closure, debounce/stale-query/denied
results, popup keys/focus return, protected full-page navigation, phone validation,
parent-only links and live topics. One malformed test helper failed parsing before
any test ran and was corrected.233 frontend units and final lint/typecheck/build
pass (62 glyphs/445 Button sites/zero violations). Search CSS parses with37 rules,
seven existing roles and one verified Radix runtime role; zero missing aliases.
All254 prototype inputs remain unchanged.

The source reconciliation also confirmed a genuine missing capability: prepared
PDFs are included in the selected prototype search but not in the current backend
Document-only projection. That remains explicit P0/P7 data work, preserving C13
template roles and parent-contact authority; this UI checkpoint is not a substitute
for that outcome. Audit actor tools, job/import panels and other migration phases
remain open. Original-machine mandatory skills remain unavailable, dense CRM stays
outside the marketing workflow, React guidance/shared primitives are reused, and
AFTER timing is retained. No native/app-HTTP, real SQL/races, final accessibility/
AFTER or owner approval is claimed. Main/push/merge and the active goal are unchanged.

[Search UI evidence](design-migration-evidence/search-ui-2026-10-27.json).
