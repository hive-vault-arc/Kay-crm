# SP-20 execution

Status: technically_accepted; all scoped local gates passed.
Date: 2026-10-16. Product review: pending Khalid, not implied by technical checks.

## Task and focused acceptance, recorded before implementation

C12/C02/C11/C14/C13; BR03/04/21; intake AT22/30 and affected AT23.
Implement only the signed loopback simulator, durable receipt/outbox, current
private-phone routing and received Leads. Preserve SP01–19, French interface,
revocable staff sessions, existing PostgreSQL queue, shadcn/Tailwind and tokens.
No actual website, production, external send, real data, new broker or dependency.

Predefined focused E2E: isolated current agent A/private contact and agent B;
stop real worker, submit through separate HTTPS form server, inspect opaque
durable receipt/same-ID retry, restart worker and observe one enquiry only as
authorized A/M/A. B has no record/count/private response. A new submission on
the same phone creates a second enquiry without changing contact identity.
Cover invalid/tampered/expired signatures, changed-body conflict, role/owner
injection, body/rate bounds, two-connection duplicate/phone races, rollback,
source revocation, current assignment, actual interrupted worker and replay.

Necessary-only test boundary: focused PostgreSQL/API/migration and affected
ownership cases, backend quality, frontend lint/type/build, compiled Chrome
intake and native desktop/mobile/states/keyboard/touch/actual200% zoom.
No full CRM/coverage/5-browser/real-device/load/backup claim.

Proposals made explicit before implementation: distinct durable source authority,
active server-configured default agent for new phones, no identity/ownership
overwrite on known phones, current eligible primary else manager queue; true
source authorship rather than a fabricated staff user. Khalid confirmed:
“Yes, follow the sprint within the existing KAY interface.”

## Found and changed

Earlier staff-authored modules assumed non-null staff authors. Migration0022
preserves all existing actors and permits null user only with a true source FK
and SQL XOR. Contact/phone/email/enquiry, timeline and audit retain immutable
source provenance. Merge preserves it; reporting does not count source events as
human activity. Read-only source labels include Site web; manual create choices
still exclude website. Existing private staff authorization is unchanged.

New backend app/intake configuration/contracts/authentication/service/router/
models/worker/simulator; local website_source/website_simulator/website_control
CLIs. Existing shared worker/status/outbox/contact-history/audit/merge modules
integrate source events. No new dependency/lock/package/framework/chart/raster.

A separate venv HTTPS127.0.0.1:8001 form server signs server-side with ignored
configuration, verifies private-CA loopback upstream TLS, disables redirects/
environment proxies, and proxies only its Next support page/allowlisted static
assets. Exact Host/Origin/JSON/body checks protect it. Numeric127 host does not
receive localhost staff cookies. Test origin8102 is separate from staff3100.

HMAC timestamp/raw bytes/current source, five-minute window, strict input,
8,192-byte cap and persistent300/minute budget precede receipt. Commit receipt
and typed outbox before202; same source/submission exact body returns same
receipt; altered bytes409. Public responses contain ONLY receipt_id/state.
New submissions remain new enquiries, canonical phones remain one contact.

Database-only effects commit with job inside one short transaction using the
existing agency lock and row locks; no external operation requires lease fencing.
Actual process kill rolls back the claim/effects, leaving durable receipt/outbox.
Five bounded attempts/backoff and explicit retained-receipt operator recovery.
Source disable invalidates work. No deal/inventory/external messaging effect.

Frontend features/intake and /website-simulator compose shared shadcn controls/
Tailwind reading column. Empty/validation/loading/queued/processed/failed/outage
and same-send retry states, no public staff selector. Receipt kept in page memory,
not browser storage/URL. Received Leads/detail/history use existing French views.
[Exact wire, routing, schema and local operation](../../04-design/website-intake-local.md).

## Commands and results

All Python from backend/ through .venv/Scripts/python.exe; npm/scripts frontend/.
Actually read versions: Python3.14.3, FastAPI0.143.1, SQLAlchemy2.1.4,
Alembic1.20.0, Ruff0.17.0, mypy1.20.2, pytest9.1.1;
Node24.13.1/npm11.8.0, Next16.4.0, React19.3.1, Playwright1.64.1.
Native Chrome155.0.8059.79.

| Boundary | Exact command | Actual scoped result |
|---|---|---|
| Backend/API/real PG | .venv/Scripts/python.exe -m pytest tests/test_intake.py tests/test_intake_process.py tests/test_intake_migration.py tests/test_ownership.py -k 'intake or same_scope_merge or collaboration_transfer or history_immutable' -q --tb=line -x |19 passed/10 deliberately deselected/0 skipped56.21s |
| Backend quality | .venv/Scripts/python.exe -m ruff check .; .venv/Scripts/python.exe -m ruff format --check .; .venv/Scripts/python.exe -m mypy app |exit0;262 formatted files/169 typed modules |
| Frontend base quality | npm run lint; npm run typecheck; npm run build |exit0; original build oocAcInU26JIyYc52pW0O |
| Final F1 quality | npx eslint src/features/intake/website-form.tsx tests/review/intake-body.chrome.spec.ts --max-warnings=0; npm run typecheck; npm run build |exit0; final build pFQv5uidqUuJVIgkip1ty |
| Compiled Chrome E2E | npm run test:e2e -- tests/e2e/intake.spec.ts --project=chrome --max-failures=1 |final-build1/1 passed28.8s/42.4total,0 skipped; original28.4s/42.2total retained |
| Full native Chrome | npm run test:chrome -- tests/review/intake.chrome.spec.ts --max-failures=1 |1/1 passed45.5s/59.2total,0 skipped |
| Zoom evidence repair only | npm run test:chrome -- tests/review/intake-zoom.chrome.spec.ts --max-failures=1 |final1/1 passed5.9s/18.5total; main opened valid2824x2768 frame |
| F1 native actual body rejection/correction | npm run test:chrome -- tests/review/intake-body.chrome.spec.ts --max-failures=1 |final1/1 passed24.5s/37.8total,0 skipped; earlier passing runs had malformed mobile evidence, not accepted as valid |
| Dev additive migration | .venv/Scripts/python.exe -m alembic upgrade head; .venv/Scripts/python.exe -m alembic check |exit0; guarded0021->0022, no drift/reset |
| Browser secret scan | node scripts/scan-client-secrets.mjs |4 roots/285 JS,1 configured signing key;0 facade/signing occurrences |
| Report privacy | powershell -NoProfile -File scripts/audit-report.ps1 |2 JSON/1 step array/0 detailed arrays |
| Private ignore boundary | git check-ignore and git ls-files on12 exact named private paths |12 ignored/0 tracked |

Browser commands temporarily set KAY_E2E_PRODUCTION=1 and restore prior value.
Test supervisor acquires shared exclusive lease; no concurrent fixture reset.

Focused backend covers malformed/missing/tampered/unknown-source signatures,
exact frozen +/-300/301seconds, strict fields/invalid phone/email/time, chunked
body cap, rate persistence and public registration404. Same receipt across
queued/processed, changed raw body409, new same-phone enquiry, current transfer/
ineligible manager routing, source revocation/rotation, rollback before202 and
after proposed effects, five retries/failed retained receipt, real local CLI
recovery, SQL immutability/typed outbox and source-preserving merge. Two real
connections cover identical submission and same-phone different submissions.
Actual app.cli.worker process is blocked on the agency lock after durable receipt,
identified as a PostgreSQL waiter, killed only by its exact owned process tree,
then restarted twice with real --once: one contact/one enquiry. No product fault
endpoint or fixture-only simulated worker.

Populated isolated migration downgrades empty source schema22->21 around an
existing staff Lead, upgrades22, preserves IDs/staff authors and checks no drift.
Retained source/receipt history refuses downgrade. Development verified exact
cluster7607060034405909976/name kayrealestate/OID109060/head0021 and zero record
rows before additive upgrade. After:66 record tables0 rows/bootstrap unset,
default schedule version1/capacity2/no editor/no explicit work/lunch windows.
No staff/source seeded; normal first-admin/active-agent setup remains prerequisite
before the operator configures the development source.

Compiled E2E loses a real202 acknowledgement after receipt commit, retries exact
bytes, observes one effect after worker restart, submits a second deliberate
enquiry for the same contact, and verifies current agent/manager versus unrelated
agent0/copied404. Public projection has exactly2 keys; simulator cookies[].

Native workflow: widths320/360/390/768/1024/1440, no horizontal overflow;
minimum measured semantic contrast6.113:1; inputs48px,textarea96px,buttons44px.
Tab/required validation, native touch, held loading, queued, status outage with
receipt retained, processed/new empty form, real operator source-disable/worker
invalidation/failed receipt, current Leads/detail/source history and denied mobile.
Actual200% isolated Chrome preferences: DPR2->4, innerWidth1427->713, no overflow.
Unexpected console/page errors0; expected422,network abort/copied404 narrowly
separated. F1 real3,000 three-byte Unicode characters exceeds body cap, actual413
keeps draft editable/no receipt; shorter text submits202 and processes normally.

## UI skills, inspection and independent review

Read antislop, design-system-ops, design-taste-frontend completely and required
references; responsive/React/uncodixfy/Impeccable supplement. Antislop AFTER.
Registered direction: .impeccable/surfaces/frontend-src-features-intake-website-form-tsx.md.
ENERGY1/RHYTHM1/MOTION1; DESIGN_VARIANCE3/MOTION_INTENSITY1/VISUAL_DENSITY5.
Nine original Approved V3 PNGs inspected. New form inherits family04; received
list/detail03/05. No claim of broader V3 redesign acceptance. Dense CRM/list/
detail/operational forms exclude marketing concept/comp/seed/QUALITY BAR/raster.
Existing missing PRODUCT/design.json is inherited drift, not silently repaired.
No new token/palette/font/CSS/library/chart; Bklit N/A.

Two batched main visual inspections14 originals+2 canonical. Original captures
in frontend/output/playwright/sp20-*.png; canonical hashes equal form desktop/
mobile. .impeccable/sp20-captures.json records hashes/dimensions. Zoom image was
invalid despite passing geometry: Chrome CDP CSS/physical/DIP units differ.
Evidence-only recapture corrected the clip using device-scale conversion; main
opened complete frame. No relabelling old images as final-build captures.
Three additional F1 desktop/mobile/recovered PNGs opened/validated, named in
.impeccable/sp20-f1-supplement.md. Original unchanged-state evidence remains valid.

One detector only on7 changed targets: .impeccable/sp20-detector.json [].
[AFTER020](../../../anti-slop/audit-020-2026-10-16.md) records every R01-R38/C1-C5:
0 new aesthetic-only findings, no unselected aesthetic fixes. Earlier optional
findings untouched. Fresh finish reviewer initially fix F1:413 recovery text
incorrectly suggested name/phone/email. Corrected only that functional message;
draft preserved/unlocked and real rejection/correction test passes. Final named
re-review and factual documenter results recorded in closure below.

## Corrected attempts and limits

- Synthetic credential fixture initially violated valid temporary-expiry SQL
  constraint; corrected fixture, not product constraint.
- Future301second test aged into acceptance during startup; use far-future
  rejection plus frozen-clock exact +/-300/301 boundary, not looser assertions.
- Worker claim clock originally preceded agency-lock wait and could miss newly
  available work. Capture clock after lock; final real concurrent cases pass.
- Draft downgrade attempted a newly added source guard not installed in an
  earlier local draft; idempotent IF EXISTS plus canonical isolated down/up passes.
- Browser alert selector initially matched Next route announcer; scope by exact
  error content. Multi-actor login now clears previous context before sign-in.
- Native expected copied404 was initially classified unexpected; narrowly
  separate expected response, retain unexpected-error assertions. Wait for
  refresh to settle before processed capture.
- Zoom geometry passed while screenshot clip was wrong; see explicit recapture
  and lesson. It was not accepted as valid evidence until opened/corrected.
- Initial pytest short traceback exposed a synthetic credential hash in SQL
  detail; final commands use --tb=line. No real credentials/records were used or
  copied into docs/lessons/captures.
- F1 independent review uncovered inaccurate413 recovery and is retained, not
  hidden by final pass. No broader aesthetic-only changes.
- F1 recapture: first375x856 Playwright image and first750x1648 CDP replacement
  omitted15px of classic scrollbar/layout width. Reviewer returned recapture,
  not ship. Final settled DOM-width capture780x1712 includes full right controls/
  padding; desktop2880x2000 and corrected receipt390x844 also opened again.
  Native runs25.3s/24.6s passed but did not by themselves validate screenshots.

Q01 actual site/owner unknown; local signed contract only. No production/real-data/
external send. Development bootstrap and explicit active-agent source setup not
performed with invented staff. Real-site key ownership/ACLs/retention/privacy
remain Q01/Q02/Q03. Inherited full npm audit9 HIGH dev-toolchain findings and
SP17 runtime audit0/latest valid Python lock evidence retained; no new dependency
audit/upgrade claim. Full CRM/coverage/five-browser/real-device/load/backup/SP22
not run. Protected business/financial retention and broad V3/product approval
remain independent. SP21/22 not implemented by this task.

## Closure

Final-build compiled Chrome1/1 passes28.8s/42.4total. Final source/app/migrations
fingerprint446 files SHA256
801A3BD7BAB002A03CD69DDAB3DAA7934681433A70CF89B2CBE7EF59BCB6B411.
Final source has no later UI edit after build pFQv5uidqUuJVIgkip1ty.

Guarded isolated testOID109061 cleanup under exclusive lease:0 residual synthetic
rows/0 orphan objects removed;66 record tables0 rows/bootstrap unset. Development
OID109060 remains0022,69 tables/66 record tables0 rows, bootstrap/schedule defaults
preserved. Only isolated synthetic fixtures were cleared, no development reset.
All project app listeners3000/8000/8001/3100/8100/8101/8102/3310 and identified
project Node/Python service processes0. Shared PostgreSQL5432 preserved; unrelated
Docker/services untouched. No lingering launched cmd/PowerShell service helper.
Privacy repeated after final browser evidence:4 roots/285JS/1 configured signing
key,0 configured facade/signing matches;2JSON/1step array/0 detailed arrays;
12 exact private paths ignored/0 tracked.

Read-only documentation validator final pass:22 sprint specifications,1191 local
links/anchors(including70 approved installed-skill links),41 AT mappings,
13 embedded Mermaid sources and10 API JSON examples. One intermediate validation
failed only because the evidence row label was shortened; restored the required
“UI skills and AFTER audit” label, not the validator or any test requirement.
Fresh independent finish reviewer final disposition ship:
F1 corrected and malformed capture repaired; original full-slice review plus
named correction follow-up, not a new full-product review. Documenter preserved
DESIGN and added only the factual receipt composition note.

[Finish review](../../../.impeccable/sp20-finish-review.md),
[documenter](../../../.impeccable/sp20-documenter.md). All23 sprint checkboxes
complete; no unresolved required scoped defect. Khalid's product acceptance
remains pending. Next safe action is product review or a separately requested
SP21; no SP21/22 implementation or full-product completion is claimed.
