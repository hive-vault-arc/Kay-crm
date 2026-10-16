# SP-06 execution evidence

Status: technically_accepted; applicable local gates passed, product review pending  
Date: 2026-10-14–15 UTC  
Product review: pending Khalid

## Outcome and focused E2E defined before implementation

AT-05: synthetic agent A creates a contact/enquiry. A manager grants B
collaboration; B records a note and a manual interaction. The manager previews
and confirms transfer A → B, without retaining A. Refreshing A's existing session
must deny contact, enquiry, history and retry access immediately. B sees the
original A/B authors and the manager's previous/new ownership event. Removing a
collaborator similarly revokes access. Explicitly retaining A must keep access.

AT-24: manager archives, inspects history, then restores the same contact. IDs,
enquiry links, original provenance and historical actors remain intact; agents
cannot access archived records. AT-04: agent merges two writable contacts with
an explicit survivor, preview, both versions, reason and retry key. Cross-scope
agent attempts fail without private projections; a manager can preview/confirm
them. Stale preview/version, phone conflict, concurrent commands and interrupted
transactions leave both originals intact. Replaying success creates no second
effect and always rechecks current access. Later link modules are not fabricated.

## Entry and implementation proposals

SP-05 is technically accepted; product review remains independent. Existing
ignored local configuration is reused; no credential note is copied or printed.
Development data must not be reset. All Python uses backend/.venv explicitly.

Technical proposals for this local slice (not new business decisions):

- One agency-first transaction serializes ownership/merge commands, locks contact
  IDs in stable order and phone rows, then rechecks authority. Signed impact
  previews include linked enquiry versions, preventing stale confirmations.
- Invalid enquiry assignments return to the manager queue, not an invented new
  agent. Explicit retention of the former primary is a collaborator grant.
- Append-only typed business history is independent of security-audit retention.
  Existing contact/enquiry audits are backfilled with their actual actors/times.
- A merged source remains an archived, identifiable alias to its survivor. Old
  URLs resolve only after survivor authorization. Normal archive is reversible;
  merge is not silently undone by Restore. Original identity values/history are
  retained; current enquiries move and retain an immutable original-contact FK.
- Survivor ownership/collaboration wins; collaborator lists are never unioned.
  Phone/email values retain original author/time/origin. Future contact-linked
  business modules must register a merge strategy; unknown links fail closed.

## UI skill applicability and design read

Read completely: antislop, design-system-ops and design-taste-frontend (including
the four applicable design-system reference files). AFTER audit timing remains
the user's selection; existing anti-slop pointer is reused, no wizard rerun.
Design read: French operational records for one KAY team; existing quiet light
surfaces, charcoal navigation/actions and restrained gold selection. Energy,
rhythm and motion dials: 1/1/1. Extend existing components/tokens; no new brand.

Contact tabs, ownership forms, history lists, previews and confirmation dialogs
are dense product/admin/multi-step surfaces. Design-taste's marketing hero,
photography, composition randomization and motion prescriptions are N/A under
its product-surface exclusion. System-first spacing, truthful states and clear
hierarchy apply. React best-practices/uncodixfy support existing component
boundaries; Playwright uses the sprint-required test files and existing private
test harness. Charts/Bklit are N/A: no chart is required in this slice.

## Verification register

Execution completed2026-10-14–15 UTC. Earlier focused failures are retained below,
not counted as passing gates. Results distinguish the full matrix from the
affected-case rerun after the narrow mobile correction; final headed and built
suites use that corrected source. All successful suites have zero skipped cases.

Verified executables: Node24.13.1/npm11.8.0, Playwright1.64.1,
Chrome155.0.8059.79, Edge155.0.4283.45, Chromium156.0.8078.4/rev1248,
Firefox157/rev1555 and WebKit27.2/rev2370; explicit backend venv Python3.14.3,
PostgreSQL18.2. Browser data is synthetic and the API/facade use local HTTPS.

| Check | Final observed result |
|---|---|
| Backend quality/full regression | Final `.venv/Scripts/python.exe -m pytest --cov=app -q --tb=short -x`:126/126 passed,zero skipped,143.82s,97% coverage; exited2026-10-15 00:03:08UTC. Includes both populated active/disabled migration variants. Ruff check/format pass69 files; strict mypy43 app modules. `alembic check`: no new upgrade operations. HTTPS smoke passes explicitCA/live/ready/direct403/no-store/untrustedCA refusal. |
| Frontend lint/typecheck/build | All exited0 after the final mobile correction; optimized build ID LnThz-vzAWUFV10tL8i1U. Node24.13.1/npm11.8.0. Same16 displayed build routes, including framework not-found and test-only UI checks; contact tabs add no new page routes. |
| Focused real Chrome E2E | All five SP-06 cases passed within the headed run, including lost acknowledgement/outage recovery. Separate four-case clean run passed1.2m. Duplicate-reuse focused E2E/visible regression2/2 passed47.4s after correction. |
| Full five-browser / headed / production | Full `npm run test:e2e`:155/155 passed,34.6m; exited2026-10-14 23:57:51UTC. Chromium/Chrome/Edge/Firefox/WebKit each pass31 cases. After narrow mobile correction, `npm run test:e2e -- --grep 'manager cross-portfolio merge'`:5/5 passed,2.7m,all five targets; exited2026-10-15 00:06:50UTC. Final `npm run test:chrome`:36/36,8.9m; exited00:16:12UTC,SP-06 visible case40.3s. With KAY_E2E_PRODUCTION=1, `npm run test:e2e -- --project=chrome --grep 'SP06\|SP05\|SP04\|protected redirect\|restricted change\|auth outage\|@shell'`:24/24,4.6m; exited00:21:02UTC. All zero skipped. Built HTTPS3100 uses isolated API/database,not deployment. Shell variable restored afterward. |
| Database | Verified development OID109060 and test OID109061 on cluster7607060034405909976,17 tables,head0006_ownership_scope_guard. Unrelated development catalog hash unchanged:4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945. Isolated up/down/base/up, populated0004→head backfill and nonempty-history downgrade refusal pass. `alembic check`: no new upgrade operations. |
| Dependencies | No new dependency. `npm audit --omit=dev`:0 vulnerabilities. Explicit-venv `pip check` and both hash-lock `pip_audit --no-deps --disable-pip` commands exit0, no known vulnerabilities. Full `npm audit --json` remains not clean:9 inherited HIGH development-tool entries,GHSA-vfj7-8cjw-p6xm; no unsafe forced downgrade. |

## Corrections and regression boundaries

- The new assignment constraint rejected an old synthetic test that directly
  transferred ownership without clearing enquiry assignment. Corrected that
  fixture's transaction; did not weaken the ownership invariant.
- First focused browser run:2/4 passed; French synthetic author names were
  decoded with Windows' default encoding in private test IPC. Explicit UTF-8
  input fixed it; clean rerun4/4. Production HTTP text was not the cause.
- A populated SP-05 migration probe caught pending deferred-trigger events before
  ALTER NOT NULL. The migration now checks those constraints immediately during
  backfill, then restores deferred behavior. A subsequent literal JSON colon was
  treated as a SQLAlchemy bind; fixed with typed jsonb_build_object expressions.
  Populated backfill now passes with original actor/time/origin and legacy retry
  snapshots preserved. Failed attempts rolled back; development was never reset.
- 0006 is a safe follow-on guard refinement: unrelated identity edits must not
  masquerade as ownership changes after an account is disabled. Actual ownership/
  collaborator and enquiry changes retain authoritative deferred checks. Restore
  also previews/clears invalid assignments, preserving the linked records.
- Function/file review triggers: ownership UI and the common transaction wrapper
  exceed50 lines because they own one cohesive confirmed operation, its transient
  draft/retry and associated state. Backend policy, impact, merge, history,
  contracts and HTTP are separate modules; no source file exceeds500 lines.
- Visual review found that a transfer to an existing collaborator needed an
  explicit after-owner label, even though no new read access was granted. Added
  primary_agent_after to signed backend impact, strict facade and confirmation;
  API/browser assertions and125-test rerun pass. The early cumulative headed run
  was stopped to apply this correction; it is not passing evidence.
- Cumulative headed run35/36 exposed a fast-tap duplicate-reuse race in the earlier
  Lead form. Reuse now has its own disabled loading state and restores submit
  focus only after the selected identity has rendered. A real delayed-response
  regression proves submit stays disabled and no extra enquiry appears. Focused
  E2E plus visible touch review2/2 pass; complete final headed rerun36/36 passes.
- One first lost-response test matched the framework's empty route announcer as
  well as the application alert. Scoped the assertion to the actual error text;
  the workflow passes without removing either live region.
- A final valid135-character unbroken collaborator name exposed page overflow
  at320px (focused Chrome1/1 failed). The removal button now uses existing
  max-width/anywhere-wrap utilities; no token or aesthetic proposal changed.
  Affected manager merge/grant/removal assertions cover320/360px, in-bounds
  controls and >=44px height. Five-target affected-case rerun passes5/5; the
  prior155-case matrix is retained as earlier-source cumulative evidence.
  Final headed36/36 and built24/24 checks also pass after this two-utility correction.
- An additional populated upgrade variant covers a previously disabled SP-05
  assignee. The origin-only backfill temporarily pauses only the named scope
  trigger under its table lock, restores it immediately, and retains the old
  assignment/author rather than inventing a reassignment actor. This extra
  variant initially stopped the full run at109 passed/1 failed because its
  fixture inserted the enquiry and disabled its assignee in one deferred-check
  transaction. The old constraint correctly refused that state before migration.
  Committing creation before the later disable models the historical sequence;
  both active/disabled populated variants now pass2/2 in12.77s. A fresh full
  backend rerun passed126/126,97% coverage; the failed run is not a passing gate.

## UI system and AFTER review

The three required skills and applicability are recorded above. Added shadcn-
derived Radix Tabs; reused Button/Input/NativeSelect/Textarea/Checkbox/AlertDialog,
shared shell/PageHeader/error states/pagination and existing semantic tokens.
No chart, new dependency, palette, font or layout stylesheet. Parent gap/grid,
bounded dialogs and existing control/container sizes govern new layouts.

Main-agent review inspected all14 synthetic SP-06 PNG paths under ignored
frontend/output/playwright: identity desktop; history/assignment desktop+mobile;
transfer preview desktop+mobile and mobile actions; denied old agent; archived
history; restored identity; merge preview; actual200% live viewport; long
unbroken collaborator mobile form. Latest
preview explicitly shows the after-owner and zoom shows actual authored content.
Chrome review exercises menu/tab keyboard/touch,320/360/768/1024/1440 widths,
>=44px controls, cancel/focus, transfer/denial/restore/merge and notes. Actual
Chrome profile zoom DPR2→4,width1427→713,no overflow,2854×1702 capture; preview/
cancel and an attributed note are executed at200%. No CSS zoom or fake viewport.

[AFTER audit006](../../../anti-slop/audit-006-2026-10-14.md):0 HIGH/0 MEDIUM/1 LOW.
The optional repeated-name hierarchy proposal awaits Khalid's selection; no
audit-only fix was applied. Earlier004/005 LOW findings remain untouched.
Real iPhone/Safari, assistive-technology user testing, final branding/font
approval and Khalid's product review remain outside this local technical evidence.

## Security boundary record

C02/C05/C13/C14; BR-04/05/06/23/29. Identity/current session, contact scope,
permissions, private history, migrations, retry, logs and artifacts are applicable.
Inventory, files/permits/antivirus, finance, bulk import/export, external website,
workers, production access and backup/recovery execution are N/A for this slice.

The126-test suite covers current role/session denial, private/copied IDs, former
agent/collaborator denial and retained access, strict author-owned fields,
Origin/CSRF/facade/PUT, immutable history/actor FKs, archive/restore links,
same-S/collaborative and M/A cross-portfolio merges, both versions, identity
limits, phone uniqueness, stale linked impact, actual separate-connection races,
waiting actor revocation, retry/current-scope replay and injected rollback.
Business history has no FK to expiring security audit; no purge is implemented.

Receipts/events contain no credentials. Security audit stores typed metadata,
not note bodies; business notes remain private record data. React escapes text;
strict projections/errors return no private merge target outside current S.
Later contact-linked modules, including inventory owner/developer links, must
extend the same merge path; unknown contact-FK tables fail closed today.

Private config/note/venv/control/captures/reports are ignored and untracked.
Read-only `node scripts/scan-client-secrets.mjs` scans the four actual static
roots without printing the configured secret. Final run:207 JS,zero occurrences.
`powershell -NoProfile -File
scripts/audit-report.ps1` reads the generated HTML ZIP and emits only counts,
refusing nonempty detailed step arrays or an unknown result shape. Final built
report:6 JSON entries,24 result step arrays,zero detailed. Only.last-run.json
remains in test-results: no failure/profile/trace/video artifacts. Git ignore
checks cover both configs,the private note,venv/local data and browser artifacts;
zero private files tracked. Existing untracked project work remains untouched.

After all browser processes stopped,3100/8100/8101 were verified closed. An
exclusive isolated-test lease plus the guarded clear_identity helper removed
only synthetic test state. Read-only counts then showed all15 business/identity/
history tables empty and bootstrap unset on both development/test. Development
was inspected,not cleared. Current17-table schemas/head0006 remain; unrelated
development catalog hash is unchanged. No real/default administrator was seeded.
Development HTTPS3000 was restarted from final source; HTTPS8000 remains ready.

The focused five-target runner emitted the fail-closed lease-stop diagnostic
after its final passed case during Windows process-tree teardown. Playwright
exited0; read-only port inspection confirmed3100/8100/8101 closed before the
next suite. No concurrent database writer ran, and the guard was not weakened
or its loss diagnostic suppressed.

Reference consulted for transaction framing: [SQLAlchemy 2.1 session basics](https://docs.sqlalchemy.org/en/21/orm/session_basics.html).

## Handoff and remaining boundaries

All26 applicable SP-06 task/acceptance/exit items are complete. API/data/model/
architecture/screen/component contracts,QA register,traceability,planning and
repeatable lessons are reconciled with this implementation. Documentation-only
validation passes:1008 local links/anchors(including70 approved skill links),
22 sprints,41 AT mappings,13 synchronized Mermaid pairs and9 valid JSON examples.
It is not an application test.
The three mandatory skills kept existing system geometry and product-surface
exclusions intact; AFTER review did not authorize aesthetic changes.

No required functional defect or skipped check remains in this slice. The full
npm development audit remains not clean (9 HIGH); runtime npm and both Python
lock audits are clear. Product/design approval,LOW audit selection,actual Safari/
iPhone and assistive-technology user testing remain separate. No deployment,
real-data import/export,external messaging or SP-07 implementation was performed.
Later modules must extend this merge service and its registered link strategies;
SP-22 cumulative later-link regression is explicitly pending,not claimed run.
