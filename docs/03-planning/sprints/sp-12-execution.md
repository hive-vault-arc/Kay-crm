# SP-12 execution record

Status: technically_accepted at the recorded local boundary. Product review: pending.

Date: 2026-10-15 UTC. Khalid confirms: "Yes, extend the existing deal detail."

## Smallest testable outcome

A currently authorized contact actor can explicitly reserve an available physical
offering, see its exact scope and persistent stock state, and release it with a
reason. Same-offering and same-kind whole-development/unit races have one winner.
Retries after a committed but interrupted response have one durable effect.

## Focused E2E case defined before implementation

Using the isolated synthetic stack, create two scoped deals against a marketable
unit and a whole-development offering. Reserve the unit, repeat the request key,
inspect inventory and a competing deal's safe conflict, attempt the whole scope,
then release with a reason and reserve the whole scope. Verify another agent's
denial, changed scope on retry, retained drafts on stale/failed requests, and
independent sale/rental behavior. Exercise desktop, mobile, keyboard, touch and
real 200% zoom in the existing French interface. Never record credentials.

## Implementation proposals (not new commercial rules)

- Reuse deal receipts and immutable deal/inventory history. Extend the existing
  PostgreSQL outbox with a typed inventory-event reference, not another broker.
- Explicit commands bind the reviewed deal, offering, physical target and parent
  development versions. A unit hold increments its unit and offering versions;
  the parent is locked/rechecked, not commercially changed by a child hold.
- Reserving enters `reserved`; subsequent ordinary progress does not release stock.
  Release restores the prior ordinary stage only if still `reserved`, otherwise
  it preserves subsequent ordinary progress. Retargeting requires release first.
- Other contacts' reservation identities are never shared through stock views.
  Safe conflict codes and manager-review guidance suffice.
- Preserve the existing KAY design system. Dense CRM detail/confirmation work is
  excluded from marketing/concept-board parts of design-taste. No new font, theme,
  chart, dependency or navigation is required. Mandatory UI skills were fully read;
  Impeccable's existing-world extension and fresh finish/documenter gates apply.

## Required verification

Real PostgreSQL migration upgrade/downgrade preservation, direct-write guards,
forced two-session races, authorization/retry/rollback/no-expiry cases; Ruff,
mypy and full backend regression; frontend lint/types/build; five-target real
stack Playwright and headed Chrome; native visual evidence, one detector and
AFTER audit; security/privacy checks and owned-service shutdown. No unrun gate
will be reported as passed.

## Implemented boundaries

- Explicit strict reserve/release routes and same-origin facade; current contact
  authority before effects and receipt replay; exact reviewed target versions.
- Persistent reservation model and additive frozen0014 migration; one active
  offering/deal, development-first sorted offering locks and SQL overlap/context/
  history checks. Same-kind parent/child conflict, independent siblings/cross-kind.
- Reserved offering/deal projections and safe shared conflicts without another
  deal/contact/actor. Batched stock projections avoid per-row conflict queries.
- Explicit-release guard for campaign edits/withdrawal/availability confirmation;
  immutable hold identity, true actor/time/reason, ordinary-progress persistence.
- Existing deal receipts, inventory/deal/contact history and typed PostgreSQL
  outbox, with the file worker still restricted to file scans.
- Existing French KAY detail extended near target facts with reserve/release
  confirmations, no-expiry notice, retained reason/key, fresh review and stock
  cues. No new kit, dependency, token, theme, font, chart or shipping raster.

## Verification and retained earlier attempts

Runtime: Node24.13.1/npm11.8.0, explicit backend Python3.14.3. Playwright1.64.1
executes Chromium156.0.8078.4, Chrome155.0.8059.79, Edge155.0.4283.45,
Firefox157.0 and WebKit27.2. These are local engines, not real iPhone Safari.

- Backend Ruff/check/format and mypy92 app modules pass. Clean full run:
  `.venv/Scripts/python.exe -m pytest --cov=app --cov-report=term-missing -q --tb=short`:
  284 passed446.16s,95% coverage,0 failed/0 skipped. Two subsequently added archive/
  merge tests passed4.77s after a test-helper signature correction. The286 current
  cases are covered across those successful runs, not one286-case invocation.
- Forced separate PostgreSQL sessions both wait at the same development lock;
  exactly one success and one safe conflict for same-offering and parent/unit.
  Retry/after-commit interruption, before-commit rollback, explicit reason,
  long-clock persistence, stale versions, direct-SQL stock/owner/history/price/
  kind negatives, scope transfer, archive/restore and merge provenance are covered.
- Empty/full-history migrations, populated prior schema, unrelated-table retention
  and downgrade refusal pass in the clean full/focused runs. The first broad run
  retained269 passes/12 failures from stale applied draft DDL and two outdated
  contract assertions; final isolated reconstruction/corrections resolved them.
- Development additive upgrade: same OID109060/cluster7607060034405909976,
 42→43 tables/head0014; unrelated catalogue SHA256 remains
  `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`.
  Alembic check: no upgrade operations. All41 record tables empty/bootstrap unset;
  no development seed/reset/purge. Test target remains distinct OID109061.
- Frontend lint/typecheck/build pass. Initial candidate compiled build
  `nCrP_fudMShmF26IL7jt-`;250 app/migration source files, aggregate SHA256
  `B2AD5EE282716A79F20F3FD1D7E10CFEFC8AC4402585CE91DE86803E51330589`.
- Initial optimized Chrome reservation run:3/3 pass1.2m. Five-target expanded deal/
  reservation run:35/35 passed10.5m,0 skipped. Initial headed Chrome:1/1 pass44.2s,
  12 valid native captures. Initial main batched inspection found one functional
  error-copy defect (reserve referred to a release-only reason). The conditional
  copy and a regression assertion are corrected; final affected compiled/capture
  reruns and independent finish results are recorded below.
- Dependency audits: backend runtime32/development102 dependencies,0 known
  vulnerabilities; pip check clean. npm runtime0; full npm audit retains9 inherited
  HIGH dev-tool entries. No dependency or forced update was introduced.
- Final focused backend rerun:23/23 SP-12 cases pass46.66s,0 failed/0 skipped,
  including archive/merge and original-receipt replay after a later release. One
  intermediate focused run was22 pass/1 test-helper missing-operation failure;
  the helper invocation was corrected, not the product assertion. The full284 and focused23 successful
  runs cover the current286 backend cases; the focused set overlaps21 full cases.
- Initial native geometry: desktop1440 padding24px, touch390 padding16px;
  controls44px, minimum computed contrast6.484:1,0 horizontal page/dialog overflow.
  Widths320/360/768/1024 and real200% Chrome (devicePixelRatio2→4,
  innerWidth1427→713) pass. Keyboard Enter/Escape/focus return and mobile touch
  pass; unexpected page/console errors0. All12 final captures were rechecked in
  the second and final main batched inspection after the functional correction.

## Final executable and finish gates

All commands below use the actual manifests and the explicit backend venv. Every
DB-writing suite ran serially under the same isolated-target advisory lease.
The browser commands used the real HTTPS frontend/API/PostgreSQL/ClamAV stack,
not mocked application routes. Optimized runs temporarily set
`KAY_E2E_PRODUCTION=1`, restore its previous value and preserve the inner exit.

| Gate | Command or repeatable selection | Observed final result |
|---|---|---|
| Backend quality | backend: `.venv/Scripts/python.exe -m ruff check .`; `-m ruff format --check .`; `-m mypy app` | All exit0;145 Python files/92 app modules |
| Backend full regression | backend: `.venv/Scripts/python.exe -m pytest --cov=app --cov-report=term-missing -q --tb=short` |284 passed446.16s,95% coverage,0 failed/0 skipped |
| Final affected backend | backend: `.venv/Scripts/python.exe -m pytest tests/test_reservations.py tests/test_reservation_migration.py tests/test_reservation_http.py -q --tb=short` |23 passed46.66s,0 failed/0 skipped; together with full284 covers286 current cases, not one286-case run |
| Five-target deal/reservation | frontend manifest `npm run test:e2e`; select `tests/e2e/deals.spec.ts` and `tests/e2e/reservations.spec.ts`, one worker |35/35 passed10.5m,0 skipped; retained initial candidate |
| Broader compiled Chrome | frontend manifest `npm run test:e2e`, Chrome selection for programme/private clean-and-rejected files/standalone inventory/requirements/four shell cases |8/8 passed2.8m,0 skipped; non-fatal Windows Proactor pipe ConnectionResetError10054 retained, no required test failed |
| Final copy-affected compiled matrix | frontend manifest `npm run test:e2e`; `SP12` selection on all five projects, one worker |15/15 passed5.6m,0 skipped/exit0; final build below |
| Final visible Chrome | frontend: `npm run test:chrome -- tests/review/reservations.chrome.spec.ts --max-failures=1` |1/1 passed44.7s; all12 refreshed native captures valid; keyboard/touch/320–1440/actual200%/retained reason/current-stock/error/denied cases pass |
| Native finish | One main final visual batch plus fresh independent reviewer |[Finish review](../../../.impeccable/sp12-finish-review.md): ship, all12 captures valid/canonical hashes match, no material fixes within the scoped interface; reviewer snapshot preceded final15 result |
| Required documentation handoff | Fresh Impeccable documenter compares implementation with incumbent system |[Documenter report](../../../.impeccable/sp12-documenter.md); existing system/component facts retained, no new theme/token/world |
| AFTER audit | One detector invocation on10 changed UI targets, native/manual review |Detector `[]`/exit0; [AFTER012](../../../anti-slop/audit-012-2026-10-15.md):0 HIGH/0 MEDIUM/0 LOW new aesthetic findings; no audit-only fix |
| Privacy | frontend: `node scripts/scan-client-secrets.mjs`; `powershell -NoProfile -File scripts/audit-report.ps1`; per-path ignored/tracked checks |4 roots/275 browser JS/0 configured-secret matches; final report2 JSON/15 result arrays/0 detailed arrays;8 private representative paths ignored/0 tracked; only `.last-run.json`,0 temporary profiles/traces/videos |
| Cleanup and shutdown | backend venv `assert_isolated`/`exclusive_test_run`/`clear_identity`/`reconcile`; `docker compose -f compose.clamav.yaml stop`; read-only listener/process counts |1 residual synthetic row removed/0 old orphan objects removed; both41 record tables empty/bootstrap unset;6 project ports/owned project processes0; ClamAV stopped/cache retained; shared PostgreSQL5432 and unrelated resources preserved |
| Documentation | root: `powershell -NoProfile -File docs/03-planning/validate-sprints.ps1`; `git diff --check` | Exit0;1067 local links/anchors including70 approved skill links,22 sprints/41 acceptance mappings/13 Mermaid pairs/9 JSON examples; SP-12 22 checked/0 unchecked. Repository contents are untracked, so diff-check is not a tracked-source baseline audit; no files were staged/committed |

Final optimized build: `vdAiKy5eJbtZ70GZWIiJ0`. The same250 app/migration files
have aggregate SHA256
`7823B32962E01FE9B60A51BEC1F7078C9883A239C0496C534EEE9CF69313EF39`
before and after the final browser/cleanup gates. Documentation-only handoff
changes do not alter that tested application fingerprint.

Final read-only `-m alembic check` and `-m app.cli.inspect_database` pass in both
selected environments:43 tables, head`0014_reservations`, no upgrade operations,
distinct OIDs109060/109061, same cluster and unrelated-catalogue hash above.
Development was never seeded/reset/cleaned. Test cleanup first verified its exact
identity, synthetic-account guard, lease and resolved environment-specific file
root; only that isolated target was mutated. The one residual test row is
disposable synthetic fixture state, not recoverable customer history.

## Security checklist review at the local boundary

The applicable [security check](../../SECURITY_CHECK.md) was reviewed for contact
records, permissions, stock, outbox, migrations and logs. Current sessions/scope
precede both mutations and replays; hostile actor/expiry/boolean-version fields,
missing/bad CSRF/facade proof, unknown query parameters and copied private IDs are
denied. Archived contacts are read-only; transfer revokes former access and merge
does not rewrite the hold's original author/target. Shared stock returns safe codes,
not private holding-deal/contact IDs. Exact target/parent versions and immutable
history/partial indexes are server/database safeguards, never client authority.

All test writes use the separate verified PostgreSQL target and exclusive lease;
the development upgrade is additive and its41 record tables remain empty. History
downgrades fail closed. No production access, external messages, real-data import/
export, purchase or new secret was used. Existing private-file TLS/session/scan
regressions pass in the real backend suite; the file worker still cannot consume
stock events. No request payload/raw driver diagnostic is added to logs. Current
browser-bundle scan finds0 configured facade-secret occurrences across275 JS files.
Final report sanitization and owned-process shutdown pass as recorded above.

## Remaining limits

Product/design review remains Khalid's. SP-13 owns win/loss/cancellation/reopening,
whole-development outcome stock effects and committed-child close review. SP-15
owns the future stock-notification consumer; events are durable now, not delivered
by a made-up worker. Real-data use, production, real-device Safari, final brand/font
approval and full C01–C14 acceptance are not claimed. Prior optional aesthetic
findings remain unselected and untouched.
