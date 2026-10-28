# Selected supporting reports workspace

Date:2026-10-28. Source implementation on `codex/redesign`, following the frozen
`work-reports.js`, the final `app.css`/`drawer-cards.css` cascade and the existing
[reporting contract](dashboard-local.md). This changes presentation and client
projection checks, not report datasets, grants or endpoints.

## Composition and preserved capability

The dashboard's Rapports tool opens the existing shadcn RecordDrawer. Its overview
now uses the selected tonal metric cards, grouped into Activité commerciale,
Portefeuille et inventaire and Finance. All13 M/A metrics remain; Agents receive
the12 nonfinancial metrics. Cards retain complete exact values, current/period
basis and one44px full-card dossier action. Finance amounts use the existing
decimal-string MAD formatter without conversion to float.

The selected final drawer cascade uses wrapping equal-width cards with12px gaps
and a220px minimum constrained to the available width. Narrow cards place the
value beside the title, with wrapping fallback for long financial values. Date
labels remain above fields; very narrow date controls stack. Existing theme,
selected icons, semantic tokens, focus, reduced-motion and forced-colour rules
remain. One RecordDrawer body owns scrolling; no table, extra Sheet, fixed-height
blank panel or horizontal list scroller is added.

Répartition par attribution opens Contacts/responsable actuel, Gagnées/responsable
à la clôture or Activités/auteur. The existing lazy Bklit chart and complete
ten-contributor tonal list are retained in that requested view, rather than
preceding every overview metric. This preserves the real chart capability in
the selected tool hierarchy. No new library or chart type is introduced.
Record drills and current alerts use full-width tonal links with actual retained
attribution, exact financial values and numbered ten-row pages. Alerts remain
independent of the selected civil period and retain the14/30-day UTC thresholds;
they perform no stock or dossier command.

Only dates initialize from the dashboard. Current portfolio agent filters do not
become immutable closing/activity attribution filters. Reports keep independent
applied/draft dates and server default period across loading/failure. Invalid
dates do not issue a new read. The definition, scope and total are server facts;
there are no invented daily series, rates, client-side row counts or cash totals.

## Projection, recovery and navigation

The selected overview checks complete unique metric keys against the response's
authorized agency/assigned scope, units, basis, exact count values and complete
attribution-series totals/IDs. It rejects a partial or incoherent report instead
of presenting missing data as zero. Existing wire/facade schemas stay compatible;
these additional checks belong to the selected client projection.

Drills bind the returned metric, civil period, page/size/flags, total, row identity
and known route kind. Direct identity metrics retain exact record links. Outcome,
activity, offering and receipt IDs remain distinct from their actual target IDs;
receipt links keep the existing Finance destination. Alerts similarly check
category/threshold/page/record kind. This validates response cohesion, never
replaces backend authorization or claims to prove a database rowset.

The existing useQuery handles aborts, late responses and live invalidation.
Current denied reads hide private panels; child401/403/404 also masks the overview
and attribution until an explicit fresh overview retry. Unknown/invalid responses
show dependency errors, not a stale previous page or zero totals. A later empty
page retains pagination escape. Contributor lists that shrink after refresh do
the same and do not falsely say their total is zero.

Overview and the selected attribution panel stay mounted while a drill is open,
preserving draft filters, contributor page and trigger. Back restores the previous
view, connected trigger and drawer scroll position; a removed trigger falls back
to the returned heading. Focus/scroll bookkeeping lives only in refs, not browser
storage or URL payloads. A changed report period starts a new attribution context.
No mutation, identity lookup, cached private value, telemetry or new permission.

## Source evidence and limits

520 frontend units pass, including15 new model/controller/render/navigation cases
and the updated dashboard report-entry case. Lint, TypeScript and pinned Next
production build pass.64 glyphs/105 consumers/348 icon sites and495 Button sites
have0 violations. Compiled-history standalone checks pass. Ten emitted CSS checks
pass across2 chunks, including wrapping, narrow dates, focus,44px actions,
reduced-motion and forced colours. All254 frozen inputs remain unchanged.
[Machine evidence](../03-planning/design-migration-evidence/report-workspace-2026-10-28.json).

The real report helpers/e2e/visible review sources now open the selected drawer,
attribution tools and tonal lists; their complete chart/API/record comparisons,
loading/denial/retry, keyboard/touch, widths and actual200% cases are prepared and
type-checked, not executed. The existing app-access rejection remains binding;
there was no browser/CUA/CDP/HTTP workaround. Source/emitted checks are not native
visual, SQL/performance/concurrency, actual CI/AFTER or owner acceptance.

The React review skill applies: charts load only when requested; view state is
separate from DOM refs; focus and acknowledgement remain immediate. Incumbent
useQuery stays under the approved stack rather than adopting SWR. shadcn/Tailwind
primitives remain, with a narrow owned stylesheet for the selected cascade,
wrapping and whole-card focus. Original-machine design-system-ops/antislop remain
unavailable/not claimed; dense CRM reports exclude marketing design-taste and
AFTER timing stays. No backend/API/schema/permission/migration change or backend
test rerun; retain463 connection-forbidden units from9743ab6 as earlier evidence.
No real DB/service/private config/records/main/push/merge/deploy. Other P0-P8 work
and the full redesign goal remain open.
