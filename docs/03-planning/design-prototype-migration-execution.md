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
| P1 foundation | Committed `fed7ded`; selected theme, Inter/assets, controls, shell/auth and Contacts entry; later batches extend to59 source-pinned glyphs and selected status palette | Native review later |
| P2 shared interactions | Shared compact directory/record headers, responsive cards, retained lazy tabs, sections, drawers and click/unload draft guards implemented | Exact inline-field/form parity, Back/Forward handling, responsive focus and native interaction checks |
| P3 Leads/Contacts | Contacts2-tab overview/activity, dossiers below responsibility, supporting drawers; Leads4-tab detail/status picker; Lead/Contact/Deal directory cards and compact tool placement implemented | Exact inline editing, remaining form/document parity, browser selector migration and native review |
| P4 inventory/owners | Selected compact image cards, programme2-tab/standalone dossier, Units filter drawer, right-side Patrimoine and clickable short steppers implemented; typed mixed-programme query correction | Remaining exact hierarchy/owner/photo form presentation and native review |
| P5 Deals/finance/PDF | Deal4-tab workspace, ordinary/status/reservation/outcome menu and role-gated Finance drawer composed from real controllers | Remaining exact inline/offer/form/PDF layouts and provenance; final native security/stock/focus checks |
| P6 work/schedule | Existing application behavior retained | Selected calendar/task/activity/inbox presentation and full context flows |
| P7 remaining surfaces | Existing application behavior retained | Dashboard/report/search/audit/jobs/settings/help compositions |
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
