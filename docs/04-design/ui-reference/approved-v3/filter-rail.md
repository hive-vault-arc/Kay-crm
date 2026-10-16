# Left directory filters

2026-10-16. Explicit owner request: put page search and filters to the left of
the results, beside navigation, using the supplied other-CRM examples for this
layout only. Keep KAY's existing fields, data, French labels and functionality.

## Coverage

| Surface | Existing controls moved | Presentation |
|---|---|---|
| `/leads` | Name/phone/email, status, source, date range, sort, authorized agent picker, page size, apply/reset | Left rail or Sheet |
| `/deals` | Search, stage, offer kind, modified dates, sort, authorized agent picker, archive, page size, apply/reset | Same shared pattern |
| `/projects`, Biens indépendants | Reference/name/location, category, offer kind/state, archive, sort, page size, apply/reset | Same shared pattern |
| `/projects`, Programmes immobiliers | Programme search/category/whole-programme offer, archive, existing submit | Same shared pattern; no invented reset/status controls |
| `/leads?view=contacts` | Name/phone/email and authorized archive state | Same shared pattern; archive still applies immediately |
| Contact record, Demandes and Affaires | Existing scoped forms and queries | Inline; no second rail |
| Shared shell | Global search, navigation, account/logout | Unchanged |

`FilterResultsLayout` owns the rail/Sheet and results relationship. One active
form tree prevents duplicate IDs and ambiguous labels. Parent-controlled main
drafts, selected agent ID and its real display label survive drawer closure and
breakpoint changes; applied-filter indication reflects submitted values, not
drafts. Invalid dates leave the drawer open. Native disclosure expansion and
the AgentPicker's auxiliary search/page reset when its drawer subtree unmounts;
the selected ID/label and main filter values do not.

At1280px+, `layout.filterPanel=256` maps through the existing JSON/theme system
to `--layout-filter-panel`, with24px to the flexible results column. The rail
has16px padding, visible labels, single-column controls and bounded sticky
scrolling. Below1280px a real shadcn Sheet provides title/description, close,
Escape, focus trap and focus return. Breakpoint transitions close an open modal
and transfer filter focus instead of leaving a stale overlay. Existing table
columns stay intact, inside their named horizontal scroller. The shared
`ScrollableResultsTable` displays the existing helper based on actual overflow,
not an unrelated full-viewport breakpoint.

The reference's extra checkboxes/statuses, project/budget filters, imagery,
counts, data and decoration are not imported. No backend, API, permission,
authentication, date/currency, dependency, icon or chart change. The optional
AgentPicker label is display metadata returned by the existing real selector,
never a permission or request-field substitute.

## Spatial thesis and skills

Reading this as KAY's French staff CRM, within Approved V3: ENERGY2 / RHYTHM2 /
MOTION1. Creation remains the gold focal action. Search, refinement and apply
belong together; results and pagination form the adjacent work region. The
256/24 split separates these tasks without boxing every result. Neutral V3
surfaces, existing system type and black/gold navigation preserve KAY identity.
No decorative animation, new asset, marketing section or new color is added.

Design-system-ops and responsive standards govern the shared geometry and
44px targets. Antislop is applied DURING, as requested; no unselected AFTER-only
finding is applied. Dense CRM surfaces are excluded by design-taste-frontend's
scope check. Uncodixfy and existing React guidance preserve restrained controls
and module-level composition. Impeccable uses the existing session context,
layout and craft-floor guidance. Two isolated pre-edit assessments identify
draft/selection persistence, one form tree, intermediate table overflow and
modal focus as the key risks. One scoped pre-edit detector invocation returns
`[]`, exit0; it is not visual or behavioral proof and is not rerun under the
session's once-only scan rule.

## Verification

These are current scoped results, not historical V3/list-header evidence or a
claim of complete-product acceptance.

Corrections retained in the evidence trail:

- Initial setup failed before inspecting layout because createLead assumes an
  agent, while the fixture was an administrator with no assignee. A real
  synthetic agent now creates the Lead; no assignment rule is weakened.
- The first populated five-view case passed; the next failed because the held
  assignment-options test handler was removed without awaiting its completion.
  Awaiting unrouteAll(wait) fixes that harness race, not application transport.
- The next case exposed a real drawer-to-rail focus loss. The breakpoint
  subscription now captures focus before notifying React, then restores it
  after the new form mounts.
- The initial nine-frame inspection found the date error below a long mobile
  panel's viewport. The existing alert now precedes its action buttons; the
  strengthened test requires the alert in the actual viewport.
- An added test selected a guessed mixed programme-filter option. That option
  is not in the existing directory selector. The attempt was interrupted,
  not counted as a pass. The final test operates the actual rendered choices
  and verifies their real GET parameters; no reference-only UI feature is added.

The application correction batch is limited to focus transfer and error-message
placement. Screenshot confirmation checks those changes and the same directory
families, not an open-ended redesign or a fresh complete-product audit.

### Final actual checks

| Check | Result |
|---|---|
| `npm.cmd run lint` | exit0, no warnings;27 semantic icons/21 consumers/40 sites/0 violations |
| `npm.cmd run typecheck` | exit0, including the final expanded test source |
| `npm.cmd run build` | exit0, no warnings, final application source |
| Compiled isolated headed Chrome selection below | **7/7 passed in3.0m**,0 skipped; two new rail cases and five existing/extended regression cases |
| Populated directory case |47.6s; all five directories, seven widths, every existing selector and valid date control, actual corresponding GET parameters/status200, search/apply/reset, immediate contact archive |
| Mobile persistence/permission case |20.9s; invalid date message in viewport, selection label retained while options loading, breakpoint focus, no stale modal, Escape/focus trap, real touch and agent-hidden privileged controls |
| Existing Lead/Deal regressions |51-Lead numbered pages/column persistence;11-Deal creation/pages/counts/filter/columns and inaccessible-record404 |
| Existing header regressions | Gold creation, compact utilities, loading/error/retry, real destinations and agent touch controls retained |
| Native Chrome review |28.0s; all five filter drawers submit/reopen/retain input/Escape at actual200%;713px CSS width versus1427px baseline, DPR4 versus2, outer overflow false |
| Client privacy scan |4 roots/352 JS,0 configured facade-secret/0 signing-key occurrences |
| Source boundary | No backend, dependency manifest/lock or API contract change; `git diff --check` exits0 |

Run from `frontend/`:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
$env:KAY_E2E_PRODUCTION='1'
Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue
npm.cmd run test:chrome -- tests/e2e/filter-rail.spec.ts tests/e2e/leads.spec.ts tests/e2e/deals.spec.ts tests/e2e/list-header-actions.spec.ts tests/review/chrome.spec.ts --grep 'filter rail|numbered pages, scoped filters|SP11: list creation|list header actions|visible Chrome, touch' --max-failures=1
node scripts/scan-client-secrets.mjs
```

Application build is after both source corrections. Subsequent edits only expand
tests/documentation; focused test ESLint/typecheck and a final full lint also pass.
The seven-test result is one fresh successful selection, not a sum that hides the
earlier failed/interrupted attempts above. No test is skipped to obtain it.

### Click-through and visual evidence

All five directories are exercised at320/360/768/1024/1279/1280/1440px. Visible
controls fit the rail, are at least44px, and produce no duplicate IDs or outer
page overflow. Desktop results align with the rail top and its24px gap. At1280px
the populated Lead/Deal tables scroll by keyboard with the overflow hint visible.

The following are real interactions, not handler-presence claims:

- Search on each directory submits the actual query, resets page1 and produces
  an empty result; supported reset or clear/search restores populated results.
- Advanced/agent/archive disclosures open. Every existing select is operated,
  including status/source/stage/offer/category/stock/archive/sort/page-size and
  the actual allowed agent. Valid date inputs submit their matching parameters.
  Single-page agent-picker navigation is correctly disabled, not a fake action.
- Contact archive changes results immediately, without requiring search submit.
- Drawer close/reopen retains main drafts and selected agent label/ID even while
  the options request is held. Invalid dates retain the drawer and show the
  actual message in view. Shift+Tab/Tab trap focus; Escape and touch close return
  it to the trigger. Resize transfers the focused search between drawer/rail.
- Agent views omit privileged agent/import controls and project creation.
- Native200% Chrome repeats real submit/reopen/Escape on all five drawers, and
  activates both retained gold creation links by Enter.
- Existing numbered pages, column preferences, Contacts/Import/Exports routes,
  export confirmation/cancel and real error retry remain operable.
- The contact-record Demandes tab is verified live without a rail. Affaires uses
  the same inline prop, verified in source; no new per-state record test claimed.

Nine initial actual frames were inspected together: all five populated desktop
views, two mobile drawers, invalid state and empty Leads. One confirmation batch
inspects the corrected mobile error, remaining four empty families, loading/error
and all five native-zoom drawers. They preserve KAY's black navigation, gold
creation, neutral project bodies and real data, while adopting only the supplied
reference's left-filter topology. The corrected error is now visible before
Apply. No further visual redesign is made after that confirmation.

Credential-free synthetic captures are in `frontend/output/playwright/filter-rail/`
(`*-1440.png`, two `*-360.png`, five `*-empty.png`, `leads-mobile-invalid.png`).
Current loading/error frames are in `output/playwright/list-header-actions/`.
The five `output/playwright/filter-rail-Filtres-*-zoom-200.png` frames use native
Chrome viewport capture (`Page.captureScreenshot`, fromSurface false), avoiding
the previously documented cropped zoom screenshot path. The measured713x425 CSS
viewport produces2854x1702 pixels. Long drawers intentionally scroll; a viewport
capture is not an assertion that all scrolled fields are visible simultaneously.
The native review's collected unexpected console/page error array is empty;
the separate held/aborted list request is an intentional fault test with recovery.

## During-work antislop delivery gate

Scope is the changed directory layout and reachable controls, not a new audit of
the whole CRM. All checks pass for that scope; earlier AFTER-only findings remain
unselected. Existing token contrast pairs are retained: primary on white14.94:1,
deep-gold link/focus on white6.50:1; no color token changes in this rail task.

| Item | Status and concrete evidence/purpose |
|---|---|
| R-02 | PASS: new labels/messages contain no em dash. |
| R-03 | PASS: seven widths; no outer/control overflow,44px targets; tables have explicit local scrolling. |
| R-17 | PASS: totals remain actual scoped API values; only guarded synthetic fixtures in evidence. |
| R-18 | PASS: no testimonial/fictional endorsement introduced. |
| R-23 | PASS: owner explicitly chooses the left-filter topology; existing KAY assets retained. |
| R-24 | PASS: no navigation destination added; existing header destinations exercised. |
| R-25 | PASS: retained checked semantic contrast pairs; visible labels and inherited focus styling reviewed in actual frames. |
| R-26 | PASS: every moved selector/input/action is operated; matching real requests/status200, reset/close/retry evidenced above. |
| R-27 | PASS: populated/empty on all five views; held loading, failed request and successful retry on Leads. |
| R-28 | PASS: no FAQ introduced. |
| R-32 | PASS: Tab/Shift+Tab trap, Enter, Escape, focus return, breakpoint transfer and table ArrowRight verified. |
| R-33 | PASS: source changes use apply_patch; no runtime CSS/source patcher. |
| R-34 | PASS: approved light workspace/black navigation retained; no unsupported theme toggle. |
| R-35 | PASS: final build and7/7 real headed tests; itemized click-through and two actual inspection batches above. |
| R-36 | PASS: exact failures/results/limits retained; no deployment/performance/security certification invented. |
| R-37 | PASS: owner's layout references plus KAY V3 and explicit2/2/1 design read govern the change. |
| R-38 | PASS: no fabricated product feature or mockup dataset rendered as real application data. |
| R-01 | PASS: existing palette; no gradient added. |
| R-04 | PASS: existing Iconsax controls retained; icon guard0 violations. |
| R-06 | PASS: existing readable system type, no display face or tracked uppercase added. |
| R-07 | PASS: no background pattern added. |
| R-08 | PASS: no decorative arrow added; existing table/navigation arrows retain real actions. |
| R-09 | PASS: no new decorative badge; applied-filter text reflects submitted values. |
| R-10 | PASS: no glass/blur added. |
| R-12 | PASS: rail has one border; Sheet uses the existing modal elevation to separate protected focus. |
| R-13 | PASS: no glow added; focus ring remains functional. |
| R-14 | PASS: no feature-card template; existing inventory cards retain actual record meaning. |
| R-19 | PASS: only existing Sheet state transition; no decorative motion added. |
| R-22 | PASS: no illustration added; private photo/fallback behavior unchanged. |
| R-05 | PASS: refine on left, review results on right follows the owner's operating task, not a marketing scaffold. |
| R-11 | PASS: existing shadcn/V3 radius roles retained. |
| R-15 | PASS: existing French domain-specific apply/search/reset labels retained. |
| R-16 | PASS: no marketing copy added. |
| R-20 | PASS: KAY logo/black navigation/gold creation and existing neutral record styling retained. |
| R-21 | PASS: requested light V3 remains; no category-driven dark redesign. |
| R-29 | PASS: no new palette color; existing semantic data/status colors unchanged. |
| R-30 | PASS: only explicitly requested reference topology used; other CRM branding/features not copied. |
| R-31 | PASS:256px rail fits existing controls;24px gap separates tasks; Sheet protects result width on narrow screens. |
| C-1 | PASS: shared spatial roles answer the explicit request; no unrelated geometry/style change. |
| C-2 | PASS: real GETs, retained handlers and request outcomes, not dummy filters. |
| C-3 | PASS: only existing fields/results; no reference-only section. |
| C-4 | PASS: responsive/modal/invalid/loading/empty/error and keyboard/touch behavior verified within stated scope. |
| C-5 | PASS: fresh final results distinguished from failures and historical checks. |
| Liveliness | PASS:2/2/1 dials, creation focal point, structural16/24px rhythm and repeated KAY identity retained. |

## Limits and handoff

No full backend suite, five-browser matrix, physical-phone/Safari certification,
assistive-technology user study or new per-state screenshot for every directory
is claimed. No further functional limitation was found in the focused rail checks.
The auxiliary picker search/page and native disclosure expansion reset on remount
as disclosed above; main drafts and selected agent remain. Dense tables scroll
locally when necessary rather than discarding columns. Impeccable's previously
reported optional metadata drift/wider DESIGN.md merge remains outside this task.
Changes remain local/uncommitted/unpushed on `ui/sidebar-account-footer`; no deploy.

Final read-only shutdown check:0 listeners on the eleven known development/test
service ports and0 root-identified KAY service processes. The two identified
Codex execution helpers are not app servers and are preserved. Shared PostgreSQL
5432 remains available; no shared database/container or unrelated process stopped.
