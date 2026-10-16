# Local dashboard reporting (SP-17)

Implemented technical projection,2026-10-15; product review pending Khalid.
C10/C13/C14, BR-05/18/19/28/29; AT-18/19 and dashboard AT-36/39.
These concrete metric/date/scope details are implementation proposals, not new
commercial rules. Existing session, shared inventory and finance permissions win.

## API and period

Authenticated facade-only GET /api/v1/reports/dashboard, /reports/activities,
/reports/exceptions and /reports/drill-down. No writes, cache or public override.
Strict queries reject duplicates/unknown keys, invalid dates and caller roles.
Period dates start_on/end_on are inclusive, supplied together,1900–2100 and at
most366 days; default current Casablanca calendar month. Python's pinned zoneinfo
resolves activity UTC bounds, not browser or PostgreSQL's differing timezone data.
Each response identifies now/today/time_zone/scope; period reports also carry
start_on/end_on. READ ONLY REPEATABLE READ preserves one request snapshot.

Dashboard metrics have key/label/total/value/unit/basis/denominator/series.
Numbers are absolute, denominator=none. Money is an exact decimal string, MAD;
count values are integer strings. The three Bklit chart series group contacts by
current primary, unreopened wins by immutable primary at close, and recorded
timeline actions by actor_user_id. Current staff display labels do not rewrite
immutable names or IDs in the underlying assignment/outcome/activity history.
Series points are id/label/value; all groups are returned, ten at a time plotted
and tabulated in the UI, not a misleading truncated agency total.

Drill-down requires metric and optionally attribution_id plus the same period;
page/page_size are bounded1–1000000/1–100, default1/50. Stable label/id ordering,
total/has_next/has_previous and a repeated metric projection describe the exact
filtered SQL rowset. The optional attribution is a further intersection, never
authority. Activities is the same drill-down with metric fixed to activities.
Items expose only id,label,kind,href,attribution_label,value. Links resolve actual
contact/Lead/deal/property/development records; collections link Finance.

## Definitions and authorization

- Contacts: active canonical identities, current primary assignment.
- Active deals: current new/visit/negotiation/reserved/documents, same contact
  scope; no assumption that every deal traverses every stage.
- Enquiries: received_at in the period, separate from canonical contacts.
- Won/lost/cancelled: completed_on in the period, no linked reopening. Original
  outcomes remain immutable; re-closing contributes only its current outcome.
- Activities: timeline_event in the server-resolved period, attributed to true
  actor. Exclude automatic stock flags and contact-merge propagation, not real
  collaborator actions. No activity is inferred from views or external systems.
- Programmes, standalone physical assets, physical programme units, current
  property offerings and whole-development offerings are separate dimensions.
  Sale/rental campaigns do not create extra physical units. No blocks/floors/types
  are presented as transactable stock.
- Collections (M/A only): sum valid unsuperseded nonvoid receipt leaves by
  received_on. Never sum all historical corrections or infer income from sale
  prices, expected commissions, external stock results or recognition alone.

Scope is applied before count/group/sum/page. Agent contact scope is current
primary or active collaborator. Report inventory is the exact offering set linked
from accessible deals or shortlists; parent programme may be counted, but a whole
programme link never expands to all its children. This conservative proposal
does not change separately shared Projects access. No private owner/contact
fields appear in inventory projections. Agents cannot request collections even
through a copied filter or an otherwise accessible deal. M/A reports are agency
wide within the explicit metric's active-contact/stock definition.

## Exceptions

GET exceptions kind=stale_inventory|inactive_deals, with numbered pages. No date
filter: these are explicitly current alerts, not historical snapshots.
30/14 thresholds use elapsed UTC days inclusive, not browser calendar rounding.
Available stale campaigns trigger at30days without reconfirmation: physical
targets deduplicate multiple stale sale/rental campaigns; whole-development
offering alerts remain separate. Inactive active deals use latest explicit
deal-linked timeline activity (excluding automatic flags/merge propagation),
or creation if none, at14days. Unrelated contact notes do not reset all deals.
No alert withdraws, loses, releases or closes anything. Inventory state/overlap
rules remain in the stock command module.

## UI and implementation

Existing French Dashboard/tasks/inbox/follow-up remain. The owner subsequently
removed the local-service status/retry widget, not the backend health endpoints.
Flat
date/metric/chart/table/exception sections use shadcn controls, Tailwind semantic
tokens, exact MAD/date formatters and numbered pages. Current vs period basis,
attribution and lack of rate denominator are explicit. Failed/denied/loading
reports preserve the shell and period input. Chart code is lazy-loaded.

The later UI-only [performance refinement](ui-reference/approved-v3/performance-dashboard.md)
uses a neutral grouped KPI strip, current-distribution funnel silhouettes and
stacked contributions per metric. Current contacts, period actions and period
wins remain distinct definitions, never one combined total or invented daily
worked-Lead/Deal series. Existing exact API/table/attribution/drill-down and
ten-contributor pagination contracts stay authoritative.

The pinned shadcn4.21.5 CLI installs reviewed @bklit/bar-chart and transitive
registry source locally (56 files plus equivalent cn utility). Bklit MIT and
vendored visx-pattern license are retained. Registry SVG/portal refs and lifecycle
effects require scoped lint exceptions only in components/charts: refs,
set-state-in-effect, exhaustive-deps, no-unused-vars and no-explicit-any. All KAY
wrappers retain full application rules. No React Compiler is enabled. This is a
documented integration trade-off, not a global disable or alternate chart stack.

Registry demo palette, dark overrides and malformed four-hyphen theme mappings
are removed. --chart-* maps only existing KAY semantic colors; chart height16rem
is a shared geometry role (32 units of the8px rhythm), not per-screen offsets.
Animation is disabled for these operational count comparisons. Every data point
has a numeric table/button; focusing it opens Bklit's tooltip, Enter/touch opens
the identically filtered records and Escape dismisses tooltip. Long names wrap.

No new table/migration or attribution rewrite. Existing contact/actor/record/
period indexes are reviewed using synthetic EXPLAIN; full load/p95 is SP-22.
See [execution](../03-planning/sprints/sp-17-execution.md) for actual checks,
retained failed attempts, security record, native captures and closure.
