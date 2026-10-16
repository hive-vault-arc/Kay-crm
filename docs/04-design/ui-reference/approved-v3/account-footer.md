# Sidebar account footer

Latest appearance: the owner's subsequent [pure-black sidebar refinement](#pure-black-sidebar-refinement)
changes the shared sidebar background only. Earlier execution counts below remain
their original runs; current screenshots are refreshed by the follow-up checks.

2026-10-16. Explicit owner-requested refinement of Approved V3, based on
`main` at `1fd30e8`. This record covers only the account location change, not
a fresh certification of the entire CRM or permission to deploy/publish it.

## Implemented coverage

| Surface | Change and evidence |
|---|---|
| All workspace routes using `AppShell` | Shared `AccountFooter` replaces the desktop sidebar name/password link; header no longer duplicates account information or logout. |
| Desktop sidebar | Existing initials, full authenticated display name and current French role, followed by one plain `Se déconnecter` button. |
| Mobile navigation Sheet | Same footer anchored below navigation, scroll-reachable on short screens; keyboard containment, Escape and focus return retained. |
| Header | Existing working search and notifications retained; no new profile action or dropdown invented. |
| `/change-password` | Route, restricted-session redirect, password workflow and standalone logout retained; removed only its desktop/mobile sidebar links. |
| Logout states | Existing pending/disabled, failure/retry and real revocation behavior retained; pending text wraps and sidebar errors use existing readable danger tokens. |

`account-footer.tsx` owns presentation; `session-controls.tsx` receives optional
styling props without changing its sign-out implementation. No backend,
migration, API, permission, dependency, icon or business-rule change. Existing
shadcn Button/Sheet, Tailwind utilities, Iconsax, V3 tokens and chart code remain.

## Verification

From `frontend/`, actual successful commands:

- `npm.cmd run lint`: exit0, zero warnings; icon guard27 semantic icons,
  21 consumers,40 sites, zero violations.
- `npm.cmd run typecheck`: exit0, Next route generation and TypeScript.
- `npm.cmd run build`: exit0, no build warnings.
- The headed Chrome command below: **13/13 passed,3.1m** against the compiled
  frontend and real isolated local API/PostgreSQL, not mocked authentication.
- `git diff --check`: pass; `git diff --name-only -- backend`: no changed paths.

```powershell
$env:KAY_E2E_PRODUCTION='1'
Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue
npm.cmd run test:chrome -- tests/e2e/account-footer.spec.ts tests/e2e/shell.spec.ts tests/e2e/auth.spec.ts tests/e2e/inventory.spec.ts tests/review/chrome.spec.ts --grep 'account footer|@shell|protected redirect|restricted change|late inventory denial|failed logout|visible Chrome, touch|SP-03: visible login' --max-failures=1
```

The three new cases cover administrator/manager/agent identity; a160-character
name;320/360/768/1024/1440px widths;360x480px short drawer;44px targets;
no horizontal overflow; absent header duplicates and password links; real
pending state; an intentionally failed logout with authenticated session still
valid; keyboard retry; touch logout; and actual401 after revocation.

Existing focused cases pass protected redirects, cookie refresh/replay,
restricted-password validation/fresh login, late-denial/logout races, unavailable
API recovery, navigation permissions, modal focus, unknown-route recovery and
actual native Chrome200% zoom. Zoom measured713px CSS width versus1427px
baseline, device-pixel ratio4 versus2 and no overflow. The native review's
collected console/page errors are empty, including hydration.

Explicit synthetic captures are under
`frontend/output/playwright/account-footer/`: `desktop.png`, `mobile.png`,
`long-name-1440.png`, `long-name-360.png`, `short-drawer.png`, `pending.png`,
`logout-error.png`. All seven inspected in one batch; no UI defect required a
second implementation pass. Screenshot readiness was tightened to wait for the
settled empty Leads result; a focused confirmation refreshes these captures.
No password-bearing screenshot, trace, real client record or cookie is published.

Confirmation: `npm.cmd run test:chrome -- tests/e2e/account-footer.spec.ts
--max-failures=1` with the same production environment passes **3/3 in51.4s**.
These repeat three of the13 cases, not three additional distinct scenarios.
Settled desktop/mobile captures and the actual200% dashboard frame were inspected
in the single confirmation batch. Lint/typecheck were rerun afterward and exit0.
Final read-only checks find zero project service listeners and zero KAY service
processes; shared PostgreSQL is not stopped. Changes remain local on
`ui/sidebar-account-footer`, uncommitted and unpushed.

## During-work design/antislop gate

Scope: changed account/header/sidebar controls, not an unrelated whole-app audit.
Operate mode preserves Approved V3's charcoal rail, neutral canvas and restrained
gold selection. Descriptive dials: ENERGY2 / RHYTHM2 / MOTION1; no new motion.
Shared control size44px and existing12/16px spacing are reused. Two independent
skill-required layout/mechanical assessments informed wrapping, hydration waits,
footer flex placement and readable failure feedback. The one required scoped
Impeccable detector run returned `[]`; no detector-driven redesign was applied.

| Gate | Evidence |
|---|---|
| R-02 PASS | No em-dash copy added. |
| R-03 PASS | Width and short-height Chrome checks plus seven inspected captures show no overflow. |
| R-17 PASS | No statistics or performance/customer claims added. |
| R-18 PASS | No testimonials added; test identities explicitly synthetic. |
| R-23 PASS | Existing authenticated initials/name/role moved at the owner's request; no new asset/navigation. |
| R-24 PASS | No link introduced; removed both requested sidebar password links. |
| R-25 PASS | Existing V3 text tokens retained; danger text on pale danger surface measured6.73:1. |
| R-26 PASS | Plain logout invokes the existing real action; keyboard/touch/retry revoke the session. |
| R-27 PASS | Hydration-disabled, pending and failure states verified; no new empty-data surface. |
| R-28 PASS | No FAQ added. |
| R-32 PASS | Enter logout, drawer Escape/containment/focus return and visible inherited focus styling verified. |
| R-33 PASS | Changes made directly in owned source; no runtime source/CSS patcher. |
| R-34 PASS | No theme toggle or second theme added. |
| R-35 PASS | Successful build and real headed Chrome interactions recorded above. |
| R-36 PASS | Security claims limited to actual session checks; no compliance/deployment claim. |
| R-37 PASS | Existing Approved V3 direction retained, not an undirected redesign. |
| R-38 PASS | Production identity comes from the real authenticated user, not mockup text. |
| R-01/R-04/R-06/R-07/R-08/R-09/R-10/R-12/R-13/R-14/R-19/R-22 PASS | No gradient, icon, typeface, pattern, arrow, badge, glass, shadow, glow, card grid, animation or illustration introduced. |
| Liveliness PASS | Existing V3 density/identity and gold selected-navigation focal point retained; flexible space separates navigation and account actions. |
| C-1 PASS | Account placement follows the explicit request; spacing/colors reuse existing tokens. |
| C-2 PASS | One working logout button, no fictitious profile action. |
| C-3 PASS | Footer contains only account identity and the requested action. |
| C-4 PASS | Long labels, short drawer, multiple widths, keyboard/touch, pending/failure and200% zoom pass. |
| C-5 PASS | No fabricated content or success claims. |
| R-05/R-11/R-15/R-16/R-20/R-21/R-29/R-30/R-31 PASS | Existing KAY composition, control radii, exact French action label, approved palette and light/charcoal identity retained; no template, marketing copy or replacement visual world. |

## Limits

No new full backend suite, full CRM browser matrix or cloud test was run for
this UI-only change. Shared-shell source covers every workspace route, but each
route was not independently recaptured. Headed isolated Chrome is verified;
Firefox/WebKit/Edge are not newly certified. Existing wider AFTER-audit findings
and DESIGN.md approval remain separate, with no unselected finding applied.
Impeccable reports legacy PRODUCT.md/config metadata; no optional init or buildPath
repair was performed as a side effect of this task.

## Pure-black sidebar refinement

2026-10-16 follow-up request: match the sidebar to the logo's black background.
The sole new runtime change is `color.surface.sidebar: #272727 -> #000000` in
`branding/kay-ui-tokens.json`. Existing semantic Tailwind mapping applies it to
both the desktop `aside` and mobile navigation Sheet on every workspace route.
The logo artwork, white labels, gold selection/hover/focus, footer placement,
buttons, main canvas, typography, dimensions and business behavior are unchanged.
The explicit request overrides only the older charcoal-sidebar direction; the
narrow exception is recorded in DESIGN.md and the design-system guide.

Design read: existing French CRM for KAY staff, restrained Approved V3 with a
black navigation rail; ENERGY2 / RHYTHM2 / MOTION1 remain unchanged.
Design-system-ops preserves existing geometry; antislop core/UI/human apply
during the change. Impeccable's colorize/craft-floor rules preserve current
semantic roles. Design-taste-frontend was read and its dense CRM/admin exclusion
applies: no marketing workflow, generated asset, motion or alternative kit.
Previously loaded Impeccable context is retained, not repeatedly rerun; no new
TSX component edit or repeated manual detector invocation is claimed.

Regression assertions check exact computed black at320/360/768/1024/1440px,
including the touch drawer, and preserve selected Prospects fill `#413A2D`.
The installed contrast helper, using the explicit backend venv interpreter,
calculates white/black21.00:1,80%-white role text/black13.08:1,
gold focus/black9.17:1 and selected gold/selected fill8.12:1, all passing AA.
Dividers remain decorative, not the sole identification of controls or state.

Scoped during-work gate delta (the unchanged checks in the report above remain
source-preserved, not claims of a new whole-CRM audit):

- R-03/C-4 PASS: responsive widths, wrapping and short drawer remain covered by the
  focused account-footer cases; no geometry is edited.
- R-25 PASS: changed surface/foreground pairings pass the computed ratios above;
  selected/hover roles retain their original values and text/aria-current cues.
- R-26/R-27/R-32 PASS: existing working logout, pending, error/retry, keyboard and touch
  controls are exercised, not replaced by decorative controls.
- R-01/R-21/R-29/R-31/C-1 PASS: one semantic surface remapped at the owner's explicit
  request to visually merge with the real logo; no general dark theme invented.
- R-23/R-33/R-36/R-38/C-5 PASS: no image editing, source-patching helper, invented data,
  new feature, security claim or externally hosted asset introduced.
- Liveliness/R-05/R-11/R-20/R-30/C-3 PASS: current KAY identity, selection accent,
  hierarchy, radii and structural spacing are retained, not redesigned.

Actual final verification: lint/typecheck/build all exit0, with no warnings;
icon guard27/21/40 and0 violations. The following headed isolated Chrome command
against the rebuilt production frontend passes **4/4 in1.1m** (three account
footer cases plus the real200% zoom/native review):

```powershell
$env:KAY_E2E_PRODUCTION='1'
Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue
npm.cmd run test:chrome -- tests/e2e/account-footer.spec.ts tests/review/chrome.spec.ts --grep 'account footer|visible Chrome, touch' --max-failures=1
```

Six refreshed synthetic captures (desktop, mobile, desktop long name, short
drawer, pending and failed logout) inspected as one batch: logo and sidebar
merge on black; white/gold text, selected item and error alert remain readable.
No UI defect required a correction/confirmation round. Actual zoom is713px CSS
width versus1427px baseline, ratio4 versus2 and no horizontal overflow. The
native review reports no collected console/page errors. An in-memory structural
comparison against HEAD confirms every other theme value is unchanged.
`git diff --check` passes. No backend/API/permission change or new dependency;
no full browser/backend matrix claimed. Local only, no commit/push/deployment.
