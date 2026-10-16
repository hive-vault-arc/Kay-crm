# Bklit registry source

Installed2026-10-15 using shadcn4.21.5 add @bklit/bar-chart --yes --overwrite.
Reviewed official https://ui.bklit.com/r/{name}.json registry and the pinned
2026-10-14-b9302b14 reference. Transitive items: chart-context/chart-animation,
grid/chart-tooltip/utils/patterns/chart-parent-size/chart-utils. No Studio code.
56 local source/license files; cn utils remains semantically identical.

Live bar-chart/chart-animation/chart-tooltip source differs from the pinned
reference; registry review found component/lifecycle/tooltip code, no network,
eval, shell or dangerous HTML behavior. Pattern URLs are SVG namespace/license
references. Imported runtime libraries are Bklit-required visx4.0.0,
motion14.3.0, d3-array3.2.4 and @number-flow/react0.6.2, exactly pinned and locked.
These are Bklit implementation dependencies, not a substitute chart library.

Registry internals retain source; exceptions are explicitly scoped in ESLint to
five integration rules only under this directory. KAY wrappers remain outside
that exception. See docs/04-design/dashboard-local.md and SP-17 execution.
Registry CSS demo palette/dark mode was replaced with existing KAY variables in
globals.css; no registry CSS is an approved new KAY palette. MIT notice is in
LICENSE-Bklit; upstream visx pattern notice remains patterns/LICENSE-visx-pattern.
