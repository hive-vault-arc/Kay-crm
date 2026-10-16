# SP-11 execution record

Status: technically_accepted; scoped local gates passed
Date: 2026-10-15 UTC
Product/design review: pending Khalid

## Task and acceptance plan

Implement C08/C02/C13/C14, BR-05/06/12/29 and the stage/no-auto-close portions
of AT-12, deal-list/handoff portions of AT-39 and scoped AT-23. SP-10 is
technically accepted. Khalid confirms preserving the existing French KAY
interface and following this sprint without a replacement visual world.

Focused E2E defined before implementation: create an enquiry and explicitly
open the shared deal form from its detail; retain its contact and optional
requirement/exact unit or whole-development offering context. Save one deal
with retry protection and prove the enquiry is unchanged. Create another from
the Deals list using a permitted contact. Search/filter/page/change ID-only
visible columns, open detail, record then accept a separate customer proposal,
skip visit to negotiation/documents and verify true-actor history without a win,
reservation or inventory mutation. An unrelated actor cannot read/write/filter
private deals or use copied proposal IDs. Exercise invalid values, actual stale
versions, interrupted committed responses, outage/retry and retained drafts.

Backend gates: current sessions/contact scope before counts and every command/
replay, current primary agent derived from contact, exact decimal MAD offers,
typed real FKs, same-contact requirement/enquiry validation, immutable history
and target provenance; separate-connection version/revocation/retry races and
rollback; empty/populated additive migration and downgrade refusal. Extend the
existing merge preview/adapter, never bypass unknown-link refusal. The existing
file contract assigns deal-parent support to SP-11: extend its typed private
authorization/real FK and existing FilePanel, preserving actual quarantine and
current-session grants; no new file service or public URL.

Frontend gates: searchable/filterable numbered table and scoped responsible/
stage summaries, one shared create form from Leads/Deals/Contact context, deal
detail/pipeline/next-action/price proposals/history. Reservation, outcomes,
visits/tasks and finance remain explicitly future work, not dead controls.
Reuse shadcn/Tailwind and KAY tokens; no chart/dependency/new asset. Run lint/
typecheck/build, real five-target E2E and headed Chrome with desktop/mobile,
keyboard/native touch/real200%, long labels and applicable loading/empty/error/
denied/conflict/read-only states. Finish with compiled smoke, audits/privacy,
guarded isolated cleanup, owned-service shutdown and documentation validation.

All Python commands use backend/.venv explicitly. Test fixture writers stay
serial under the existing isolated PostgreSQL advisory lease; never reset/seed
development or touch production/real records. Preserve unrelated working files.

## Delivered vertical slice

SP-10 supplied working contact identity/scope, independent research, exact
inventory offerings and private antivirus-mediated files. SP-11 extends those
boundaries rather than creating a second ownership/file/identity system.

- `backend/app/deals`: strict contracts, typed models/immutable revisions,
  scoped projections/queries, atomic versioned commands/receipts and nine routes.
  Migration0013 adds four tables, real links and deferred consistency guards.
- `frontend/src/features/deals` and `/deals`, `/deals/new`, `/deals/[id]`:
  searchable numbered/configurable table, one shared form, pipeline/next action,
  separate customer proposals, true-actor history and existing private FilePanel.
- Existing Lead/contact/research context links, merge-preview/transfer/archive
  adapters, document parent FK/authorization, strict server-only facade and
  exact offering lookup are extended together. Research intent changes receive
  an explicit conflict only when existing commitments would become inconsistent.
- Tests cover the new slice and earlier workflows; API/data/architecture/screen/
  component/security/traceability contracts, local runbook, QA register and
  repeatable lessons are updated. No dependency, chart, theme or new raster asset.

## Implementation proposals

The concrete wire/SQL details are technical proposals, not new confirmed
business rules. Ordinary stages are new/visit/negotiation/documents, including
skips; reserved and all outcome stages require their later dedicated commands
and are rejected here. The complete fixed pipeline remains visible in words.
Creation defaults to new and can deliberately choose an ordinary initial stage.
Customer offers retain independent positive numeric(18,2) MAD amounts, original
sale/month/year terms, conditions and optional expiry date; proposed statuses
are pending/accepted/rejected/withdrawn. Expiry never silently changes state.
Accepting or editing a proposal changes neither deal stage nor inventory.

Proposed bounds: title160, next action1000, reason1000, proposal conditions4000,
32KiB command body, bounded response/pages and24-hour actor/route/key receipts.
Ordinary updates cannot write contact/owner, stock, outcome or finance fields.
Requirement/enquiry context must belong to the current contact; exact offering
identity is retained in immutable change history if a deal's selection changes.
Rental proposal comparisons use exact Decimal/BigInt, not binary floats.

## Required reads and UI direction

Root/backend/frontend AGENTS, sprint/roadmap/index, README/scope/decisions,
business rules/permissions/workflows, data/API/architecture, AT-12/23/39,
coding/harness/QA/security/lessons and DESIGN/design-system/screen-map read.
Required antislop core (existing AFTER/core-only), design-system-ops and four
applicable references, and design-taste-frontend read completely. Dense CRM
tables/forms/detail are excluded from the marketing skill's composition/asset
workflow. Responsive Standards, uncodixfy, React best practices and Impeccable
Operate complement the incumbent system; no kit/palette/font/token replacement.
Reading this as a daily deal workspace for KAY staff, light white/ivory/charcoal/
gold, ENERGY1/RHYTHM1/MOTION1. Parent-owned spacing, clear primary task, real
status labels and one-column forms follow existing components.

Impeccable context ran once for the actual incumbent generic section page. Its
metadata misses the implementation and PRODUCT.md, but existing contracts/code/
DESIGN remain authoritative. This is the precisely specified extension of the
existing CRM, not a new product/world or open concept exercise. Confirmed by
Khalid through the structured question. No init/second product authority is
created. A scoped direction brief and final native/reviewer/documenter evidence
will be recorded before acceptance; antislop AFTER audit-only fixes require
Khalid's numbered selection.

## Verification ledger

2026-10-15 checkpoints (not final technical acceptance):

- Explicit backend venv Python3.14.3: Ruff format/check and strict mypy pass
  (89 app modules). Isolated0013 upgrade and Alembic check pass with no drift.
- Focused backend:11/11 passed12.25s, then34/34 passed47.16s, zero skipped.
- Full backend: `.venv/Scripts/python.exe -m pytest --cov=app -q --tb=short -x`,
  backend cwd,257/257 passed414.09s, zero skipped,94% coverage. Includes all
  earlier modules, PostgreSQL races/rollback, real ClamAV/private deal files,
  populated0012↔0013 preservation and retained-history downgrade refusal.
- Frontend initial lint passed; typecheck initially found a narrowed value in a
  stage-count callback. Captured stable counts; corrected typecheck passes.
  `npm run build` passes (Next16.4.0; compile9.1s, TypeScript7.5s).
- Browser verification underway; development migration not applied yet.
- Corrected focused Chromium run:4/4 passed1.5m, zero skipped. Earlier
  selector-only failures retained: panel close expected a nonexistent “Fermer”
  control (use Escape); interrupted response expected another form's wording
  rather than the actual shared API message. Corrected assertions do not mask
  application failures. Five-target run and headed review remain underway.
- Five-target command `npm run test:e2e -- tests/e2e/deals.spec.ts --workers=1 --max-failures=1`:
 20/20 passed6.8m, zero skipped (Chromium, installed Chrome/Edge, Firefox,
 WebKit; browser emulation on Windows is not actual iOS/Safari). Final
 strengthened401 assertion and radius-token correction receive final reruns.
- Final post-copy/actual401 five-target rerun:20/20 passed7.1m,zero skipped,
  exit0; all four scenarios on Chromium/Chrome/Edge/Firefox/WebKit. No mock
  business response, manufactured status or disabled test remains.
- Development inspection/migration/check: OID109060, cluster7607060034405909976,
 38→42 tables,0012→0013. Unrelated catalogue SHA remains
 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945;
 Alembic check reports no new upgrade operations. No seed/reset or record purge.

Earlier failed Ruff wrapping/import passes were corrected before these runs.
A narrow offering_id list filter was initially placed in NewOffering rather
than InventoryQuery; corrected before full regression and covered by an exact
real unit selection assertion. No failed attempt is counted as passing.
Official sprint links checked: SQLAlchemy2.1.4 session basics available; RHF
get-started returned403 and TanStack latest introduction404. Installed pinned
packages and working version-matched incumbent patterns remain authoritative.

## Security boundary record

Security-sensitive: private deals/proposals/history/documents, current scope,
versioned commands/replay, migrations and merge. Scoped review completed with
real negative/race/interruption/privacy evidence; production is not certified.

Backend gate finally passed263 cases/95% coverage (see ledger). Current authority is
reloaded after actual database lock waits; removed collaboration denies both
write and same-key replay. Independent versions/races, bad/cross-contact context,
future stages, copied proposal IDs, direct SQL snapshot/identity/money changes,
CSRF/Origin/bounds, transaction rollback, merge/transfer/archive and actual clean
private file bytes are exercised. Browser creation/prefill, scoped counts,
permission denial and committed-response retry also pass the focused run.
Final browser role test asserts an actual401 deal GET after role change,
without treating a helper exception as a manufactured status.

Python runtime/dev audits and pip check: exit0, no known vulnerabilities or
broken requirements. Frontend runtime audit:0 findings; full audit:exit1,
9 inherited HIGH development-tool entries,0 other severities. No package/lock
change or forced incompatible downgrade. Final client/report scans still due.

## Handoff

### Finish verification chronology

Visible Chrome155.0.8059.79 passed1 workflow1.3m. Main batched inspection opened
all16 native captures and found evidence-only defects: premature child-loading
and list-error capture timing, and denied-mobile still at a1024px probe width.
Corrected explicit state waits/390px reset; headed rerun passed1/1 in1.4m.
No product UI redesign or synthetic screenshot editing. Final recaptures after
the user-selected punctuation correction passed1/1 in1.4m. The one detector run on
actual changed targets returns[]/exit0; no second scan. AFTER011 finding1 was
explicitly selected by Khalid and corrected with colons in selected/status copy.

Measured layout:1440/390 desktop/mobile,44px submit targets,32px h1,32/16px
gutters and32px main gap. Geometry320/360/768/1024 also passes. Real browser zoom
devicePixelRatio2→4 and innerWidth1427→713, no page overflow. Keyboard Enter/
Escape/focus restoration and native touch pass; table alone scrolls. Unexpected
console/page errors0. Backend10054 during deliberately stopped API is retained
as the injected outage, not a swallowed browser exception.

WCAG relative-luminance ratios of unchanged normative token pairs: secondary/
ivory6.11,link/ivory6.13,charcoal/beige12.75,white/charcoal14.94,
success/ivory5.81. Danger/destructive are distinct tokens; final measurement uses
the actual text-danger #A11D22/ivory7.29; white/destructive-button #B4232F6.52.
All applicable normal-text pairs exceed4.5:1.

Final lint/typecheck/build pass after the selected copy correction. Optimized
build K9Yh-YT21YBd-dYbgMtGb,245 application/migration source fingerprints saved
in the verification session for post-run comparison; compile1.036s/TS3.9s.
Node24.13.1/npm11.8.0, explicit Python3.14.3; installed Chrome155.0.8059.79,
Edge155.0.4283.45. No production deployment or new package is implied.

Live scanner version read-only: ClamAV1.5.4/signature28154,
2026-10-15 06:24:22 (scanner output). The real fresh verdict is required for
download; signature/version observation is not a guarantee of malware coverage.

### Final dependency correction and regression attempts

The independent fresh finish reviewer returned **ship**, no material fixes,
after opening all16 final native captures. Its scope is the implemented UI and
evidence packet, not independent backend certification. Final post-copy headed
Chrome passed1/1 in1.4m with corrected state waits and actual mobile widths.
The fresh independent design documenter returned **No changes**, confirming
existing palette/type/shared geometry/parent-gap/selection/flat-workspace rules.
Pre-existing missing PRODUCT.md/design.json and stale pre-app metadata are not
repaired or canonized. Records: `.impeccable/sp11-finish-review.md` and
`.impeccable/sp11-documenter.md`; DESIGN/tokens remain unchanged.

Upstream dependency review found that changing a research's purchase/rental
intent with a linked deal target/proposal reached the deferred SQL guard and
surfaced as a generic dependency failure. A new regression first reproduced
the actual IntegrityError. A narrow preflight now returns the existing typed409
before mutation; both purchase/rental directions with offering/proposal and
uncommitted-deal variants are tested. Uncommitted deals do not freeze research
intent. Failed commands preserve research version, deal, history and receipts.
The French message explains recovery and retained input; an actual browser PATCH
assertion checks409/code, unchanged persisted intent/version and retained draft.
Backend focused deal/research suite:71/71 pass96.00s,zero skipped. Ruff format/
check and strict mypy pass (90 app modules). Final full regression is recorded
below after completion:263/263 pass424.85s,zero skipped,95% coverage. The new
requirement-intent preflight has100% coverage; all previous modules still pass.

First optimized regression attempt stopped at10 pass/1 fail (4.1m), with18
unrun cases, not a passing29-case command. SP-09's scanner-recovery assertion
waited20s after forcibly killing a worker. The real response was409
FILE_SCAN_IN_PROGRESS: the correctly fenced90s job lease had not expired.
The test stops the unavailable worker before retry acknowledgement, then starts
the real worker, accepts only200 or that exact409, waits up to120s for real clean
bytes and verifies download. No product lease shortened, scanner verdict faked,
assertion skipped or failure hidden. Final reruns retain this correction.

After that narrow correction, frontend lint/typecheck/build pass: Next16.4.0,
compile1.218s/TypeScript2.8s, optimized build qbGMKlVgwNIMmIwh04jfr.
The final source baseline contains246 application/migration fingerprints.

Read-only engine-version launches (no navigation/data) verified Playwright1.64.1
with Chromium156.0.8078.4, Chrome155.0.8059.79, Edge155.0.4283.45,
Firefox157.0 and WebKit27.2. These are Windows browser targets, not real
iPhone/Safari/device certification.

Final development read-only inspection: same OID109060/cluster/catalog hash,
42 tables/head0013, Alembic check no upgrade operations. All40 application
record tables empty and bootstrap unset. No development reset/seed/cleanup.

Expanded optimized Chrome regression selected36 cases (SP-05–SP-11 and @shell).
It passed32, then failed the shell's obsolete expectation that `/deals` still
shows “Fonctionnalité à venir”; three later shell cases were unrun (8.9m).
The implemented deal workspace was working. Corrected the assertion to check
the real create action and scoped empty list; no application source changed.
Navigation's four cases and the new research-conflict case receive a final
five-target compiled rerun. Report the combined valid coverage explicitly,
not as one clean36-case invocation.

### Final technical acceptance and shutdown

Final affected optimized-build command, frontend cwd, temporary
`KAY_E2E_PRODUCTION=1` restored afterward:
`npm run test:e2e -- --grep 'SP11: permitted requirement|@shell' --workers=1 --max-failures=1`.
25/25 passed4.9m,zero skipped,exit0: the new research-conflict/exact-target case
and all four shell cases on Chromium/Chrome/Edge/Firefox/WebKit. This completes
all36 selected compiled Chrome cases through32 prior passes plus the four
corrected shell passes, not one clean36-case invocation. The earlier20/20
five-target SP-11 run remains valid for the unchanged ordinary UI paths; the
only added behavior/error-copy branch has its final five-target rerun here.
All failed/corrected attempts remain above; no failed/skipped gate is accepted.

Final source/build comparison: all246 application/migration SHA256 fingerprints
unchanged after browser verification; optimized build qbGMKlVgwNIMmIwh04jfr
unchanged. Final lint/typecheck pass after test-only navigation correction.
Client scan:4 roots/275 browser JS files/0 configured facade-secret occurrences.
Final private HTML report:3 JSON entries/25 result step arrays/0 detailed arrays;
earlier stopped compiled report9 JSON/33 arrays/0 detailed. Only .last-run.json
in test-results;0 temporary browser profiles, no trace/video/error-context files.
Eight private paths remain ignored and no private configuration/artifact is
tracked. Runtime audit0; full npm audit still9 inherited HIGH dev-tool findings.

After all application listeners and the observed owned process tree were0,
exclusive guarded test cleanup removed1 residual synthetic row; all40 record
tables are empty/bootstrap unset. Reconciliation removed0 old uncommitted
objects; the one-hour grace remains, without forced clock/young-object purge.
Test OID109061 and development OID109060 remain distinct in cluster
7607060034405909976. Both42 tables/head0013, no Alembic drift, same unrelated
catalog SHA. Development inspection was read-only:40 record tables empty,
bootstrap unset, no reset/seed/purge. KAY ClamAV stopped with cache retained;
project listeners/processes/supervisors stopped, shared PostgreSQL preserved.

SP-11's22 checklist items are technically complete at this local boundary.
Fresh UI finish verdict ship, targeted final-copy confirmation ship, documenter
No changes, selected AFTER011 finding1 verified. Human product/design review
remains pending. SP-12–SP-22, production/cloud, real-data actions, actual devices
and measured full-product/load/recovery remain outside this request. No Git
staging/commit, forced dependency upgrade or development-data purge.

Final documentation command, project root:
`powershell -NoProfile -File docs/03-planning/validate-sprints.ps1`,exit0.
1058 local links/anchors including70 approved skill links;22 sprint files,
41 AT mappings,13 synchronized Mermaid pairs and9 valid JSON examples.
SP-11 checklist22 checked/0 unchecked. Live README/roadmap/index/QA statuses
agree; earlier sprint evidence remains historical rather than retroactively
claiming this work had already existed.
