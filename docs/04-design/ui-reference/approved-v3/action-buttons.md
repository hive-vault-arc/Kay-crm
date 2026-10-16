# App-wide action buttons

2026-10-16. Owner-requested UI-only refinement following three supplied button
references. Keep this and all pending UI work local; no commit/push/deployment.

The subsequent dashboard-header request removes its audit shortcut. The linked
source inventory now reports284 buttons in94 files,275 semantic mappings,
5 existing icon buttons and4 data exceptions, with0 violations. Counts in the
original verification below describe that earlier285-button run, not new tests.

Reading this as operative CRM actions for KAY staff, with the existing light,
black/gold identity and ENERGY1 / RHYTHM1 / MOTION1. Design-system-ops owns
geometry; antislop applies DURING. Dense operational surfaces exclude the
marketing/concept workflow. No additional visual world, font, chart, photograph,
backend feature or library is introduced.

## Semantic policy

| Existing action | Shared treatment | Reason |
| --- | --- | --- |
| Create a record | Add icon, KAY gold/charcoal filled button | Main creation intent remains prominent |
| Add a local field/association | Add icon, existing secondary surface with gold accent | Avoid treating every field addition as the page's main action |
| Save/approve/positive confirmation | Completion icon, existing success green | Positive commit distinct from creation and destructive work |
| Remove/archive/record cancellation | Trash/archive/close icon with red semantics | Distinguish real removal/state changes from dismissal |
| Back/next/reorder/dismiss | Directional/close icon on neutral surface | Navigation and dismissals do not imply destructive work |
| Edit/search/refresh/retry | Pencil/search/refresh with info accent | Recognizable maintenance/recovery intent |
| Filters/columns/compare/assignment | Funnel/columns/swap/people with warning/purple accent | Recognize the existing operation without a rainbow of filled utilities |
| Import/export/download/upload/files | Existing file/directional glyphs with teal accent | Keep the actual file flow and format recognizable |
| Password/logout | Existing password and new logout glyph | Preserve authenticated behavior and explicit French labels |

Semantics are explicit `Button action` values, not label parsing. Dynamic
operations use their real existing state: dismissing a dialog stays neutral;
cancelling a visit/task, disabling an account or archiving retains red. Ordinary
negative Deal outcomes retain their real confirmation, not a new Delete action.
Existing CSV export does not become Excel, and creating an affaire does not
convert or close its originating Lead because a reference says Convert.

The existing shadcn Button composes the icon and actual label/Link via Radix
Slottable. It preserves caller handlers, type, disabled state, attributes and
refs. Icons are16px/decorative,8px apart from labels; targets stay at least44px.
Long labels may wrap within the parent. Creation is explicitly gold everywhere;
other existing quiet/outline/compact/destructive/link variants are retained.
Filled actions use inherited readable foregrounds; utilities color the glyph,
not every whole surface. Success hover/pressed opacity stays95/90%, not80%.

## Source coverage

The executable inventory reports285 buttons across95 source files:276 explicit
action mappings,5 existing icon buttons,4 reviewed data-control exceptions,
0 violations. It covers all current Button sites, including conditional branches
and screens without a V3 image. Exact file/line/actions and exceptions are in
[action-buttons-coverage.json](action-buttons-coverage.json).

| Family | Files | Button sites |
| --- | ---: | ---: |
| Route settings/visits/fallback/audit headers |6|7|
| Shared filter control |1|1|
| Authentication |4|5|
| Foundation checks |1|2|
| Contacts/Leads/ownership/pagination |16|53|
| Deals/pipeline/proposals/reservations/outcomes |10|34|
| Search/export/archive/audit |5|14|
| Private files |1|12|
| Finance/receipts/corrections |6|17|
| Import/row mapping/approval |3|14|
| Synthetic website intake |1|4|
| Inventory/hierarchy/campaigns/owners |15|42|
| Reporting |6|10|
| Requirements/shortlists |4|15|
| Visits/calendar/working hours |5|22|
| Shell |1|2|
| User administration |5|13|
| Tasks/notifications/work |5|18|

Five already-iconized login, global-search and shell buttons are retained.
Four exceptions are numeric page identity, KPI value, tabular metric value and
contributor chart-series data mark. Extra action glyphs would obscure those
data controls. Their destinations, numbered pages and actual charts remain.
The previously unstyled import dialog cancellation now composes shadcn Button;
selected requirement choices use the shared selected/search glyph without a
duplicate check. No node_modules, chart geometry or backend source is edited.

`npm.cmd run buttons:check` or `node scripts/button-inventory.mjs --json` provides
repeatable source coverage. The check is also part of frontend lint. New native
or unclassified action buttons and unstyled dialog cancellations fail that
check; data exceptions require their actual numeric/series anatomy.

## Asset integrity and security boundary

Fourteen selected official Free linear assets extend the established typed
layer, bringing it to43 semantic exports. The official0.1.1 tarball's SHA-512
matches the existing pinned provenance. Each exact category/name/SVG SHA-256,
path count and normalization is recorded in the Iconsax asset manifest. The
archive asset is selected explicitly from essential, not the same-named money
asset in the flattened upstream manifest. All original path coordinates remain;
white strokes inherit currentColor and full-viewport clipping has no IDs.

Existing Iconsax Free notices/licensing remain; no premium asset, subscription,
API credential, runtime web-component loader or icon CDN request is introduced.
Live official documentation fetches timed out during this refinement; the
established reference/terms and integrity-verified package remain the basis,
not an invented license grant or metadata-MIT assumption.

Backend, authorization, permissions, sessions, CSRF, TLS, migrations, API
contracts and command bodies remain unchanged. Test screenshots use only
synthetic/empty post-login UI; credential forms are not captured after issuance.

## Verification boundary

Source-wide coverage and primitive SSR/state/color checks complement scoped
compiled headed Chrome flows using the guarded synthetic local database.
They do not establish full customer-data release acceptance or prove every
285-site permission/state mutation was independently clicked. Full database
integration/release workflows, real customer data, physical devices and
assistive-technology user testing remain outside this quick UI-only check.
Actual commands, results, retained failures and screenshot review follow below.

## Actual verification

Final `npm.cmd run lint`, `npm.cmd run typecheck` and `npm.cmd run build` pass
with no reported warnings/errors. Lint includes the icon and full button source
inventories above. `git diff --check` passes; backend/workflow diffs are empty.
An initial typecheck found an insufficiently narrowed optional icon class;
typing the shared action definition resolved it without a suppression.

Compiled headed Chrome command (from `frontend/`):

```powershell
$env:KAY_E2E_PRODUCTION='1'
Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue
npm.cmd run test:chrome -- tests/e2e/action-buttons.spec.ts tests/e2e/list-header-actions.spec.ts tests/e2e/record-facts.spec.ts tests/review/iconsax.chrome.spec.ts tests/e2e/deals.spec.ts tests/e2e/users.spec.ts --grep 'Action buttons:|list header actions:|Lead/Deal facts:|all verified glyphs SSR|SP11 AT-12/39|SP04 AT-01/02/38' --reporter=list
```

Final result:9/9 passed,0 skipped,4.2m. This is the real aggregate runner exit0,
not continue-on-error. Two new cases verify every semantic action's server
rendering and actual styled anchors, disabled/focus/hover/pressed states, plus
52 route/width checks across26 existing pages. Other cases verify real creation,
accepted proposals/stage skipping, role-dependent utilities, columns, export
confirmation, touch destinations, retained read failures/retry/denial, native
200% Chrome zoom and actual account create/handoff/forced password change/
fresh login/disable. All43 icon exports pass SSR/accessibility/path checks with
0 offline asset requests. No one-time credential screenshot is taken.

The route matrix covers dashboard, Leads, Contacts, Lead detail/edit/new,
Contact detail, import/export, Deal list/detail/new, Projects, development
detail/edit/new, standalone property detail/edit, visits/list/new, settings,
users/list/new, working hours, audit and the synthetic simulator. At1440/360px,
all visible mapped buttons have exactly one16px decorative icon, targets at
least44px and no text/page overflow. Gallery checks add320/768/1024px. Existing
list/detail regression cases add native touch, keyboard and actual200% zoom.
Minimum measured normal-text contrast is5.536:1 across routes and6.167:1 in the
primitive gallery; the required4.5:1 threshold is unchanged. Main route review
records0 unexpected console/page errors. The existing global-search cap stays
512px instead of silently expanding to fill the header.

Actual additional interactions include adding/removing a phone field without
changing the persisted contact, opening a negative-outcome dialog with a red
commit button and returning to its focused trigger, and opening/closing the
existing optional Finance form. A gold creation Link retains the actual Link
element/href, not a decorative click handler or nested button.

Retained earlier attempts used the same selection with `--max-failures=1`:

1. The first primitive gallery failed because its standalone test document
   omitted KAY's root CSS variables (1 failed,8 not run). Copy the actual theme
   into the test fixture, not fallback application colors.
2. After that correction, the primitive case passed and the route case failed
   on a mistaken text-only phone-remove selector (1 passed,1 failed,7 not run,
   1.8m). The actual accessible name is Retirer le téléphone2. Visual review
   independently found a real Radix Fragment/Slottable regression that dropped
   anchor styling; direct keyed children and anchor-specific assertions fix it.
3. The next attempt passed the primitive case but failed a hardcoded expectation
   that the red icon equals the destructive background (1 passed,1 failed,
   7 not run,1.6m). The existing danger foreground is `#A11D22`, not `#B4232F`.
   Correct the test's token expectation, not the palette or contrast threshold.

The same bounded visual correction moves maximum-width containment to the base
layer so caller utilities such as max-w-entry still win. The final command
above reruns all nine affected cases against the rebuilt source. No earlier
failed or unexecuted case is marked passed without a subsequent real run.

First desktop/mobile/utility frames and final corrected anchors, Leads header,
development details, destructive confirmation and Finance/mobile frames were
opened. Safe captures/geometry are under ignored
`frontend/output/playwright/action-buttons/`; the icon and detail regressions
also refresh their existing ignored folders. The gallery is a test-only SSR
fixture using actual compiled styles, not a new route, app feature or screenshot
rendered as an application page. No further aesthetic polish loop or unrelated
AFTER-only finding is applied.

### Scoped antislop delivery gate

- Hard gate PASS: actual functions/labels/data and established assets retained;
  no invented Delete/Convert/Excel feature, credentials or fake product claims.
- R-03/R-25/R-32 PASS:52 route-width checks, five primitive widths, native200%,
  touch/keyboard/focus,44px targets and minimum measured5.536:1 text contrast.
- R-26/R-35 PASS: actual Link navigation, creation, proposal/stage changes,
  authentication lifecycle and relevant dialogs/retry are executed above.
  This does not claim285 separate business mutations were tested.
- Purpose/liveliness/quality locks PASS: roles, color/icon reasons and reviewed
  exceptions are mapped above. Existing KAY identity and1/1/1 dials remain;
  no new motion, font, kit, chart geometry or unselected audit-only change.

The full manual database integration/release workflow was not executed and is
not passed by this quick UI check. It remains required before real customer-data
release and must never run against production. Product review remains Khalid's.

### Final focused boundary checks

```powershell
$env:KAY_E2E_PRODUCTION='1'
Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue
npm.cmd run test:chrome -- tests/e2e/imports.spec.ts tests/review/iconsax.chrome.spec.ts --grep 'SP18 AT-20/23|real Next HTML before hydration' --reporter=list
```

Result:2/2 passed,0 skipped,1.0m. The import case now explicitly opens the
approval dialog, uses the newly styled Revenir à l’aperçu button, verifies its
icon and restored trigger focus, then approves the actual corrected synthetic
batch and verifies atomic counts/agent mapping and agent denial. The second case
checks real Next HTML before hydration, disabled JavaScript, authenticated shell
and no external icon requests. Final lint/typecheck are rerun after these test
additions and pass. Eleven focused cases pass across the two final selections;
this remains distinct from the unexecuted complete database/release workflow.

Test servers are stopped after verification; no project listener or runtime
service remains. Shared PostgreSQL5432 and Codex tool workers are retained.
HEAD stays4e073a9 on fix/production-settings-ci. Nothing is committed or pushed.
