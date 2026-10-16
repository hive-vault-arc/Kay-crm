# SP-17 execution

Status: technically_accepted; scoped local technical gate complete; product review pending Khalid.
Date: 2026-10-15. Scope: C10/C13/C14, AT-18/19, dashboard portions AT-36/39,
AT-13 reopening adjustment and AT-23. SP-16's recorded technical gate is accepted.

## Before implementation: focused outcome and E2E

Retain KAY's French shell and SP-15 work panels. Add backend-scoped reporting,
Bklit chart/table pairs, date filters, separately counted inventory and numbered
drill-downs. Synthetic manager/admin see agency data; unrelated agents see none;
primary/collaborator see only accessible work. Transfer moves portfolio, not
historical outcome attribution or true actors. Reopening removes the reversed
outcome from current results without erasing history/collections. Verify exact
29/30-day and13/14-day boundaries without writes from report reads.

Focused real-stack browser case defined before code: create two agents and a
manager, contacts/deals and synthetic activity; compare every Bklit data point
with its API and numeric table; open filtered drill-downs; change dates; verify
manager/agent isolation and no finance for agents. Test delayed, failed, denied
and empty responses without losing shell or period input; inspect long names,
keyboard, touch,320–1440 widths and actual200% Chrome zoom. Run new report tests
and a small affected regression set serially under the existing isolated lease,
then the compiled browser case and headed Chrome. Do not rerun the full CRM.

## Technical implementation proposals (not new commercial rules)

- Date filters default to the current Casablanca calendar month; inclusive dates,
  maximum366 days. Outcomes use completed_on; activity uses server-resolved UTC
  bounds. Current portfolio/stock/alerts are explicitly as-of now, not historical
  snapshots. No conversion-rate denominator or fabricated stage funnel.
- Portfolio: active canonical contacts grouped by current primary. Results:
  unreopened won/lost/cancelled outcomes grouped by immutable primary at close.
  Activity: recorded timeline actions grouped by true actor; automatic stock
  flags and contact-merge propagation excluded and definitions disclosed.
- Agent report inventory is limited to exact offerings referenced by accessible
  deals or requirement shortlists. Whole-development links never expand into all
  child units. Managers see all inventory. This conservative technical projection
  implements BR-29 without changing shared Projects read authority.
- Inactivity uses latest explicitly deal-linked timeline activity, excluding
  automatic flags/merge propagation, or creation if none. Thresholds are elapsed
  UTC days, inclusive. Available physical alerts deduplicate dual offerings;
  whole-development offering alerts remain separately identified.
- Collections are M/A-only valid unsuperseded receipt amounts by received_on,
  exact Decimal strings, never deal prices or expected commissions. Corrections
  are reflected while originals remain. Reopening never deletes collections.

## UI workflow and bounded verification

Required antislop, design-system-ops and design-taste-frontend reads completed;
relevant Impeccable, responsive, uncodixfy, React and Playwright guidance applies.
Design-taste's dashboard/table/admin/marketing concept workflow is excluded.
Reading: operational KAY dashboard for agency staff, established light French
record interface, ENERGY1/RHYTHM1/MOTION1. Existing tokens/components win.
Use backend aggregates only; chart source from reviewed Bklit registry through
installed pinned shadcn CLI. No alternate chart kit. Fresh finish review and
documenter follow at most two main visual inspection batches and one detector.
Antislop AFTER; no audit-only aesthetic changes without Khalid's selection.

No production, real records, external send, deployment, backups or SP-18+ work.
Missing PRODUCT/design.json is inherited drift, not silently repaired. Current
technical checks and closure will be appended only after actual execution.

## Verified so far (not final acceptance)

- Backend .venv/Scripts/python.exe -m pytest tests/test_reports.py
  tests/test_report_edges.py tests/test_outcomes.py tests/test_finance_http.py
  -q --tb=short -x -s:22/22 passed33.65s,0 skipped.14 new reporting variants
  plus8 affected existing outcomes/finance transport variants. Initial focused
  discovery runs9/9 and5/5 pass after corrections below; not extra unique cases.
- Ruff check ., format --check .: exit0/218 files; mypy app exit0/137 modules.
  Explicit-venv alembic check exits0/no new upgrade operations. No migration.
- Frontend npm run lint/typecheck/build exits0; build S9c1Q0J08APNojgfSf98H.
 393 source/migration files SHA256
 936A23F9D36D8B0BC0CFC05F2326CA399D001D5A23E61E0E7EF3EC714A17CC77.
- Compiled Chrome focused reports2/2 passed45.0s including startup. Then the same
  two cases across Chromium/Chrome/Edge/Firefox/WebKit10/10 passed3.2m,0 skipped.
  Every plotted positive SVG height is proportional to its API count, every
  numeric table point and matching filtered drill-down count agree. Both actual
  agent/manager contexts, copied contributor filters, period/current distinction,
  invalid dates, outage/retry and forbidden states are exercised.
- Runtime npm audit --omit=dev returns0 findings. Full audit retains9 inherited
  HIGH dev-tool entries in the same shadcn/ESLint glob chain; no forced upgrades.
  New exact Bklit runtime dependencies are locked. Python locks unchanged from
  prior verified boundary. Client scan:4 roots/285 JS/0 configured secret matches.
- Existing10 private/generated paths:10 ignored/0 tracked. No real data used.

## Corrections and retained unsuccessful attempts

1. SQLAlchemy rejected inferred enquiry→contact join because both current/origin
   FKs exist. Add the explicit current contact join; empty and scoped parity pass.
2. Transfer fixture incorrectly supplied collaborator_ids to an assign intent;
   remove that unrelated field and retain the existing explicit assignment rules.
   Receipt fixture initially expected receipt_id in a command result; use the
   real numbered receipt projection's id. No product rule loosened.
3. The first browser launch occurred while the backend suite still held its
   isolated lease. Supervisor refused without cleanup or starting a second writer.
   After backend completion, the serial browser commands pass. Never bypass lease.
4. Initial unformatted snippets/imports and registry-owned lint findings were
   corrected/formatted or explicitly scoped to untouched upstream internals;
   application lint rules remain enabled. No failed invocation counted as passed.
5. Headed geometry found single-digit KPI link targets39.5–39.8px wide. Add the
   existing min-w-control role, retaining the44px assertion. The next headed run
   reached keyboard tooltip behavior and caught Escape being handled only by the
   chart sibling, not the table. Move that handler to the shared metric section.
   Both are functional accessibility corrections; later final reruns supersede
   these failed attempts, with no lowered threshold or aesthetic-only change.

## PostgreSQL and security evidence

Actual isolated PostgreSQL queries cover transfer, current collaboration, former/
unrelated agent denial before aggregates, historical close ownership, reopening
adjustment, valid correction leaves, exact decimal/date boundaries and physical/
programme/offering count separation. No callback invents client aggregates.
Strict facade/session/no-store/duplicate and unknown query negatives pass.
Agents' collections key is absent and direct metric requests return403. M/A
projections agree. Current READ ONLY REPEATABLE READ is coherent through a real
separate-connection transfer; the next former-agent read is empty.

Synthetic1000-action EXPLAIN ANALYZE BUFFERS returns1000 rows, Nested Loop,
2.534ms in the final focused run (2.986ms discovery). Existing scope/time/actor
and FK indexes reviewed; deal inactivity adds current contact equality to use
ix_timeline_contact_time. No speculative index migration or snapshot rewrite.
This small query probe is not the full SP-22 load/p95 benchmark.

Both29/30 and13/14 boundaries pass. Dual stale physical campaigns count one
property; whole-development offerings remain a separate alert. Reads leave
offerings available and deals unchanged. No production, real records, secrets,
external messages or destructive development changes.

## Remaining gates at the first verification checkpoint (superseded below)

Headed Chrome/native visual review, bounded inspection, detector, antislop AFTER,
fresh independent review/documenter, final documentation/privacy/cleanup and
shutdown evidence remain pending. Product review always remains Khalid's.

## Headed verification and final inspection

After the44px and Escape corrections, the headed workflow passes1/1 in38.7s
(48.9s including startup), followed by affected compiled Chrome2/2 in43.5s.
11 native original captures and2 matching canonical copies were validated in the
second/final builder inspection. First batch opened the4 captures reached before
the narrow-width test stopped. At320px the harness initially measured before
Bklit's debounced ParentSize resize; waiting for actual SVG/container geometry
settles it. The unchanged overflow/44px/contrast assertions then pass at six
widths. No application overflow workaround or third builder polish hunt.

Actual Chrome155.0.8059.79; recorded desktop and zoom contrast6.113:1,
controls≥44px, no page/main horizontal overflow. Keyboard focus/tooltip/Escape/
Enter/return, all13 overview drill controls, native touch, scoped charts/date
filters and actual200% (DPR2→4,width1427→713) pass. Deliberate report abort/403
are separately recorded; unexpected page/console errors0. Source build at this
point WnchwxGXxGT4tC3N-SEG9,393 files SHA256
60125A9B2C591C1A379286C8E086D8B3ACE33C61EA1FFBBCD901462EADBEA473.

One detector across features/reports, work dashboard, all local registry source,
globals and catchall API returns exit0/[]; saved .impeccable/sp17-detector.json.
The final pixels expose an additional required issue: untouched server-default
dates clear while the report is loading/failed. Edited drafts already pass.
This is explicitly in the fresh review packet and remains unresolved until its
bounded fix/verdict, not a hidden pass or an AFTER-only aesthetic finding.

Guarded isolated cleanup after these runs removed1 residual synthetic record
and5 orphan test objects;60 record tables/0 rows/bootstrap unset. Development
read-only verification remains60/0/bootstrap unset, policy1/capacity2/no editor/
hours/lunch. Distinct OIDs109060/109061 and cluster7607060034405909976 retained.
Later review-fix browser reruns require the same final cleanup again.

## Final F1 correction and technical closure

The fresh finish review required F1: preserve untouched server-default dates
through loading, error, denial and retry. Pin the first successful server-resolved
period in local selection state; do not invent client-local dates or retain
unavailable private report records. The headed test now asserts both untouched
dates in all four states. Final source lint/typecheck/build exit0; optimized build
17tAhAG5Fge1gVrvm-G9w. Final headed1/1 passed41.0s (53.1s including startup),
followed serially by affected compiled Chrome2/2 passed47.3s,0 skipped. No full
backend or five-target matrix rerun after this narrow state fix; earlier evidence
remains valid at its unchanged boundaries. Final lint/types repeat exit0 after
the test assertions. This necessary-only selection follows Khalid's speed request.

All11 original native images and2 canonical copies were recaptured at their
original paths. Main reopens the3 affected named failure-state captures to
confirm visible01/10/2026 and31/10/2026, without another polish hunt. The fresh
reviewer validates the13 files, scores F1 resolved and returns ship only for the
scored correction, preserving the original full review. Canonical desktop/mobile
remain byte-identical to the original full-review populated captures:

- Desktop SHA256 D744ACA1F42DF669D532E56D4B7536BFA6609BB06ADBB71E2AEBE796DFA956EA.
- Mobile SHA256 28A182A07D5654FF05C1E91F136C5E28488FE05C2798A82567F78384F314A818.

The393-file app/migration fingerprint remains
7E3ABF9F418883B31B2A2A173E90C51D59A3E823C801C2C7FB5F2B9F1CAB0AED
through final checks and documentation. No migration was introduced; schema stays
0018_commissions_collections. The Bklit registry's56 local source files retain
MIT provenance; five lint rules are excepted only for upstream chart internals.
KAY wrappers keep normal rules; no React Compiler is enabled. Existing colors/
fonts/controls remain authoritative; the shared16rem chart canvas is documented.

[AFTER017](../../../anti-slop/audit-017-2026-10-15.md) records every applicable
item:0 HIGH/0 MEDIUM/1 optional LOW. Finding1/A1 is mobile table-column density;
it remains unselected/unapplied. The detector ran once and returned[]. Required
functional/accessibility fixes are not aesthetic-only approvals. The
[fresh documenter](../../../.impeccable/sp17-documenter.md) finishes its factual
component-guide section only; main verifies that report and addition. DESIGN,
application source and generic metadata were not changed by that handoff.
Scoped incumbent persistence is recorded, while inherited missing PRODUCT.md/
design.json remains incomplete/out of scope, not repaired or called passed.

Final privacy:4 client roots/285 browser JS/0 configured-secret matches;
2 report JSON/2 result arrays/0 detailed arrays.10 private/generated paths are
ignored and0 tracked. No credentials, real records or raw client documents were
used. Final guarded cleanup after F1 removes1 residual synthetic row and0 orphan
objects; verified test OID109061/cluster7607060034405909976/private test root/
exclusive advisory lease preserved. All60 record tables empty, bootstrap unset.
Read-only development OID109060 remains60 record tables/0 rows/bootstrap unset,
policy1/capacity2/editor unset/no hours/lunch. No development reset or write.

Final listeners on3000/8000/3100/8100/8101/3310:0; root-identified service
processes0. Project ClamAV already exited143, cache retained; it was not needed
or restarted by these report tests. Shared PostgreSQL5432 remains available.
Git has17 untracked root entries/0 tracked changes: diff-check is whitespace
evidence only, not a tracked application-diff review. No stage/commit.

Updated concrete report, API, model, architecture, chart, component and screen
contracts; traceability, security, QA and roadmap/sprint statuses link this record.
Final documentation validation results are recorded below after the actual run.
No required failed/skipped check is relabeled a pass; earlier chronological
pending/failed checkpoints above are superseded only by these actual passes.

## Limits and handoff

SP-17 is technically accepted locally, not the whole CRM. SP-18–SP-22 remain
unimplemented. Khalid's product/design review, optional AFTER017 density choice,
actual-device/Safari, full-product regression, production, deployment, full load
and backup/recovery acceptance remain pending. The small2.534ms EXPLAIN probe is
not the100-concurrent-user/p95 benchmark. Full npm audit still has9 inherited
HIGH development-tool chain entries; runtime audit0. No forced upgrade.
Next safe authorized implementation slice: SP-18, not included in this change.

Final documentation command from the project root:
powershell -NoProfile -File docs/03-planning/validate-sprints.ps1 exits0:
22 sprints/1123 local links (70 installed-skill links)/41 acceptance mappings/
13 synchronized Mermaid pairs/10 valid JSON examples. SP-17 has23 checked and
0 unchecked criteria. git diff --check exits0;17 untracked root entries and0
tracked changes remain. Final fingerprint is unchanged; only.last-run.json
remains in test-results. No application rebuild is needed for these doc-only
closure edits, and no later sprint was started.
