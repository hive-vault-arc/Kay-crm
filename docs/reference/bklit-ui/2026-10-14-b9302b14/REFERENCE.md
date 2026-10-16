# Bklit UI: pinned chart documentation

Status: offline upstream reference, not an installed KAY dependency  
Date: 2026-10-14  
Confirmed decision: KAY will use Bklit UI for charts in its Next.js interface.  
Technical proposal: choose only the chart types that express KAY's approved KPI definitions.  
References: [official documentation](https://bklit.com/docs), [components catalogue](https://bklit.com/docs/components), [installation](https://bklit.com/docs/installation), [source repository](https://github.com/bklit/bklit-ui), [KAY chart guide](../../../04-design/charts.md).

The official Bklit UI docs do not have a published versioned archive. This copy comes from repository commit [`b9302b144a4ce091c076e192f3cfc3b2bd6b8c9c`](https://github.com/bklit/bklit-ui/tree/b9302b144a4ce091c076e192f3cfc3b2bd6b8c9c), the `main` head collected on 2026-10-14. The site documentation is [34 MDX pages plus 4 navigation JSON files](apps/web/content/docs/). The snapshot also includes [289 `packages/ui` files](packages/ui/) with chart source and registry definitions, [59 generated registry JSON files](apps/web/public/r/), and [14 chart preview SVGs](apps/web/public/svgs/). Their original repository paths are preserved. The copied code and documentation are covered by the repository [MIT license](LICENSE); the [Studio license](LICENSE-STUDIO.md) is separate, and no Studio code was copied.

These files are source, not a rendered offline website. MDX previews and some examples import components from the monorepo, so open the [live pages](https://bklit.com/docs/components) for interactive behavior. The registry JSON shows what the CLI installs. Do not treat `@bklitui/ui/charts` imports in the site's examples as a published app dependency: `packages/ui/package.json` marks that package private. After `shadcn add`, use the generated local component paths in the KAY app.

## Start here

Read [Introduction](apps/web/content/docs/index.mdx), [Installation](apps/web/content/docs/installation.mdx), [Components](apps/web/content/docs/components/index.mdx), and [Theming](apps/web/content/docs/theming.mdx). The [component navigation metadata](apps/web/content/docs/components/meta.json) gives the authoritative order. Bklit UI builds on shadcn/ui and installs components from the `@bklit` registry into the application.

For a Next.js app with shadcn/ui initialized, the documented install pattern is:

```bash
npx shadcn@latest add @bklit/line-chart
```

If `@bklit` is not already configured, add the official namespace to the app's `components.json`:

```json
{
  "registries": {
    "@bklit": "https://ui.bklit.com/r/{name}.json"
  }
}
```

The registry's generated JSON lists each component's source files and dependencies. Inspect the [line-chart registry item](apps/web/public/r/line-chart.json) as an example. This is documentation only; no install command has been run in KAY.

## All available chart pages

Use the linked local page for API, data shape, usage, and installation details. On the live site, choose the same name from [Components](https://bklit.com/docs/components). The registry install name is `@bklit/<page-slug>` for each row.

| Chart | What it displays |
|---|---|
| [Area Chart](apps/web/content/docs/components/area-chart.mdx) | Time series with filled areas |
| [Bar Chart](apps/web/content/docs/components/bar-chart.mdx) | Categorical, grouped, stacked, or horizontal bars |
| [Candlestick Chart](apps/web/content/docs/components/candlestick-chart.mdx) | Open-high-low-close financial series |
| [Choropleth Chart](apps/web/content/docs/components/choropleth-chart.mdx) | Values by geographic region |
| [Composed Chart](apps/web/content/docs/components/composed-chart.mdx) | Bars, lines, and areas on a shared time axis |
| [Funnel Chart](apps/web/content/docs/components/funnel-chart.mdx) | Counts across process stages |
| [Gauge](apps/web/content/docs/components/gauge-chart.mdx) | Radial or linear progress against a scale |
| [Heatmap Chart](apps/web/content/docs/components/heatmap-chart.mdx) | Intensity across a grid of bins |
| [Line Chart](apps/web/content/docs/components/line-chart.mdx) | One or more time-series lines |
| [Live Line Chart](apps/web/content/docs/components/live-line-chart.mdx) | Streaming time-series values |
| [Pie Chart](apps/web/content/docs/components/pie-chart.mdx) | Part-to-whole slices or donut segments |
| [Profit/Loss Line](apps/web/content/docs/components/profit-loss-line.mdx) | Signed values around a zero baseline |
| [Radar Chart](apps/web/content/docs/components/radar-chart.mdx) | Multiple metrics on radial axes |
| [Ring Chart](apps/web/content/docs/components/ring-chart.mdx) | One or more circular progress indicators |
| [Sankey Chart](apps/web/content/docs/components/sankey-chart.mdx) | Quantities flowing between nodes |
| [Scatter Chart](apps/web/content/docs/components/scatter-chart.mdx) | Points across two measured dimensions |
| [Sunburst Chart](apps/web/content/docs/components/sunburst-chart.mdx) | Hierarchical part-to-whole segments |

Shared chart building blocks have their own pages: [axes](apps/web/content/docs/utility/axis/index.mdx), [background](apps/web/content/docs/utility/background.mdx), [brush](apps/web/content/docs/utility/brush.mdx), [grid](apps/web/content/docs/utility/grid.mdx), [legend](apps/web/content/docs/utility/legend.mdx), [tooltip](apps/web/content/docs/utility/tooltip.mdx), [reference area](apps/web/content/docs/utility/reference-area.mdx), [projection line](apps/web/content/docs/utility/projection-line.mdx), [custom indicator](apps/web/content/docs/utility/custom-indicator.mdx), and [useChart](apps/web/content/docs/utility/use-chart.mdx).

The [online chart gallery](https://bklit.com/charts) shows rendered examples. Studio links in upstream pages lead to a separately licensed online tool and are not part of this offline copy. This pinned snapshot does not update automatically.
