# Riviera shared-brand implementation, 2026-10-18

## Scope and authority

User supplied `kay-riviera.css`, `kay-riviera.tokens.json` and the10-page branding
PDF, and confirmed applying colors, fonts and shared components while retaining
existing CRM layouts, French wording, Iconsax and real metrics. No backend,
migration, API, permissions, business-rule, customer-data or deployment change.
The guide's mock allocations, Lucide references and copy are not new requirements.

All10 guide pages were rendered and visually inspected. The exact191-token
source and original CSS/PDF are preserved in `branding/riviera/`. Shared roles
resolve to that source; aliases fail closed on missing/cyclic definitions.
All60 declared opaque contrast pairs were independently recalculated in tests.
These pairs are not a claim of whole-application WCAG conformance.

The official OFL TTF source archive matches the embedded version pins:
Fraunces 1.000, Manrope 4.505 and DM Sans 4.004. Current `next/font/local`
runtime sources are Fraunces/DM Sans WOFF2 and Manrope TTF. Their embedded
versions were independently checked with Next's bundled font parser. The
concurrently added Manrope WOFF2 is version 4.504; it is preserved but unused,
so the runtime retains the supplied 4.505 pin. Original licenses and the TTF
SHA256 source manifest are retained; browsers do not fetch Google.

## Coverage

| Shared layer | Coverage |
|---|---|
| Root theme | Every existing authenticated, auth, simulator and state route |
| Shell | Sidebar surface, selected tile/chevron, focus and text roles |
| shadcn controls | Buttons, fields, radio/checkbox, dialogs, disabled/focus/error states |
| Records and forms | Existing panels, sections, tables, metadata and semantic feedback |
| Reporting | Snapshot/period KPI groups, category badges, Bklit funnel/contributor fills |
| Documentation | DESIGN, design-system, styling, components, chart guide, V3 override and branding index |

Existing route composition, filter rails, stacked/paired details, auth artwork,
logos, control names, chart geometry/data alternatives and MAD/Casablanca stay.
Concurrent owner-workspace shell/collapse/search edits are preserved, not claimed
as features implemented by this branding slice.

## Verification ledger

- `npm.cmd run lint`: passed, no icon/button inventory violations or ESLint warnings.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run build`: passed, including normal and isolated `.next-e2e` builds.
- `npm.cmd run test:unit`:49/49 passed, including4 new Riviera cases (191 exports,
  60 contrast pairs, alias failures and actual runtime font-version pins).
- `node scripts/scan-client-secrets.mjs`: passed.
- `node .github/scripts/repository-check.mjs`:8250 indexed files,0 forbidden/oversized,
  14 ignore probes. This index check does not stage or publish untracked assets.
- One Impeccable detector invocation over changed shared UI targets: exit0, `[]`.
- Browser work uses visible installed Chrome, real local test API/worker and the
  existing exclusive isolated PostgreSQL fixture lease. Never production.
- Initial browser runs found obsolete pre-Riviera RGB expectations and a missing
  required agent in the new test fixture; these harness expectations were corrected.
- A separate concurrent production build replaced `.next/static` mid-browser-run
  (BUILD_ID changed at01:41:56 UTC), invalidating later script/style loading. That
  interrupted run is not recorded as passed. Dedicated ignored Riviera config
  uses `.next-e2e` to avoid sharing the production build output.
- A subsequent separate suite occupied8100/8101/3100; no lease bypass, concurrent
  fixture cleanup, process termination or reuseExistingServer workaround was used.

## Final verification, 2026-10-18

- `npm.cmd run lint`: passed; Iconsax 43 exports / 37 consumers / 154 sites,
  and 296 buttons across 96 files, 0 violations.
- `npm.cmd run typecheck`: passed. `npm.cmd run test:unit`: 49/49 passed.
- `npm.cmd run build`: passed with all app routes generated.
- Headed Chrome `npm.cmd run test:chrome -- tests/e2e/riviera.spec.ts --reporter=list`:
  1/1 passed in 53.9s. Seventeen authenticated routes were checked at 1440px
  and 360px for geometry, contrast, touch size, current fonts, no loading/error
  residue, and no browser errors; no Google font requests. Selected desktop and
  mobile captures are in `frontend/output/playwright/riviera/`.
- Headed Chrome `npm.cmd run test:chrome -- tests/e2e/shell.spec.ts --reporter=list`:
  5/5 passed in 1.3m, including keyboard collapse/reopen (224px / 72px),
  retained route/search access, mobile sheet focus, long French labels, touch,
  responsive geometry and unknown-route recovery.
- The first Riviera run measured a chart before its debounced resize settled.
  The geometry helper now waits two animation frames and 20ms before sampling;
  the same 17-route run then passed without masking persistent overflow.
- Impeccable detector: `impeccable detect --json frontend/src
  branding/kay-ui-tokens.json`, exit 0, `[]`; raw result is saved as
  `.impeccable/riviera-detector.json`. AFTER026 records 0 new numbered findings.

Screenshots were visually reviewed at the dashboard (desktop/mobile), Leads,
deal detail and Projects. The dashboard photo remains beside its title on desktop
and follows the copy on mobile. Empty Projects and synthetic Leads show no
invented counts. Existing report-state, actual 200% zoom and chart/accessibility
evidence from the prior scoped run remain separate; this task does not claim every
CRM state was re-tested at every viewport or cross-browser completion.

All browser data was synthetic and confined to the guarded isolated test target.
Human product/design acceptance remains Khalid's. The collapsed width remains a
72px implementation proposal pending that review. No push, deployment, real-data
operation or backend file suite was requested or run.

## Skills and review boundary

Main read antislop, design-system-ops and its geometry/interaction/visual references,
design-taste-frontend, Impeccable, uncodixfy, relevant React guidance and PDF guidance.
Dense CRM/admin/table/form surfaces exclude design-taste's marketing concept/raster
workflow. System-first shared components are reused. ENERGY1/RHYTHM1/MOTION1.
Owner's AFTER audit remains selection-gated; no unrelated aesthetic findings are
silently applied. Technical regression repairs remain in scope. Human product
acceptance remains separate from static checks and browser evidence.

## Additional isolated verification and final review

The branding pass independently rebuilt the final font-pinned source into both
`.next` and `.next-e2e`. Lint, typecheck,49/49 units and normal production build
passed after the Manrope4.505 correction. No application source was changed
after that final build. Later changes affect tests and documentation only.

Using the ignored `frontend/output/playwright/riviera.config.ts`, compiled
`.next-e2e`, `KAY_E2E_PRODUCTION=1`, installed headed Chrome and the real isolated
API/worker,12 distinct targeted cases have passing final evidence:

| Test file | Passing cases | Exercised boundary |
|---|---:|---|
| `riviera.spec.ts` | 1 | Empty login and17 authorized routes at1440/360; fonts, geometry, contrast, targets and no console/page errors |
| `action-buttons.spec.ts` | 2 | Server-rendered semantic-action gallery at320–1440; disabled/hover/focus/pressed states; real CRM route families, forms/dialogs and destinations |
| `performance-layout.spec.ts` | 1 | Neutral KPIs, live funnel distributions, contributor totals, accessible alternatives and pagination |
| `account-footer.spec.ts` | 3 | Long account names, responsive navigation, pending/failed logout, keyboard retry/session revocation and mobile touch logout |
| `list-header-actions.spec.ts` | 2 | Honey creation/quiet utilities, actual destinations, agent permissions and mobile touch |
| `dashboard-header.spec.ts` | 3 | Borderless city panel at320–1440, direct audit access/agent denial and actual200% Chrome zoom/search focus |

These are successful scoped reruns, not one fabricated all-green12-case command.
The8-case navigation/header/list command passed7 and exposed a hardcoded test
cleanup root. The zoom rerun then exposed absent Chrome profile preferences.
The guard now validates the configured output root, and the disposable zoom
profile uses a short deterministic child path inside that root. The final
zoom-only rerun passed1/1 in26.6s; synthetic profile cleanup remains enabled.
The semantic gallery's former rest-color assertion also failed correctly on a
hovered anchor; explicit hover/disabled/rest assertions now pass1/1 in21.6s.
No production color, authorization or TLS check was relaxed for these repairs.

A final fresh `.next-e2e` rebuild and `account-footer.spec.ts riviera.spec.ts`
rerun passed4/4 in1.2m, covering the concurrently preserved collapsed-account
accessibility adjustment as well as the complete17-route desktop/mobile sweep.
The refreshed dashboard and empty-field mobile login captures were reopened.
Final post-test lint/typecheck passed; no retained Chrome profile or test
listener on3100/8100/8101 remained at handoff.

Actual additional invocations from `frontend/` used
`npm.cmd exec playwright test -- --config=output/playwright/riviera.config.ts`
with, respectively: `riviera.spec.ts action-buttons.spec.ts`,
`action-buttons.spec.ts --grep "every semantic action"`,
`account-footer.spec.ts list-header-actions.spec.ts dashboard-header.spec.ts`,
and `dashboard-header.spec.ts --grep "actual 200%"`.
The performance case passed in its earlier isolated two-file run. The existing
tracked Chrome config can run these same specs after a normal build; the ignored
config only separates build/output directories and retains the fixture lease.

All10 current Riviera PNGs were opened alongside all10 supplied guide pages.
Captures reside in `frontend/output/playwright/riviera/`: login desktop/mobile,
dashboard desktop/mobile, Leads desktop, Lead detail desktop/mobile, Deal detail
desktop and Projects desktop/mobile. They contain synthetic records only; login
fields are empty. Viewport captures are not full-page evidence of every field.

Fresh independent finish review accepted the palette, typography and shared
components. Its initial dashboard-composition concern was withdrawn after
comparison with the supplied CSS's explicit copy/media grid and mobile stack;
the final bounded disposition was `ship`, without another UI correction.
The independent documenter verified current DESIGN frontmatter and schema-v2
sidecar,31 source colors,5 type roles,6 component previews and all variable
references. This is not Khalid's human visual/product acceptance.

The scoped detector invocation over5 changed shared UI targets returned `[]`.
A concurrent editor separately recorded the broader detector result above;
these are separate invocations, not a claim that only one occurred repository-wide.
No optional aesthetic finding was selected or silently implemented. See
[AFTER026](../../anti-slop/audit-026-2026-10-18.md).

Final client-secret scan:4 roots,500 browser JS files,0 configured facade/signing
secret matches. Repository/index check:8250 files,0 forbidden/oversized and14
ignore probes; untracked assets remain unstaged. No production connection, push,
deployment or customer-data operation occurred. ClamAV/file-transfer suites,
the full backend regression and a new cross-browser/physical-device matrix were
not executed, not passed, for this frontend-only branding change.

## Dashboard reference correction (2026-10-18)

The newer owner-provided 1448×1086 CRM screenshot supersedes the earlier
title/photo split. The dashboard now uses the full-width banner, ivory title
fade, notification/account sheets, compact API-scope/date/create toolbar,
current/period KPI groups and paired pipeline panels. The tablet toolbar has a
dedicated 560–1023px grid so scope, date/apply and create controls stay in a
predictable reading order. The CRM retains its real scope, inclusive dates,
live counts, permissions, Bklit charts, and existing links/actions. Terminal
Lead statuses remain visible in a separate compact legend, not silently dropped.
Empty funnels use a plain explanatory state rather than a colored fake chart.

The supplied dashboard file is a full interface screenshot, not a clean hero
photo; the existing `frontend/public/images/dashboard-city.png` is retained,
so the banner photograph is not pixel-identical to the reference. No sample
counts or agent identities from that screenshot are recreated. The refreshed
target-size capture and responsive captures are under ignored
`frontend/output/playwright/dashboard-header/`, including
`dashboard-reference-1448x1086.png`, `dashboard-768.png`, `dashboard-360.png`
and `dashboard-zoom-200.png`; all were visually opened after the final change.

Final checks from `frontend/`: `npm.cmd run lint`, `npm.cmd run typecheck` and
`npm.cmd run build` pass. Visible isolated Chrome passed
`npm.cmd run test:chrome -- tests/e2e/dashboard-header.spec.ts --max-failures=1 --reporter=list`
(3/3), the combined dashboard-header/performance-layout run (4/4), and
`npm.cmd run test:chrome -- tests/e2e/auth.spec.ts --grep "AT-39: agent/manager Settings denial" --max-failures=1 --reporter=list`
(1/1). The performance case verifies API-backed funnel counts and terminal
status legends; the role case verifies assigned/shared versus agency scope and
Settings denial. These are focused synthetic checks, not human product
acceptance or full-system, physical-device, or cross-browser release approval.
