# Dashboard city-header refinement

2026-10-16. Owner-requested local UI refinement, not a deployment or approval of
unselected AFTER-audit findings. Pending UI work must not be pushed.

## Current owner request: remove both header controls

The supplied outline identifies `Vérifier à nouveau` and `Journal d’audit`.
The first was already removed with the local diagnostic widget. Remove the
remaining audit shortcut from the dashboard PageHeader, including unused
imports, without hiding controls through CSS or leaving an empty action wrapper.
The direct `/dashboard?view=audit` route, its manager/administrator access and
agent denial stay intact. Other headers, actions and dashboard data stay intact.

This is subtraction within the existing KAY city-header composition, not a new
design: ENERGY1 / RHYTHM1 / MOTION1, antislop DURING, existing design-system
geometry. The reason is the owner's explicit request to simplify that strip.
No replacement icon, control, status, asset, token or dependency is introduced.
Historical sections below describe the earlier stages, not current shortcuts.

Verification of this final header-control removal, from `frontend/`:

- `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`: exit0,
  no reported warnings/errors. Current button inventory:284 sites/94 files,
  275 semantic mappings/5 existing icon controls/4 data exceptions/0 violations.
- `KAY_E2E_PRODUCTION=1 npm.cmd run test:chrome -- tests/e2e/dashboard-header.spec.ts tests/e2e/discovery.spec.ts --grep 'Dashboard header:|SP19 AT22/24/29' --reporter=list --max-failures=1`:
  4/4 passed,0 skipped,1.5m, visible isolated Chrome on the compiled application.
- Both removed controls and any empty action wrapper are absent. All five
  320–1440px widths retain the loaded borderless city image,112/128px minimum
  heights and no page overflow. Native200% zoom retains the image and no controls.
  Actual desktop/mobile/200% screenshots were opened and inspected.
- Direct audit access returns200 for the administrator. Its Back link returns
  to the dashboard by Enter and mobile touch. An agent still sees denial on
  that direct route and receives API403. At200%, existing global search opens
  by Enter, closes by Escape and restores focus. Main review console/page errors0.
- The affected SP19 regression also passes real scoped search, CSV export,
  archive/restore and audit-event display. Its stale header navigation now uses
  the retained direct route; no test or authorization coverage is deleted.
- Final cleanup:0 project listeners on3000/3001/3100/3101/8000/8001/8100/8101/
  8102/8200/8201/8202 and0 project Node/Python service processes. Shared PostgreSQL
  on5432 remains. No backend/CI working diff; HEAD4e073a9. No commit or push.

Scoped antislop delivery gate:

- Hard gates PASS: requested control subtraction only; no new copy, assets,
  claims, data, theme or interactive element. Responsive/zoom/no-overflow and
  retained keyboard/touch/audit-denial checks pass. Existing data states remain.
- Purpose gates PASS: title-only city strip directly serves the owner's request;
  no new decoration, palette, typography, spacing or motion decision.
- Liveliness PASS: existing1/1/1 dials, KAY city photograph, title hierarchy and
  black/gold shell remain visible in actual inspected desktop/mobile captures.
- Craft/quality PASS: direct source removal, no CSS hiding, unused imports gone,
  no empty toolbar; build and all four focused checks pass. Permission/API and
  other-header implementations are untouched.

Limits: focused synthetic checks, not physical-device/assistive-technology
testing or a whole-CRM retest. The separate full database integration/release
workflow is not executed and not passed; it remains required before real
customer data and must never run against production.

## Subsequent owner request: remove local diagnostics

The owner then requests removing the circled `Service local disponible` display
before production. The complete local readiness widget, including its loading/
error presentation and `Vérifier à nouveau` action, is removed from this header.
Its now-unused component is removed rather than hidden or shipped behind a test
flag. The authorized `Journal d’audit` action remains; agents have no empty
action wrapper. This is a presentation refinement, not a production-readiness
certification. Existing1/1/1 dials, city photo, tokens and other dashboard content
remain unchanged, following the design-system/antislop DURING scope.

No backend, health endpoint, HTTPS facade, TLS, session, permission, migration,
database validation or monitoring safeguard changes. Normal dashboard loading,
empty and error/retry states remain. Tests now wait for actual authorized
pipeline content rather than a retired development label. The integration case
keeps real readiness status/body/cache/request-ID validation and real503 during
API shutdown, with loading/error/keyboard recovery checked on CRM reports.
The broad Chrome review retains its real outage/touch recovery too.

Final verification for the diagnostic removal:

- `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`: exit0,
  no reported warnings/errors; unchanged icon inventory,0 violations.
- Compiled visible isolated Chrome command from `frontend/`:
  `KAY_E2E_PRODUCTION=1 npm.cmd run test:chrome -- tests/e2e/dashboard-header.spec.ts tests/e2e/integration.spec.ts tests/review/chrome.spec.ts --grep 'Dashboard header:|SP-02: real HTTPS|AT-23: visible Chrome' --reporter=list --max-failures=1`:
  5/5 passed,0 skipped,1.7m.
- No status/retry/connection region or browser readiness request on the normal
  dashboard. Audit still works by keyboard and touch; agents cannot see it.
  All five320–1440px widths and native200% zoom have no page overflow.
- Real delayed reports show loading; API shutdown produces the existing report
  error/retry state and health503; restart returns health200 and keyboard/touch
  report retry restores loaded content. Header cleanup does not hide data errors.
- Refreshed1440/768/360px and native200% captures are in the same ignored
  dashboard-header directory. Desktop/mobile were opened together; the city
  header remains readable and aligned with only the authorized audit action.
  Tablet and native200% viewport captures were also opened.
- Final cleanup:0 project listeners on3000/3001/3100/3101/8000/8001/8100/8101/
  8102/8200/8201/8202 and0 project Node/Python service processes. Shared PostgreSQL
  on5432 is preserved. No backend working diff; HEAD remains4e073a9.
  `git diff --check` passes. No UI commit or push.
- Scope/antislop gate PASS: explicit owner-requested subtraction only, existing
  KAY identity/geometry/data/actions retained, no invented claims/features/assets,
  real loading/empty/error/recovery and input-mode checks. No new design system,
  theme, palette, font, chart, icon, dependency or backend change.

These are focused synthetic UI/integration checks, not execution or a pass of
the separate full database-dependent release workflow. That workflow remains
required before real customer data. No production connection or deployment.

The sections below record the earlier strip-only change and its successful
verification before this subsequent removal. Their local-status interactions
and old unavailable screenshot are historical, not current UI behavior.

## Original scope and purpose

The supplied red outline identifies the dashboard title/city strip. Treating
that as the scope, not extending the photograph behind the whole dashboard,
preserves legibility of the existing data surfaces. Reading this as an operative
French CRM dashboard in KAY's existing light/gold/city identity: ENERGY1 /
RHYTHM1 / MOTION1. Antislop applies DURING; design-system-ops governs geometry.

- Remove only the strip's outer border and radius, making the photo flush at
  its edges rather than enclosing it in another card.
- Increase the existing minimum height by16px:112px below768px,128px from768px.
  These are existing Tailwind spacing steps, not new feature-local tokens.
- Enlarge the existing city photo5% with static scale and object-cover. It
  reaches all four edges and remains clipped inside the strip. No new image,
  animation, crop file or raster editing is introduced.
- Keep the existing readability overlay, fonts, padding, wrapping, actions and
  main-page gutters. The decorative image retains an empty alt attribute.
- Scope the change in shared `PageHeader` to `/dashboard` with title `Tableau
  de bord`. Audit and all other consumers keep their ordinary layout.
- Preserve real KPI/pipeline data, Bklit charts, loading/empty/error states,
  role-scoped descriptions and manager/admin-only audit visibility.

## Coverage and verification

From `frontend/`, `npm.cmd run lint`, `npm.cmd run typecheck` and
`npm.cmd run build` pass with no reported warnings/errors. Icon inventory is
unchanged:29 exports,23 consumers,45 sites,0 violations. The final test-only
capture/zoom additions also pass lint/typecheck.

Focused visible isolated Chrome command:

```powershell
$env:KAY_E2E_PRODUCTION='1'
Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue
npm.cmd run test:chrome -- tests/e2e/dashboard-header.spec.ts --reporter=list --max-failures=1
```

The initial two cases passed2/2 in40.3s. The final selection passed3/3 in52.9s,
with0 skipped and no unexpected console/page errors. It adds actual200%
Chrome zoom and waits for loaded pipelines before desktop/mobile captures.
The viewport capture avoids compressing the mobile header into a full-page
image. These evidence refinements do not change application code.

| Surface/state | Check |
|---|---|
| Dashboard at320/360/768/1024/1440px | Zero border/radius,112/128px minimum height, loaded decorative image covers all four edges, static1.05 scale, no page overflow,44px actions fit. |
| Administrator header | Keyboard retry returns healthy status; Tab/Enter opens the real audit view; audit has no city image. |
| Synthetic503 and recovery | Existing unavailable message/action remains visible and wraps; removing only the synthetic health response allows retry to recover. |
| Touch360px | Real synthetic sign-in, retry and audit navigation work. |
| Agent header | Existing own/shared scope text retained; audit action absent; borderless city strip retained. |
| Native200% Chrome zoom | Verified from devicePixelRatio/innerWidth, no page overflow, city visible, retry and audit keyboard actions work. |

Captures are under ignored `frontend/output/playwright/dashboard-header/`.
Final1440/768/360px,320px unavailable and native200% viewport captures were
opened together; the strip fills its bounds without a card outline, and title/
actions wrap legibly. No application correction was needed after inspection.
No credential fields, real records or production connection are captured.
The harness uses the existing guarded synthetic database and cleans its actors.
Final listener/process checks show0 project listeners on3000/3001/3100/3101/
8000/8001/8100/8101/8102/8200/8201/8202 and0 project Node/Python service
processes. Shared PostgreSQL5432 remains running. `git diff --check` passes.

## Scoped antislop gate

| Gate | Result and evidence |
|---|---|
| Hard gates | PASS: existing French copy/real actions/data retained; no invented features or assets; responsive/touch/keyboard/error/recovery checks exercise this strip. No new theme, testimonial, FAQ or em-dash copy. |
| Purpose | PASS: removing the outline implements the marked request;16px height/5% image enlargement makes the city more present without obscuring data. Existing overlay serves readability, not new decoration. |
| Liveliness | PASS: explicit1/1/1 dials; the KAY city/ivory/gold identity and dashboard title remain the focal hierarchy, with unchanged structural spacing and no added motion. |
| Craft/quality | PASS: existing shared PageHeader/shadcn/Tailwind controls reused; no API/auth/permission/chart change; bounded desktop/mobile visual inspection and focused compiled Chrome checks. One manual detector invocation returned[], not product acceptance. |

Limitations: Chrome responsive emulation, not physical mobile or assistive-
technology user testing. This is not a whole-CRM retest. Full database-dependent
release suites remain separately required before real customer data; this
focused synthetic UI check does not substitute for them. No push or deployment.
