# Selected dashboard workspace projection

2026-10-27. Implemented source/transport support for the selected dashboard.
Technical metric/filter choices below are proposals for final product review;
C10, BR-05/18/19/29, current permissions and existing report definitions prevail.
The selected visual composition is now wired; final rendered/full-stack review
remains separate from the source evidence below.

## Boundary and transport

Three new authenticated facade-only GET endpoints are separate from existing reports:

- `/api/v1/reports/workspace`: complete headline counts and short previews.
- `/api/v1/reports/workspace/records`: exact headline rowsets with numbered pages.
- `/api/v1/reports/workspace/agents`: numbered current-responsible choices from
  authorized active canonical contacts, not an agency staff/account directory.

Workspace/records accepts the existing inclusive start_on/end_on pair (1900–2100,
at most366 days, default Casablanca calendar month) and optional assigned_agent_id.
Records also requires metric=enquiries|active_deals|upcoming_visits|follow_ups and
uses page/page_size (1–1000000/1–100). Agents accepts bounded q and numbered pages.
Unknown/duplicate parameters, caller-selected roles/scopes/clocks and unsupported
finance metrics fail closed. Search escapes SQL LIKE wildcards. No writes, exports,
public URLs, migration, cross-request cache or service/configuration change.

Each request starts the existing READ ONLY REPEATABLE READ transaction, checks
current identity, then intersects current contact scope, unarchived canonical
contacts and the applicable filter before counting/grouping/limiting. An unknown
or inaccessible responsible UUID yields the empty authorized intersection, never
an access grant or private-identity existence disclosure. Legacy reports, finance
permissions and their13-metric schemas remain unchanged.

## Metric and attribution proposals

| Value | Exact source/basis |
| --- | --- |
| Demandes reçues | Canonical existing enquiries report dataset: received_at in the server-resolved period, active contact scope and nonarchived enquiry. Converted historical enquiries remain genuine received requests. |
| Affaires actives | Current existing active-deal dataset; no period-of-creation restriction. Five current stages remain distinct. |
| Visites à venir | Scoped scheduled/confirmed visits starting within the selected civil-date period, with end_at greater than or equal to the authoritative read clock. Includes ongoing visits; excludes drafts, expired and terminal visits. |
| Prospects à relancer | The received enquiry cohort above, currently follow_up and unconverted. This is current state of the cohort, not its historical state at period end and not an invented due date. |
| Task summary | All currently open tasks on accessible active canonical contacts; overdue uses the existing exact due_at < clock rule, independent of report period. |
| Team rows | Current primary responsibility; separate counts of enquiries received and deals created in the selected period. These are portfolio cohorts, not true-actor activity/performance measures. |
| Outcomes below pipeline | Existing unreopened won/lost/cancelled period datasets, preserving primary_agent_at_close_id. Selecting a responsible filters outcomes by that immutable closing identity, while current portfolio values use current primary assignment. Current caller contact scope still applies to both. |

The selected team filter therefore never reattributes a past close after a portfolio
transfer. Existing detailed activity reports keep true-actor attribution. The
choice list describes current responsible identities on accessible contacts; it is
not a complete current/former staff roster. Detailed legacy attribution reports
remain available independently.

Only enquiries and follow-up cohorts receive previous_total. The previous cohort
has exactly the same inclusive day count, immediately before the selected period,
using the same current authorized intersection. Comparison does not reconstruct
past ownership/status. If the prior dates precede1900, previous_period and those
previous totals are null. No historical comparison is invented for active stock
or nonexpired appointments, and no conversion-rate denominator is introduced.

## Complete totals and bounded previews

Headline counts, current five-stage distribution and period outcomes are combined
in one aggregate statement. The request snapshot then supplies2 upcoming visits,
3 follow-ups,3 open tasks,3 linked catalogue targets and3 team rows, each with its
full authorized total. The preview limit never becomes a count. Record paging
uses the identical headline source predicates with stable label/ID ordering.

Linked catalogue targets come from actual UUID-backed DealProject interests,
current discussed/visited ProjectLink rows and a deal's selected offering, all
on accessible active deals. UNION deduplicates the same target/deal across those
relations; distinct deal counts determine ordering. External free-text names are
never matched to catalogue names. Archived targets/parent programmes are excluded.
A whole-programme interest does not expand to its physical units. Target kind/ID
remain distinct even if UUID values coincide across tables. This contextual target
count is not a physical-stock or campaign total.

Only current campaigns of the returned targets are included, with exact decimal
MAD strings and separate sale/rental/holiday kinds. No legal-owner/contact fields,
private file bytes or public image URLs are added. The future photo cards must use
the existing authorized private-photo metadata/permit/clean-scan path.

Task links retain explicit Lead/Deal context, with contact fallback only for legacy
context-less tasks. Visit previews expose only authorized appointment display facts,
not general notes, outcomes, participant grants or colleague free/busy metadata.

## Evidence and remaining work

Explicit backend .venv Ruff/mypy pass;310 connection-forbidden units pass, including
nine actual SQL-compilation/projection cases. Four real PostgreSQL scenarios are
prepared for scoped total/drill parity, private/copy filters and transfer, linked
UUID interests/deduplication, and closing attribution after transfer; they have not
been executed.689 integration cases are deliberately deselected in the unit run.

Frontend strict schemas/facade and live-topic invalidation are wired.217 frontend
units, lint/typecheck and pinned Next16.4.2 build pass. Six new facade/contract cases
cover current session/no-store, path/query bounds, exact money, count cohesion,
malformed/private/foreign-link denial, legacy compatibility and refresh topics.

The selected greeting/four-card layout, Bklit semicircle, photo/agenda/priority/
task/team previews and supplementary report/work drawers are now wired. Stage
links use the existing current-stage Deal list, headline links use exact workspace
records, and outcome links map responsible to the legacy immutable attribution
filter. Detailed reports own their complete authorized metrics and independent
filters; only dates initialize from workspace context. Private photo authorization,
exact campaign prices/terms/states and explicit Lead/Deal task routes remain.

225 frontend units plus lint/typecheck/build pass. Dashboard CSS/source hashes and
zero known dependency vulnerabilities are recorded in the
[UI evidence](../03-planning/design-migration-evidence/dashboard-ui-2026-10-27.json).
No native/browser/app-HTTP, real database/performance/concurrent-scope/transfer,
AFTER or product acceptance is claimed. The separate
[data evidence](../03-planning/design-migration-evidence/dashboard-data-2026-10-27.json)
retains its actual earlier310 backend units and prepared SQL acceptance cases.
