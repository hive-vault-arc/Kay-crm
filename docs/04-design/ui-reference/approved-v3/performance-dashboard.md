# Performance-dashboard refinement

2026-10-16. Owner-requested UI-only override of the dashboard KPI/pipeline/chart
presentation. The owner explicitly confirmed existing totals only, not new daily
worked-Lead/Deal metrics. Keep this and all pending UI work local; do not push.

## Scope and decisions

Reading this as KAY's operative staff dashboard, retaining French/ivory/gold/city
identity and ENERGY1 / RHYTHM1 / MOTION1. Design-system-ops supplies geometry;
antislop applies DURING. The supplied screenshot defines hierarchy, not new
business rules, status labels, fields or invented analytical data. The marketing
concept/asset workflow does not apply. Existing shadcn, Tailwind, Iconsax and
Bklit remain the sources; no new dependency, font, image or global palette.

- Neutral grouped KPI strip instead of colored filled tiles: current contacts
  and active deals, then selected-period enquiries, wins and M/A-only collections.
  Existing semantic colors accent only icons/values, not whole card surfaces.
  Group headings use a restrained neutral fill and existing border/radius roles.
- Keep date controls above the summary. Existing period validation, preserved
  input on read failures, exact decimal MAD formatting, Casablanca dates, scope
  text and actual metric labels/definitions remain unchanged.
- Two current distribution funnels replace pipeline bars. Bklit stacked bars
  supply the real geometry/data scale; a square rotation and funnel clip produce
  the requested silhouette. Each segment's height reflects its current count.
  Every stage/value remains in the legend, including zero counts. Empty scope
  shows an honest empty state, not illustrative or minimum-size fake segments.
- This is not a conversion cohort. Stage order is unchanged, stages can be
  skipped and later stages can outnumber earlier ones. No percentages, monotonic
  coercion, fabricated drop-off or visitor/signup stages are introduced. The
  pinned Bklit cohort FunnelChart treats its first value as100%, so this uses the
  allowed composition/extension of the already installed Bklit BarChart instead.
- `valueDomain` allows exact total bounds without altering ordinary chart
  defaults. The local Bklit horizontal stack correction measures a segment from
  its cumulative start to cumulative end, not subtracting its start from its
  individual value. Zero and unequal values must retain correct width and order.
- Immediately below the funnels, three separate stacked distributions show
  recorded actions by true actor, unreopened wins by responsible agent at close,
  and current active contacts by current responsible agent. Do not sum these
  different units or label contacts as worked Leads. Each stack has ten displayed
  contributors per numbered page, its displayed total and exact colored table;
  the all-record total and filtered drill-down remain available. No groups are
  silently discarded. Focus exposes the actual contributor tooltip; Enter/touch
  opens the same attribution/period intersection as before.
- Existing tasks, inbox, other metrics, alerts and visit follow-up remain below
  the performance section. They remain visible when reporting fails. No local
  service-status widget is restored; authorized audit access remains in the city
  header. Existing unpictured routes are not restyled by this local override.

## Verification scope

Focused checks use the existing guarded synthetic local database only. The
additional layout fixture creates actual versioned enquiry states and deals
through existing authenticated endpoints, not hardcoded application data.
API/table/stack/funnel count and geometry parity, manager/agent scope, finance
denial, copied attribution, periods, empty/loading/error/denied/retry, keyboard,
touch, long names, responsive widths and native200% Chrome zoom are in scope.

Real daily worked-Lead/Deal series, physical mobile/assistive-technology testing,
whole-CRM regression, full database release workflow and production verification
are not claimed by this UI refinement. No production access or deployment.

## Actual verification

From `frontend/`, final `npm.cmd run lint`, `npm.cmd run typecheck` and
`npm.cmd run build` pass with no reported warnings/errors. The icon inventory
is29 semantic exports,24 consumers,45 sites,0 violations; all chart geometry
remains outside the interface-icon inventory. No package/lockfile change.

First compiled headed selection:

```powershell
$env:KAY_E2E_PRODUCTION='1'
Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue
npm.cmd run test:chrome -- tests/e2e/performance-layout.spec.ts tests/e2e/reports.spec.ts tests/review/reports.chrome.spec.ts tests/e2e/dashboard-header.spec.ts --reporter=list --max-failures=1
```

Result:6 passed,1 failed,3.6m. Header/agent/audit/native zoom, actual API/table/
stack/funnel count parity, dates, copied attribution, finance denial, private
counts, retained dates and report failure/denial/retry passed. The broad review
failed its first contrast measurement:1.404:1. The helper was incorrectly parsing
the three OKLab coordinates of the translucent neutral heading as0–255 RGB.
This failure is retained, not marked passed or hidden with a lower threshold.

One batched visual correction equalizes funnel panel heights, places recorded
actions across the full team row and gives contributor names75% of table width.
The contrast helper now normalizes browser CSS Color4 via an sRGB canvas and
composites alpha over ancestors. It still requires4.5:1, no overflow and44px
controls. Actual normalized input is
`oklab(0.961298 0.000209361 0.00700092 / 0.4)`, not an invented RGB value.

Final affected-case rerun against the rebuilt app:

```powershell
$env:KAY_E2E_PRODUCTION='1'
Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue
npm.cmd run test:chrome -- tests/e2e/performance-layout.spec.ts tests/review/reports.chrome.spec.ts --reporter=list --max-failures=1
```

Result:2/2 passed,0 skipped,2.3m. This reruns the corrected broad report review
and the new layout/parity case, extended with11-contributor synthetic browser
pagination: displayed totals55 then11, original total66, ten then one stack
segments, Next/Previous restoring the correct table and graph. The real-data
parity and drill-down cases remain separate from this browser-only edge fixture.

Observed Chrome155: widths320/360/390/768/1024/1440 plus1280, no page/SVG overflow,
minimum measured normal-text contrast5.536:1, controls at least44px, native zoom
DPR2→4 and innerWidth1427→713. Table focus opens the correct contributor tooltip;
Escape closes it, Enter/touch opens real attributed records and closing returns
focus. All KPI drill-downs and alert controls are exercised. Real empty periods,
retained inputs during loading, interrupted read recovery, forbidden finance/
private attribution and agent scope remain covered. Expected injected network
failure/403 are recorded; unexpected console/page errors are empty.

Initial desktop/mobile/funnel/team PNGs were opened together, then the corrected
funnel/team/mobile PNGs were opened in the single confirmation pass. Safe captures
are under ignored `frontend/output/playwright/performance/`; the broad scoped
review also refreshes `frontend/output/playwright/sp17-*.png`. Captures use only
synthetic records, no password fields, traces or production connections.

## Scoped antislop gate

| Gate | Result and evidence |
|---|---|
| Hard gates | PASS: no new fabricated metrics/statuses/features/people; real authorized data and controls; responsive/zoom/contrast/keyboard/touch and loading/empty/error/denied recovery verified. No new theme, FAQ, testimonial, dead action or em-dash UI copy. |
| Purpose | PASS: neutral summary reduces filled-color emphasis; funnel silhouettes implement the explicit reference without implying conversion; separate stacks answer who contributed to each existing metric. No arbitrary animation, gradients, illustrations or decorative icons added. |
| Liveliness | PASS:1/1/1 dials preserve KAY city/ivory/gold identity, title/summary/pipeline/team hierarchy and structural spacing; color identifies real metric/stage/contributor series rather than decorating card bodies. |
| Craft/quality | PASS: shared shadcn/Tailwind/Iconsax and licensed Bklit reused; exact legends/tables/page totals/drill-downs retained; real and synthetic edge checks distinguished; bounded visual correction and affected rerun pass. One manual detector returned[], not human product acceptance. |

The separate full database-dependent release suites were not executed or passed
by this task and remain mandatory before real customer data. Product acceptance
remains the owner's. Pending UI work is uncommitted/unpublished.

Final shutdown check:0 project listeners on3000/3001/3100/3101/8000/8001/8100/
8101/8102/8200/8201/8202 and0 project Node/Python service processes. Shared
PostgreSQL5432 is preserved. `git diff --check` passes, backend working diff is
empty and HEAD remains4e073a9. Nothing committed, pushed or deployed by this task.
