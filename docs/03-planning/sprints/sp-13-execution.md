# SP-13 execution record

Status: technically_accepted; scoped SP-13 local gates passed. Product review: pending Khalid.
Date: 2026-10-15 UTC.

## Task and acceptance defined before implementation

Implement C04/C08/C09/C13/C14 through explicit won/lost/cancelled close,
authorized reopen and manager-only external stock outcomes. Preserve original
outcomes, primary-agent-at-close and true actors; no required commission, income
or financial deletion. Respect BR-10/11/12/13/14/27/28, Q-06's hard review block
and AT-10/11/12/13/14/34 plus AT-23's relevant UI variants.

Khalid confirmed: "Yes, follow the sprint within the existing KAY interface."
Read the SP-12 accepted boundary before building; preserve all unrelated source.
All backend execution uses backend/.venv, synthetic writes use the separate
verified test database and the shared exclusive lease. Never reset development,
use production/real data, send externally, spend or expand commercial scope.

## Focused E2E defined before implementation

Create scoped synthetic competing deals and standalone/unit/whole offerings.
Reject incomplete winning close, close without commission, inspect sale/rental
effects and competing flags without closing competitors, retry after a committed
response interruption, reopen with a reason and inspect retained original history.
Use external manager outcome to create an intervening-stock review conflict;
show a programme with an already committed child blocked without an override.
Cover agent/collaborator/outsider/manager, transfer/archive/merge, invalid fields,
stale versions, two real PostgreSQL-session races, rollback and replay. Exercise
actual French desktop/mobile controls, keyboard/touch/zoom and failure recovery.

## Implementation proposals

- Won requires positive exact MAD amount/date/explanation; lost/cancelled require
  date/explanation, not an invented agreed amount. Commission belongs to SP-16
  and is never required, created or erased by these commands.
- Immutable outcome and linked reopening rows retain the previous stage,
  selected offering/terms, true actor and responsible-agent-at-close snapshots.
- Inventory owns explicit stock effects, typed durable outbox and safe previews.
  Reviewed fingerprints bind all affected stock facts; reopen restores only its
  own unchanged effects, never an old reservation or another commitment.
- Whole outcomes reject committed children and opposite-kind holds for review;
  propagation flags competing deals, never closes them. No remaining-unit override.
- Extend the incumbent French flat KAY records with shared shadcn controls and
  Tailwind semantic geometry, no new theme/token/font/kit/chart/dependency.
  Design-taste's dense CRM/form/marketing exclusions apply; antislop remains AFTER.
  Existing-world Impeccable review/documenter gates apply, not a new identity.

## Required gates

Real PostgreSQL migration/preservation/downgrade refusal/direct-write/race tests;
Ruff/format/mypy/full pytest; frontend lint/types/build; real-stack five-target
Playwright and visible Chrome; native desktop/mobile/state evidence in at most
two main batches, one detector, AFTER audit and fresh finish/documentation roles;
security/privacy/dependency checks, docs/traceability and owned-service shutdown.
Unrun/failed/skipped checks are not passed by inference.

## Progress and retained attempts

- Read SP-13 and relevant scope/decisions/rules/permissions/workflows/architecture/
  model/API/AT contracts, harness/security/engineering/lessons and current QA.
  Required UI skills and relevant references were read; existing SP-12 native
  mobile evidence, tokens and controls establish the incumbent composition.
- Initial7 PostgreSQL outcome cases pass18.23s. Expanded run stopped9 pass/1
  race-fixture error34.86s: reserving an already closed deal correctly failed
  before the stock lock. The corrected probe uses the still-open child deal.
  Next run stopped12 pass/1 fixture KeyError33.42s: standalone projections omit
  optional hierarchy keys; the helper now treats absence as unknown, not failure.
- Initial Ruff/mypy findings corrected;101 strict application modules pass.
  Frontend lint/types/build pass; final tested candidate will be fingerprinted.
- One guessed migration CLI was absent and executed no migration. The existing
  scripts/venv Alembic command applied the isolated draft. A later new guard made
  draft downgrade fail on its missing trigger; IF EXISTS supports reconstruction
  of this unpublished empty draft only. Verified test OID109061/empty record
  tables/exclusive lease then downgrade0014→upgradehead/check all exit0. Development
  remains untouched at0014 until final additive migration acceptance.
- A generated allowlist edit mishandled JavaScript replacement-dollar syntax;
  TypeScript caught it before any browser run. Literal template strings are fixed,
  and frontend type/lint/build checks pass. No audit-only aesthetic fix was made.
- Expanded focused backend17/17 pass45.80s,0 skipped after fixture corrections.
  Initial optimized Chrome:2 pass/1 failed1.7m. The last workflow completed the
  external outcome but its test expected different review wording; corrected to
  assert the real safe stock-review message, not weakened stock/permission checks.
- Direct-SQL regression intentionally exposed committed→available bypass:1 fail
  (missing IntegrityError),3.32s. Added latest-unreversed effect/state/version/terms
  consistency, preserving the original outcome; final migration/rerun is required.
- Corrected SQL guard and complete reviewed-body validation now pass all32
  focused cases99.54s,0 skipped: hierarchy combinations, external whole propagation,
  direct state/price/period/history rejection, populated upgrade/downgrade refusal
  and strict HTTP proof/scope/CSRF/hostile fields included. Full regression started.
- External inventory history now exposes only original outcome date and external
  origin through typed effect links; no private agreed amount/deal ID/explanation.
  Visible Chrome is being prepared; no valid SP-13 capture or finish verdict yet.
- Proposal before final flag coverage: occupancy changes should flag affected
  sale deals even when their campaigns remain active. This requests review only;
  it does not block sale or automatically close/reassign anyone's deal.
- Initial full regression:317 passed/1 failed672.24s,94% coverage,0 skipped.
  The SP-11 test still classified close/reopen as nonexistent future routes;
  SP-13 correctly validates them (422 for incomplete bodies). Updated that test
  while retaining404 for an unknown command and all existing authority guards.
  Broadened competing flags to the reviewed scope, including active sale campaigns
  affected only by rental occupancy; added explicit standalone/whole assertions.
- Dependency checks: npm runtime audit0 vulnerabilities; full development tree
  remains9 inherited HIGH/0 other advisories. Both Python hash-lock audits report
  no known vulnerabilities; pip check reports no broken requirements.
- Final affected backend rerun:51/51 pass127.65s,0 failed/0 skipped, including all
  32 SP-13 cases and19 prior deal-edge cases. Ruff check/format and mypy pass
  (162 Python files/102 strict app modules). Documentation preflight passes:
  1067 local links,22 sprints/41 mappings/13 Mermaid pairs/9 JSON examples.
  Compiled candidate build is `UKU1NTEcrhrZPGt-Aagvx`;266 app/migration source
  files aggregate SHA256 `0E0A3FE2D955013DAECD9051E976CCBE1D0FF7DC0DA967562D820FE69DFA7409`.
- Development additive upgrade0014→0015 passes,43→48 tables, no Alembic drift.
  OID109060/cluster7607060034405909976 and unrelated-catalogue hash
  `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
  are unchanged. Development was not reset or seeded.
- Initial headed run completed all interactions/captures but failed its final
  generic console assertion (one unclassified error),1.2m. A bounded diagnostic
  now records only safe network codes and recognizes deliberate mobile reopen
  interruption only on that exact endpoint during the controlled abort. No
  application error is hidden; a clean rerun is required. Test lint/types pass.
- Headed rerun passes1/1,1.4m total, all16 native captures and actual200% proof.
  Expected `net::ERR_CONNECTION_FAILED` is tied to the deliberate reopen abort;
  unexpected console/page errors0. Desktop/mobile padding24/16px, controls≥44px,
  minimum measured contrast6.484:1 and0 horizontal page/dialog overflow pass.
  First batched main inspection validates all16 captures but finds one functional
  inherited file message: closed deal attachments falsely said contact archived.
  Corrected only the deal read-only message; contact-archive semantics unchanged.
  Added explicit closed/not-archived browser assertions. Final build/affected
  matrix and second/final capture batch are required; no audit-only fix applied.
- The initial50-case compiled matrix was deliberately stopped after5 passes to
  rebuild the functional attachment-copy correction. Exit1/interrupted is not a
  clean matrix or passing final acceptance. Final frozen app/tests rerun follows.
- Final optimized build `7M8Dzh4lJCpDJgX2UM3FC`, same266 source files SHA256
  `10C6FFBD1A1BA5939DA42F586970521F493B03DA2D2DDF2CF91393FE84E605A1`.
  Lint/types/build pass; final headed full workflow1/1 passes1.5m, including the
  corrected closed-deal attachment state. All16 images were inspected in the
  second/final main batch. One desktop full-context capture caught the older
  proposals child still loading; isolated settled evidence repair is required
  before independent review, not a further UI-polish pass. Other15 are valid.
- One detector on14 changed UI files returns[]/exit0; AFTER013 has0 new aesthetic
  findings. No second detector or audit-only fix. Interim client scan:4 roots,
  277 JS files/0 configured-secret matches. Interim headed report2 JSON/1 result
  step array/0 detailed arrays; matrix report remains pending. Development
  read-only inspection confirms46 record tables empty/bootstrap unset.

## Security boundary record

The applicable SECURITY_CHECK gate covers private contact/deal records, roles,
stock dispositions, immutable history, outbox, migration and logs. Backend
authority is current session plus current contact scope, not an opaque ID or
review fingerprint. Dedicated strict endpoints reject hostile actor/owner,
boolean version, commission/income, override and remaining-unit fields. Missing
facade proof/CSRF/Origin, outsiders, revoked/transferred access, archive writes,
stale stock and incompatible replay fail closed. Tests retain originals after
rollback, committed interruption, transfer, merge and reasoned reopening.

Inventory previews and shared history contain safe target/state/date/origin only,
not private buyer, deal amount or explanation. KAY stock events use fixed safe
descriptions. Manager external stock creates no KAY win or income. The PostgreSQL
outbox keeps typed inventory-event ancestry; the existing file worker still
filters file.scan and cannot consume stock notifications. There is no broker,
automatic notification consumer, timer expiry or financial correction/deletion.

Current stock commands share development-first/sorted offering locks. The focused
suite proves actual two-session close/close, close/reserve and reopen/reserve
waiters, one success/one safe conflict, complete reviewed scope, SQL commitment
guards and populated migration/downgrade refusal. Original actor/responsibility
snapshots remain immutable; retries do not create a second result or reversal.
Test writes use OID109061 only; development OID109060 is inspected read-only
except the accepted additive migration. Its46 record tables remain empty and
bootstrap unset. No real account/contact/document was seeded or used.

Eight representative private paths are ignored/zero tracked; compiled client
scan reports0 configured facade-secret matches across277 JS files. Static/RSC/
HTML direction-metadata scan reports0 matches. Values are never printed. Final
report/profile/artifact checks and owned service shutdown remain separate gates.
No production, external messaging, real-data import/export, spending or new secret
was used. Dependency findings remain9 inherited HIGH frontend development-only
entries; runtime and Python audits are clean. No forced incompatible downgrade.

## Remaining limits

Scoped technical acceptance is complete, with final command/finish/privacy gates
recorded below. Product/design approval remains Khalid's. SP-14–SP-22
are not implemented by this request. Q-06's partially committed whole-development
review boundary has no invented override or remaining-unit transaction expansion.
SP-15 owns notifications; stock events are durable, not delivered by a fake
consumer. SP-16 owns optional finance and must rerun reopening with real synthetic
financial rows; nonexistent commission records are not claimed as preserved tests.
SP-17 owns actual KPI aggregation against outcome/responsibility snapshots.
Full-product/load/recovery/production, real data/device Safari and final brand/font
approval remain outside this scoped acceptance. No p95, RPO or RTO is invented.

The inherited private-file API continues current contact authorization; this
sprint does not invent a new stage-based file permission. Closed deal detail uses
a read-only file composition while ordinary deal/proposal mutations require
reopen. Frontend writable props are presentation only, never authority or a claim
that backend file policy was changed. Original protected file history is retained.

## Final executable gate register

All Python execution uses backend/.venv; DB-writing suites run serially under the
same fail-closed isolated-target lease. Browser checks use the real HTTPS compiled
frontend/API/PostgreSQL/ClamAV stack, synthetic actors and isolated contexts.
`KAY_E2E_PRODUCTION=1` is temporary and its prior value/inner exit are restored.

| Gate | Command/directory | Actual final evidence |
|---|---|---|
| Backend quality | backend venv Ruff check/format --check/mypy app | All exit0;162 Python files/102 strict app modules |
| Backend affected | backend venv pytest six test_outcome files plus test_deal_edges, -q --tb=short -x |51/51 pass127.65s,0 failed/0 skipped |
| Backend full | backend venv pytest --cov=app --cov-report=term-missing -q --tb=short |318/318 pass681.74s,94% coverage,0 failed/0 skipped; initial317 pass/1 obsolete assertion retained above |
| Frontend quality | frontend npm run lint/typecheck/build | All exit0, final build7M8Dzh4lJCpDJgX2UM3FC |
| Five-target compiled workflow | frontend npm run test:e2e -- tests/e2e/deals.spec.ts tests/e2e/reservations.spec.ts tests/e2e/outcomes.spec.ts --max-failures=1 |50/50 pass17.4m,0 failed/0 skipped;10 per browser |
| Broader compiled regression | Chrome mixed hierarchy/private clean-and-rejected files/standalone inventory/requirements/four shell cases |8/8 pass2.8m,0 skipped; non-fatal Windows Proactor10054 retained |
| Visible Chrome | frontend npm run test:chrome -- tests/review/outcomes.chrome.spec.ts; select visible workflow or settled context case independently | Full1/1 pass1.5m plus settled/refresh1/1 pass33.0s;16 valid native captures, actual200% |
| UI finish | Required skills, two main batches plus context evidence repair, one detector/AFTER013, fresh reviewer/documenter | Detector[]; zero new aesthetic findings; reviewer ship at inspected UI scope; documenter No system changes |
| Privacy/isolation/shutdown | Client/report/ignored-path scans, exact target lease cleanup, Compose stop/listener/process checks |277 JS/0 configured secrets; final report6 JSON/8 arrays/0 detailed;10 paths ignored/0 tracked;46 test record tables empty/bootstrap unset;6 project ports/root-identified processes0; ClamAV stopped/cache retained |
| Documentation | root validate-sprints.ps1 and git diff --check | Passing1078 links/22 sprints/41 AT mappings/13 synchronized Mermaid pairs/9 JSON examples; final status-only recheck below |

Five-target final compiled matrix completes50/50 passed17.4m,0 failed/0 skipped,
exit0:10 cases each Chromium/Chrome/Edge/Firefox/WebKit, including15 SP-13 cases
plus35 prior deal/reservation regressions. Full application fingerprint is unchanged.
Installed Chrome155.0.8059.79/Edge155.0.4283.45, Node24.13.1/npm11.8.0,
Playwright1.64.1; Python3.14.3/Ruff0.17.0/mypy1.20.2/pytest9.1.1.
Real ClamAV1.5.4/signatures28154 (2026-10-15) is healthy. Final test-only
capture-readiness/refresh-control additions pass lint/types, without a UI rebuild
or source change. Broader Chrome/settled evidence/full backend remain pending.

The settled headed context/refresh case passes1/1,20.3s test/33.0s total. Only
context-desktop is replaced with a fresh same-build synthetic fixture; main opened
and validated that image. All16 final native captures now show the claimed states;
canonical desktop/mobile hashes match their respective native viewport bytes.
Both explicit effects-refresh controls preserve dates/reasons/amounts. This is
evidence repair after two main UI batches, not another polish loop. The50-case
report privacy check passes4 JSON/50 result arrays/0 detailed arrays. Broader8
compiled Chrome cases and clean full backend run remain pending.

Broader compiled Chrome passes8/8,2.8m,0 failed/0 skipped: actual mixed hierarchy,
private/shared clean-and-rejected bytes with real ClamAV, standalone inventory,
requirements/shortlists and four shell/navigation/accessibility cases. A known
non-fatal Windows Proactor pipe ConnectionResetError10054 is retained in output;
no required case failed, and subsequent requests completed. Final report privacy
passes6 JSON/8 result arrays/0 detailed arrays. Repeated final client scan remains
4 roots/277 JS/0 configured-secret matches. Clean full backend rerun has started.

Fresh independent [finish reviewer](../../../.impeccable/sp13-finish-review.md)
returns ship at the supplied SP-13 UI scope, all16 captures valid/canonical hashes
matching, no material fixes. Its five contract sections are present. Generic
persistence fails on pre-existing missing PRODUCT.md/design.json; scoped incumbent
extension persistence/fidelity pass, with drift reported rather than repaired
unasked. The reviewer does not certify the separate backend/full-product/human
gates. Fresh required documenter is checking incumbent-system persistence.
Final artifacts inspection finds only.last-run.json in test-results;10 private
representative paths are ignored/0 tracked. No profiles/traces/videos remain.

Fresh required [documenter](../../../.impeccable/sp13-documenter.md) returns
No system-document changes needed, after comparing incumbent DESIGN/system/tokens,
shared controls, four feature sources and all16 native images. It writes only its
scoped report. Existing metadata/aged design prose remain reported drift, not
canonized or repaired; no theme/font/token/kit/chart/raster change is justified.
This completes the required UI handoffs, not the still-running full backend gate.

## Final acceptance and handoff

Clean full backend rerun:318 passed681.74s,94% coverage,0 failed/0 skipped,exit0.
The focused51 overlaps this full run; these are not369 distinct tests. Final
compiled frontend50 five-target cases plus8 broader Chrome cases and two
independently selected headed cases pass. Earlier failed/interrupted attempts
remain above, not relabelled as successful final commands.

Final read-only Alembic checks/identity inspections pass in development and test:
48 tables, head0015_outcomes_reopening, no upgrade operations. OIDs109060/109061
remain distinct in cluster7607060034405909976; unrelated catalogue SHA256 remains
`4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`.
Development was never reset/seeded/cleaned. The final synthetic cleanup verified
exact test identity, exclusive lease, synthetic-user guard and resolved test file
root before using existing helpers:0 residual rows/0 old orphan objects removed;
46 record tables empty/bootstrap unset. Fixtures had already cleaned their data.

Compose stop leaves only the owned ClamAV container stopped (cache retained,
no volumes removed). All six project ports3000/8000/3100/8100/8101/3310 have0
listeners; root-identified command processes0. Shared PostgreSQL5432 remains
running (two IPv4/IPv6 listeners), and unrelated resources are preserved.

Final build remains7M8Dzh4lJCpDJgX2UM3FC. All266 application/migration source files
retain aggregate SHA256 `10C6FFBD1A1BA5939DA42F586970521F493B03DA2D2DDF2CF91393FE84E605A1`
before and after browser/full-backend/cleanup gates. Documentation and test-only
capture-readiness additions do not alter that tested application fingerprint.

Implemented: explicit won/lost/cancelled and original responsible-agent snapshots;
atomic sale/rental/whole-unit stock effects and competing flags; manager external
outcomes without KAY income; reasoned guarded reopening with immutable originals;
strict scoped APIs,0015 SQL guards/history/outbox, French KAY UI and executable
tests/contracts/traceability. No new financial, notification or future-option scope.

Residuals are disclosed, not falsely passed:9 inherited HIGH frontend development
advisories (runtime/Python clean); existing PRODUCT/design.json/aged design-prose
drift; the non-fatal Windows Proactor10054 diagnostic; product/design approval
pending; real-device/full-product/load/recovery/production gates outside SP-13.
The next safe in-scope sprint is SP-14; SP-14–SP-22 are not complete.

Final status-only documentation recheck passes:1078 local links/anchors (including
70 approved skill links),22 sprints/41 AT mappings/13 synchronized Mermaid pairs/
9 JSON examples; SP-13 has23 checked/0 unchecked criteria. git diff --check exits0;
repository contents remain untracked, so this is not a tracked-source baseline
audit. Nothing was staged or committed. Final read-only development inspection
again confirms46 record tables/0 rows/bootstrap unset. Final source fingerprint
still matches the266-file tested candidate above. Product review remains pending.
