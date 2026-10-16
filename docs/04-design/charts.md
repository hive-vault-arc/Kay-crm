# KAY charts with Bklit UI

Status: SP-17 local Bklit bar source installed; scoped verification in execution ledger  
Date: 2026-10-14  
Confirmed decision: use Bklit UI for every KAY frontend chart; no substitute chart library without a new KAY decision.  
Technical proposals: chart choices, data contracts, and validation below.  
References: [KAY component guide](ui-components.md), [KAY design system](design-system.md), [Tailwind styling guide](styling.md), [KPI rules](../02-requirements/business-rules.md), [API contracts](api-contracts.md), [acceptance tests](../05-quality/acceptance-tests.md), [offline Bklit reference](../reference/bklit-ui/2026-10-14-b9302b14/REFERENCE.md), [official Bklit installation](https://bklit.com/docs/installation).

Bklit UI is a shadcn registry for React chart components. It is the sole KAY chart-component source: do not create a parallel chart layer with shadcn/ui Charts, Recharts, Chart.js, ApexCharts, or another library. Bklit's own implementation dependencies are not a separate KAY chart choice. Use Bklit for visual presentation of approved KAY metrics. When a required view is missing, first compose or extend Bklit components; if that cannot satisfy the requirement, ask KAY to decide before changing libraries. FastAPI still defines and scopes every KPI; browser chart code must not calculate privileged totals from unrestricted records. Shadcn/ui remains the source for ordinary controls, layout, and forms.

## Registry installation

First initialize shadcn/ui as described in the [KAY component guide](ui-components.md). Then, from the app directory, check `components.json` for the `@bklit` registry. If absent, add `"@bklit": "https://ui.bklit.com/r/{name}.json"` under `registries`. The [official installation page](https://bklit.com/docs/installation) shows this configuration and the install command.

```bash
npx shadcn@latest add @bklit/line-chart
```

Use the chart slug from the [full catalogue](../reference/bklit-ui/2026-10-14-b9302b14/REFERENCE.md#all-available-chart-pages) to add another type, such as `@bklit/bar-chart`. The CLI copies the selected chart and its registry dependencies into the app and installs package dependencies. Review the proposed files and dependency changes before committing them. Pin versions in the real frontend once validated; `@latest` is for the documented interactive setup, not a repeatable CI build.

The upstream examples import from `@bklitui/ui/charts` because they run inside Bklit's monorepo. After registry installation, inspect the generated files under the app's configured component directory and import from those local paths. For example, the pinned registry item targets `components/charts/line-chart.tsx`, `components/charts/grid.tsx`, `components/charts/x-axis.tsx`, and `components/charts/tooltip/`. A KAY component can compose `LineChart`, `Line`, `Grid`, `XAxis`, and `ChartTooltip` from those files, then pass it the authorized, already aggregated time-series response. Follow the [line chart usage page](../reference/bklit-ui/2026-10-14-b9302b14/apps/web/content/docs/components/line-chart.mdx) for prop details.

SP-17 ran pinned shadcn4.21.5 add @bklit/bar-chart --yes --overwrite.
Imports resolve local generated files, not the private monorepo package.
The [local contract](dashboard-local.md) records exact dependency versions, KAY
token mapping and scoped registry lint integration exceptions.

## Chart choices for the core dashboard

| KAY question | Candidate | Condition before use |
|---|---|---|
| How do closed deals, visits, or activity change over time? | [Line](../reference/bklit-ui/2026-10-14-b9302b14/apps/web/content/docs/components/line-chart.mdx) or [Area](../reference/bklit-ui/2026-10-14-b9302b14/apps/web/content/docs/components/area-chart.mdx) | Choose a period and time bucket; use the responsible agent at close for results and the true actor for activity. |
| How do counts compare across agents, deal states, property categories, or offering target levels? | [Bar](../reference/bklit-ui/2026-10-14-b9302b14/apps/web/content/docs/components/bar-chart.mdx) | Define the denominator and scope. Count developments, physical units, and whole-development/unit offerings separately; a template is not a unit. An agent sees only permitted data. |
| How do deal stages compare? | [Bar](../reference/bklit-ui/2026-10-14-b9302b14/apps/web/content/docs/components/bar-chart.mdx); [Funnel](../reference/bklit-ui/2026-10-14-b9302b14/apps/web/content/docs/components/funnel-chart.mdx) only if the cohort definition supports it | Stages are skippable, so stage counts must not imply that every deal passed through every stage. |
| When does activity cluster? | [Heatmap](../reference/bklit-ui/2026-10-14-b9302b14/apps/web/content/docs/components/heatmap-chart.mdx) | Use relevant calendar bins; show exact values and a readable legend. |
| What share of a mutually exclusive total belongs to each category? | [Pie](../reference/bklit-ui/2026-10-14-b9302b14/apps/web/content/docs/components/pie-chart.mdx) or [Ring](../reference/bklit-ui/2026-10-14-b9302b14/apps/web/content/docs/components/ring-chart.mdx) | Do not label sale versus rental offerings as a partition of physical properties because one property can have both. |

The other chart types remain available in the [offline catalogue](../reference/bklit-ui/2026-10-14-b9302b14/REFERENCE.md#all-available-chart-pages), but KAY should not add them without a real analytical question and valid input data. In particular, Live Line needs a streaming metric that the current core does not require; Candlestick and Profit/Loss Line represent financial series unlike KAY's recorded commissions. Geographic and flow charts require defined geography or flow data and privacy review.

## Data, appearance, and verification

The chart API response should carry its metric definition, period, bucket timezone (`Africa/Casablanca`), unit (`MAD` for money), and authorized series. Keep money calculations exact in the backend; format values for display in the frontend. Handle empty, loading, error, and denied responses. Provide a textual value or accessible table alongside charts so color or hover is not the only way to read a result. On mobile, verify labels, legend, tooltips, and touch behavior without horizontal overflow.

Bklit uses its own `--chart-*` CSS variables. See the [theming reference](../reference/bklit-ui/2026-10-14-b9302b14/apps/web/content/docs/theming.mdx). Map them to the [proposed chart tokens](../../branding/kay-ui-tokens.json) using the approved local light-token/Radix-New York baseline; do not adopt demo colors as a final palette. Test both themes only if KAY ships a theme switch. Chart animation must not obstruct the data and should respect reduced-motion preferences.

For acceptance, compare every plotted value with the API response and a tabular rendering using synthetic data. Test agent and manager scopes, date boundaries, empty series, zero totals, large labels, French formatting, keyboard access, touch, zoom, and responsive behavior. SP-17 implements the first local Bklit bar wrappers; actual scoped checks and remaining review are recorded in [execution](../03-planning/sprints/sp-17-execution.md) and the [local reporting contract](dashboard-local.md). This does not approve every catalogue chart or the final visual system.
