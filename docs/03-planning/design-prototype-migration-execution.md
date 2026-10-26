# Selected KAY workspace migration: execution

Updated: 2026-10-26
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
| P2 shared interactions | Shared compact directory/record headers, responsive cards, retained lazy tabs, sections, drawers, one-at-a-time inline fields and click/unload draft guards implemented | Remaining full-form parity, Back/Forward handling, responsive focus and native interaction checks |
| P3 Leads/Contacts | Contacts2-tab overview/activity, dossiers below responsibility, supporting drawers; Leads4-tab detail/status picker; Lead/Contact/Deal directory cards and compact tool placement; desktop-only paged Kanban and per-value contact/prospect editing implemented | Remaining full-form/document parity, browser selector migration and native review |
| P4 inventory/owners | Selected compact image cards, programme2-tab/standalone dossier, Units filter drawer, right-side Patrimoine and clickable short steppers implemented; typed mixed-programme query correction | Remaining exact hierarchy/owner/photo form presentation and native review |
| P5 Deals/finance/PDF | Deal4-tab workspace, ordinary/status/reservation/outcome menu, per-value qualification/notes/action editing and role-gated Finance drawer composed from real controllers | Remaining exact offer/full-form/PDF layouts and provenance; final native security/stock/focus checks |
| P6 work/schedule | Task/notification entries plus selected day-column calendar, drawer filters, phone agenda and date-only booking context implemented; current commands retained | Detailed visit/task/activity forms, inbox/settings refinements and native workflow review |
| P7 remaining surfaces | Help topic hub, side-by-side guide cards and balanced reader implemented; other existing behavior retained | Dashboard/report/search/audit/jobs/settings compositions and native review |
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
