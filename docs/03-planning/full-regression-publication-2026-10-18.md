# Full regression and PR publication

Owner request,2026-10-18: test the complete current app on a separate branch,
open a PR, and merge to main only if it passes. This supersedes the earlier
no-publication instruction for this task only. The owner subsequently confirmed
that main's automatic Vercel deployment is a demo and may update after tests
pass. No remote database access/migration, real record import/export or real
account change is included.

Candidate branch: `codex/crm-full-regression-2026-10-18`, based on main83c3370.
The working changes from the preceding CRM tasks remain intact. Review all
indexed changes/private-value matches before committing; keep runtime/private
configuration, screenshots, profiles and scratch output out of Git.

## Acceptance before merge

- Complete serial real-PostgreSQL backend suite with real ClamAV, recovery and
  permission/concurrency/retry cases; explicit backend/.venv throughout.
- Full frontend/backend static/unit/dependency/build checks and repository
  document/path/secret/workflow guards.
- Full compiled visible Chrome regression, documented representative Edge/mobile
  profiles, native zoom/touch review and the development-only component case.
  Test fixtures must work from a clean checkout, not only this laptop.
- Separate full-volume benchmark after competing local work, with the existing
  guarded synthetic benchmark dataset and documented four API workers.
- Sanitized report/bundle checks and guarded synthetic cleanup. Preserve real
  development data, current credentials and unrelated occupied port8000.
- Push feature branch, create/attach PR, run automatic CI and manual synthetic
  database/browser integration on its exact candidate SHA. Require genuine
  successful aggregate checks; no protection bypass or direct main push.

Root AGENTS, publication policy, harness/local final acceptance, current domain
contracts and QA/security registers govern execution. Antislop AFTER remains;
this is a functional regression task, not permission for optional design changes.
Physical devices, human visual approval and production certification remain
separate from passing automated/local acceptance.

## Initial findings

The full backend check found one Ruff-format difference in identity/sessions.py;
only the formatter's mechanical change was applied. Full database tests are
running with the existing shared exclusive lease after stopping the exact KAY
preview supervisor, not an unrelated listener.

The new Projects test read its photo bytes from ignored output, so hosted/fresh
checkouts could not run it. Exact unchanged generated fixture copies are now
versioned under frontend/tests/fixtures/projects-reference, outside public/runtime
assets; the provenance manifest is updated. Raw Playwright CLI/scratch captures
remain ignored, not deleted or published. No file-transfer limit is relaxed.

Actual commands, failures, fixes, results and PR/merge evidence follow below.

## Static/unit/publication preflight

- `backend/scripts/kay.ps1 -Task check`: Ruff passes,327 files formatted,
  mypy186 application files pass after the one formatter correction.
- Explicit venv `-m pip check` and `-m pip_audit -r requirements.lock
  --require-hashes --disable-pip`: pass/no known locked-runtime vulnerabilities.
- Explicit venv `-m tests.unit_runner`:218 passed/602 deliberately deselected,
  with database connections forbidden by the reviewed unit mode.
- Frontend lint, `npm.cmd run typecheck`, production `npm.cmd run build` and
  `npm.cmd run test:unit`: pass;66 units; icon45/49 consumers/171 sites and
  button319/103 files guards have0 violations. Live dev was stopped before
  building into.next; no running build was overwritten.
- Frontend `security:check`:0 runtime/9 inherited dev-only vulnerabilities,
  one existing approved advisory exception expiring2026-11-15. Not a clean full
  dependency audit. The16 dependency/required-aggregate policy tests pass.
- Client bundle scan:4 roots/582 JS/0 configured facade/signing-secret matches.
- Index guard:8401 files/0 forbidden or oversized/14 ignore probes. Private
  in-memory comparison:7 runtime values/8401 indexed blobs/0 matching files;
  values are never printed. Staged redacted Gitleaks finds no leaks.
- Actionlint and repository-only sprint validator pass:22 specifications,
  1194 local links/41 acceptance mappings/13 Mermaid/12 API examples.
- Source review found two obsolete native-review count strings; locators now
  expect the current exact0 demande/0 affaire labels, without weakening layout,
  keyboard, actual zoom, permission or command assertions. Execution follows.
- Git whitespace checks preserve upstream font-license bytes via narrow
  gitattributes exemptions rather than editing license text; two new Markdown
  metadata hard breaks were replaced with blank lines. Staged diff check passes.
- Main protection read-back requires PR/up-to-date CI required/admin enforcement/
  linear history and denies force push. No protection setting was changed.

Browser discovery finds163 variants in41 files; this is not yet an execution
result. Full database regression is still running, then browser writers take
the same exclusive lease. No PR or main promotion is claimed at this checkpoint.

## Full database result

From backend/, `.venv/Scripts/python.exe -m pytest -q --tb=short --maxfail=3
--cov=app --cov-report=term:skip-covered` passes820/820 in1091.79s (18m11s),
94% application coverage. No failure/skip workaround. Real isolated PostgreSQL,
pinned healthy ClamAV and native recovery tools remain in use. Browser writers
start only after this process releases the shared lease.

Full-history redacted Gitleaks also passes:25 commits/130.73MB scanned/no leaks.

GitHub deployment metadata shows main has Vercel Production deployments. The
owner has been asked whether this is a demo or whether merge must wait for a
production migration plan for0023–0026. No production DB was accessed or migrated;
synthetic integration results alone do not authorize touching production data.

## First compiled matrix findings

The first163-case attempt stops at3 passed/3 failed/157 not run (2.0m), not a
complete browser pass. Two account-footer capture waits used an accessibility
role locator for the background Lead count while the navigation Sheet was open.
Radix correctly aria-hides that background. Only the settled-background guard
now includes hidden roles; account role, drawer focus, logout/revocation,
overflow and44px target checks remain unchanged.

The third failure expects16px for every action icon, but the current approved
compact Lead/Deal table pattern explicitly uses12px .crm-sort-heading SVGs.
Design-system-ops comparison with the existing consumer/CSS preserves that
local geometry rather than restyling the app to satisfy an older global test.
The assertion now requires exactly12px for that class,16px everywhere else,
and checks both height/width;44px action targets remain mandatory. No UI source,
color, typography or unselected AFTER-only finding changed. Focused confirmation
and a complete matrix rerun follow; failed tests are not counted as passes.

Focused compiled Chrome confirmation of account-footer.spec.ts and
action-buttons.spec.ts passes5/5 in2.2m, including the actual cross-page action
journey (1.2m). The full163-case matrix is restarted. Responsive-design guidance
applies to the existing width/overflow/touch/zoom checks; project typography and
layout remain unchanged. The old native-review filter helper is also aligned
with the current mobile Sheet for full-page Leads/Deals (not the superseded
inline-only implementation); exact search/apply/reopen/Escape/focus checks remain.

## Second matrix findings and repairs

The next matrix reaches the recovery/requirements families but stops at three
failures; it is not a complete pass. Real pagination exposed a pending350ms
filter effect resetting page2 on initial load or just after explicit Apply.
`use-directory-filters.ts` now skips unchanged applied drafts and cancels a
pending effect when Apply commits them. Four actual-module modeled lifecycle
unit cases reproduce both races (2 fail before the fix) and preserve genuine
debounce/page reset plus invalid-date/incomplete-country behavior (4 pass after).
All70 frontend units pass; this is not a replacement for real browser checks.

The other two failures were old dashboard scope wording and a pre-Riviera
selection border expectation. Recovery now verifies the current exact agent
label and the actual API's assigned_or_shared scope. The selected-search test
retains pressed-state, unique selection, completed icon, accent background and
exact current control-border checks. No app color/layout was changed.

Lint initially rejected the new unit harness's lowercase render name; the
modeled hook harness is now explicitly named Harness. Lint, typecheck and the
normal production build pass after that correction. Native auth evidence now
clears both input values before its invalid-feedback screenshot. No password,
cookie, token or private credential is captured.

The first focused browser attempt with clock control before hydration times out
on the initial Lead count. Clock installation is moved after actual data and
rows settle; that test failure is retained, not reported as an app regression.
The corrected recovery journey passes53.0s with real restore, revoked old cookie/
permit, current scope and private document download (RPO6.25s, restore6.38s).
The complete corrected-build matrix and remaining gates still follow.

The second focused pagination attempt reaches the desktop automatic filter rail,
where no Apply button exists. Its new explicit-Apply check now uses the real
mobile Sheet. A subsequent pauseAt(new Date()) attempt exposes a test-clock IPC
race (past time), not an app failure; clock control now runs elapsed time without
pausing. The complete paging/column/filter case passes16.5s (30.7s including
owned-stack startup), including desktop page2 and mobile Apply/page2. The actual
independent-search browser journey passes31.3s. All70 frontend units and client
bundle scanning (582 JS/0 configured secrets) pass again. The corrected full163
matrix has started; these focused passes do not stand in for its pending result.

## Current matrix startup diagnostics

The corrected matrix passes the paging case again (12.2s), the actual restored
stack (RPO8.05s/restore8.38s/33.50s incident-to-verified, no unexpected errors)
and the independent-search journey (30.6s). Fresh Projects desktop/mobile images
were opened: eight readable photo cards, desktop four-column/mobile one-column,
reachable controls and no horizontal overflow. This is technical inspection,
not the owner's product/design approval.

Two different cases in this matrix fail during isolated process startup: auth
outage restart returns a supervisor500; intake's simulator poll receives no
response within10s. Later API restart/outage cases pass. Neither failure is
discarded or yet attributed to a product defect or timeout budget.

The test-only supervisor now distinguishes a replaced/exited API child from a
readiness deadline, using only three fixed error codes. A token-protected
simulator-status command exposes only running/exit/known failure/elapsed time;
stderr is inspected only for the fixed SIMULATOR_START_FAILED marker, never
printed. Intake diagnostics preserve the original failure even with an older
running supervisor. No startup deadline, TLS verification, lease, auth boundary
or business assertion is relaxed. These diagnostics take effect on the next
owned-stack launch; focused repetition and full hosted integration still follow.

Supplemental Iconsax review had an old43-icon constant. Source, manifest and
inventory all contain45 (including the added car/clock glyphs); the constant is
corrected while exact export/manifest equality and every glyph's SSR, geometry,
paint, offline and accessibility assertions remain intact. Its three real
browser cases still require execution.

The corrected full matrix stops at95 passed/3 failed/65 not run (35.1m).
The third failure is an old shell empty-inventory label: the actual directory's
status now reads exactly “0 bien correspondant”. The assertion is aligned with
that current status; navigation/role, request-failure and console checks remain.
Nine focused cases (the three failed journeys repeated three times) now run on
the newly launched diagnostic supervisor, without changing startup deadlines.
The remaining Chrome cases and57 Edge/mobile variants still require completion.

The three focused journeys each pass three repetitions:9/9 in3.5m. Auth outage
runs22.2/17.8/17.7s, signed intake33.3/30.4/31.4s, corrected shell11.8/12.8/12.5s.
The two original startup failures were not reproduced; their cause remains
unconfirmed, not declared fixed by diagnostics or a longer timeout. Preserve this
local intermittent-start risk and require the exact-head hosted full regression.

Discovery also found a coverage gap: renamed staff-onboarding and qualified
conversion titles no longer matched the old cumulative regular expression.
Both selectors now match the actual current journeys. The actual selection is
169 variants:112 Chrome plus19 each Edge/mobile Chromium/mobile WebKit. The old
163 selection contained only17 core journeys per extra profile. A new unit
checks real Playwright discovery only (no fixtures/browser launched), including
both journeys in all four profiles and19 cases per representative profile.
Its focused execution passes; full frontend units now need the updated71 count.
The remaining14 Chrome cases and all57 representative variants run next.

The remaining Chrome batch finishes13 passed/1 failed in5.0m. All five staff
and five work/task/reminder cases pass, along with sidebar collapse, navigation
Sheet focus and unknown-route recovery. The remaining shell failure assumes the
main heading stays exposed after opening calendar rules. Rules are now a Radix
Sheet, so hiding background accessibility is correct. The test now targets the
toolbar rules trigger explicitly, checks drawer overflow/policy, closes it with
Escape, verifies focus return, then checks the main heading/navigation at every
width. No app accessibility/layout change is made. Focused confirmation is
combined with the three supplemental Iconsax browser cases.

The complete frontend unit command passes71/71, including discovery coverage.

Responsive shell confirmation passes14.9s across320/360/768/1024/1440px, preserving
policy/drawer overflow, Escape/focus return and main navigation assertions.
All112 distinct Chrome app cases now have passes through the full run and
affected reruns; this is not a claim that the initial matrix was green.

Supplemental icon testing first exposes two metadata/style expectation failures
(1 passed/2 failed/1 not run in42.2s including the shell case). The car manifest
already documents combining six simple subpaths: its8 original paths render as3.
The pinned archive's SHA512 integrity and car SVG SHA256 are checked; every
rendered coordinate equals the two first original paths plus the six combined
subpaths after whitespace normalization. Record original pathCount8 and explicit
renderedPathCount3; retain the original hash/indices. No app SVG is modified.
Login rounded-lg resolves to the current12px panel token, not the old10px value.
The corrected Iconsax browser suite passes3/3 in29.8s, including every verified
glyph offline, pre-hydration/no-JS/authenticated rendering and actual200% zoom.
All57 representative Edge/mobile variants are now running with restored19-case
selection per profile. Remaining native final/dev-only/load/hosted gates follow.

The representative run passes all19 Edge journeys, then stops on mobile
Chromium:22 passed/3 failed/32 not run (13.3m). Auth logout expected a visible
desktop footer without opening mobile navigation. Discovery attempted a desktop
Lead search field without opening the mobile filter Sheet. Both tests now use
the actual responsive controls; all cookie/CSRF/replay, export-content, scoped
count and denial assertions remain. The same filter helper updates signed intake,
including explicit mobile Apply/close and an awaited responsive-panel readiness.

The timed-out discovery cleanup closed its browser before reaching actor removal.
A read-only isolated check finds3 users/2 contacts/2 phones left over; this is
consistent with the following file-case phone-creation failure, not proof of a
new app creation defect. Nested finally blocks now ensure owned synthetic actor/
intake cleanup still runs if browser cleanup throws; no real/development reset
or security retention CLI is used. Both mobile profiles restart on the normal
guard-cleared isolated target. Corrected mobile auth and discovery already pass;
the complete38-case mobile rerun is still in progress.

The owner has now explicitly confirmed that main's Vercel Production deployment
is a demo and authorized merging after tests pass. This resolves the merge hold;
it does not authorize remote database access/migration. All genuine local and
exact-head automatic/manual GitHub gates remain required before main promotion.

The next38-case mobile run stops at25 passed/3 failed/10 not run (13.5m).
The international Lead case still used a desktop-only filter; it now uses the
same responsive helper. WebKit exposed a hydration race in that helper's
either-visible panel detection: the helper now follows the application's exact
80rem media query and awaits the matching trigger/panel before interaction.
WebKit import navigation also timed out once. Safe diagnostics expose only
pathname, numeric geometry, readiness and dialog/heading counts, never fields or
credentials; its cause remains unconfirmed, not asserted fixed. Discovery,
imports, signed intake and international Leads then pass8/8 across both mobile
engines in4.2m. All19 distinct mobile Chromium journeys now have passing results;
WebKit's remaining eight journeys run next. No retries/timeouts are relaxed.

The last eight WebKit cases finish7 passed/1 failed in6.0m: the notification-read
confirmation is missing once. The focused test now additionally requires the
actual read-command response to be200, within the original5s interaction window,
before checking the unchanged UI confirmation/read filters/task completion.
Three repetitions pass in1.8m (32.3/27.2/28.2s); the original cause is unconfirmed,
not declared repaired. All169 distinct matrix variants now have passing results
through complete batches and affected reruns, not one initially green matrix.
Fresh lint and typecheck also pass. Native visible Chrome review follows.

Native final review first finishes3 passed/1 failed in3.3m: the200% zoom test's
unscoped exact0 demande locator matches both the summary and live results count.
It now targets the role=status results count, preserving exact text, keyboard,
geometry and zoom assertions. Visual inspection also catches a calendar capture
taken during “Résolution de la semaine…”; capture readiness now excludes this
loading state as well as Chargement/Vérification. The two affected native cases
pass in1.6m (46.6/35.8s); all four distinct native final cases now have passes.
The real browser measurement is devicePixelRatio2→4 and innerWidth1427→713,
with no horizontal overflow. Fresh completed calendar and200% Lead-filter
captures are visually opened, along with synthetic mobile Lead history and
Projects desktop/mobile captures. No optional aesthetic change is made.

Native recovery verifies restored records/private document/finance, revoked old
cookies/permits and current scope, with53.307s incident-to-verification,
12.040s restore and13.548s RPO in this synthetic drill. This does not certify a
real-data backup policy. The separate development-only live shadcn/RHF/Zod/table
loading/empty/invalid/recovery case passes1/1 in48.6s.

The guarded benchmark identity is rechecked separately:100 users/200000 contacts/
20000 properties at0022. Only this synthetic benchmark target is additively
upgraded to0026; counts remain unchanged. No dataset reseed/reset is used.
All18 role-scoped EXPLAIN ANALYZE probes complete before the full-volume run.

The first load run fails before measurement:90/100 accounts ready,0s steady.
Safe role/status-only login counters are added without retries or longer limits.
The second reaches100/100 (all HTTP200),61.210s and4128 completed requests, but
fails:849 enquiry-response contract mismatches and ordinary p95max1745.181ms/
dashboard2746.769ms. These failures are retained, not discarded as warm-up.

A separate read-only probe proves the existing benchmark is the preserved legacy
distribution:200000 new enquiries,0 converted, with2222/2223 per agent. The newer
generator's180000/2000 expected counts assume20000 qualified conversions; additive
migrations intentionally do not rewrite legacy records. Benchmark assertions now
validate independently counted SQL against exactly one of these two approved
fixed distributions, refusing unknown/partial counts; no data is reseeded or
converted to make the assertion pass. Sixteen pure positive/negative cases cover
both distributions and invalid inputs, included in the reviewed no-DB unit mode.

The new Lead status aggregation also duplicated its complete filtered scan for
the total. The total now sums that same unpaginated grouped result, preserving
repeatable-read scope, all filters and status distribution while avoiding one
redundant query. Focused real-PostgreSQL counts/contact/conversion/benchmark and
unit-selection checks pass67/67 in60.64s; Ruff/format pass. A fresh full-volume
run follows with unchanged100 users,4 workers,60s and p95 limits.

The third run fails setup97/100:3 agent logins return503; all other logins200.
The harness previously let early users start ordinary traffic before remaining
logins, contrary to the documented establish-sessions→15s warm-up→measure phases.
A shared100-session barrier now precedes ordinary traffic; there is no login
retry, timeout increase or ignored setup failure. The fourth run establishes all
100 sessions with HTTP200 and measures62.553s:3924 started/completed requests,
zero failures on all six routes, but **performance still fails**. Ordinary p95:
detail1728.043ms, contacts1662.543ms, enquiries2117.471ms, notes1943.915ms,
properties1720.101ms; dashboard3340.722ms. Limits remain1000/2000ms.

Final read-only bottleneck checks find AC power/Balanced,16 logical processors,
about5100MiB available memory and0 page-ins/sec at inspection. Five-call direct
directory profiles are predominantly database waits, not phone projection CPU:
administrator contacts0.631s/enquiries0.938s and agent contacts0.295s/enquiries
0.614s. This identifies a SQL/load follow-up area, not a proven complete root
cause or permission to change pools/timeouts/architecture. No device setting is
changed. Stop speculative tuning here: the load gate remains a **merge blocker**.
The feature PR may publish the tested work and disclose this failure; it must
not merge merely because functional/hosted CI passes. No main promotion claimed.

## Final local checkpoint

- Backend final Ruff/format328 files and mypy186 application files pass;
  reviewed no-DB units234 passed/602 deliberately deselected in3.94s. The16 new
  pure benchmark cases raise full discovery to836; hosted full regression still
  needs execution on the candidate. The earlier820 full/67 affected counts are
  overlapping evidence, not summed into a fictitious total.
- Final frontend lint/typecheck and71 units pass; production build was already
  completed after the only functional UI hook repair. The final dev-only case
  uses its separate development build; no running.next was replaced.
- Final browser bundle scan:4 roots/586 JS/0 configured facade-secret or signing-
  key matches. Sanitized latest HTML report:2 JSON entries/1 step array/
  0 detailed step arrays. No credential-bearing report or capture is published.
- Skill applicability: antislop core/owner AFTER preserved, no audit-only design
  fixes; design-system-ops/responsive standards preserve existing tokens and
  geometry; React guidance informs the dependency/timer repair; Playwright uses
  the actual serial isolated stack and native zoom. Design-taste-frontend is
  assessed out of scope for this dense CRM functional repair, not restyling.
- Repository/index/private-value/secret/workflow/document publication checks
  follow on the final staged candidate. Feature publication remains authorized;
  main merge remains blocked by the disclosed full-volume latency failure.

Final staged publication checks pass:8404 indexed files,0 forbidden/oversized,
14 ignore probes;7 known private values checked in memory against8404 blobs,
0 matches; whitespace, actionlint,16 policy/aggregate tests and repository-only
documentation validation pass (1195 links/22 sprints/41 acceptance mappings/
13 Mermaid pairs/12 JSON examples). Staged/full-history Gitleaks find no leaks.
Parallel invocations briefly collide while extracting their shared tool cache;
both scans are rerun serially rather than treating that noisy invocation as the
final tool-installation evidence. No application/source result changes.

## Owner-directed load-performance repair

After reviewing the load failure, Khalid explicitly chooses “Keep it draft and
fix load performance before merging.” No demo load exception is granted.
The published baselinebc686c1 passes actual automatic `CI required` (both push
and PR runs), Vercel preview build, and hosted full backend job; its manual browser
job is still running. New performance edits require a new exact-head gate.

Read-only parameter-free SQL profiles identify repeated authorized contact/stock
sets across dashboard metrics and an unnecessary default Lead outer contact join.
The proposed repair reuses agent contact/stock sets as query-local materialized
CTEs and combines exact per-metric aggregates into one SQL statement inside the
existing read-only repeatable-read request. Agency metrics retain their original
unmaterialized scope; no cross-request cache, new table/index, timeout, pool or
authorization change. Dashboard and drill-down use one shared response projection;
series ordering and exact decimal collections remain. Lead name sort retains its
necessary contact join; other sorts use the same authorized contact-ID subquery.

The first combined-query probe exposes PostgreSQL's unknown-NULL union type
resolution; numeric placeholders are explicitly SQL-cast rather than relying on
driver bind hints. Agency and agent probes then succeed. Sampled agent dashboard
SQL is139.485ms/one metric statement (98.844ms EXPLAIN), agency384.808ms; these
low-load probes are not a full-volume pass. Three new PostgreSQL role cases
require exactly one metric query after current-identity validation and complete
populated/private dashboard-to-drill parity. All reporting/count/contact focused
tests pass49/49 in61.80s, including decimal correction and concurrent transfer.
Ruff/format/mypy pass. A fresh unchanged100-user benchmark follows after pausing
only the exact restored preview process trees; port8000 remains untouched.

The first repaired full-volume run **passes**:100 sessions/all logins200,
4 API processes, minimum100 steady users,60.323s,6964 started/completed requests,
0 failures. Exact p95ms: detail157.685, contacts245.007, enquiries370.982,
notes189.430, properties199.253, dashboard673.635. Every route has≥708 samples;
limits remain1000ms ordinary/2000ms dashboard. No target, rate, think time,
duration, pool, timeout or authorization reduction. The prior load failures
remain above. A second independent full-volume run verifies repeatability before
final candidate publication and complete exact-head regression.

The next repeat fails before measurement:97 responses/ready users (all observed
responses200), no measured traffic. This is not silently counted as another
latency pass. Setup phase/user-error-type counters are added; startup exceptions
retain only their class, stop that synthetic user without credential-bearing
tracebacks, and still fail the full100-user gate. Unexpected user errors now also
explicitly fail the result. No retries, deadline increases or reduced targets.
The following run passes100 assigned/requested/responded/ready,0 error types,
60.208s,6575 started/completed/0 failures. P95ms: detail255.590, contacts379.716,
enquiries549.801, notes302.876, properties313.336, dashboard869.072.

The baseline manual workflow finishes with backend836/836 passed737.60s, but
browser75 passed/1 failed/39 not run in17.8m. The failure is a missing renamed
programme label after agent save, not a permission-denial result. Its test now
also requires the actual PATCH200 and persisted name/briefing, without increasing
timeouts. Both Projects permission journeys pass three repetitions:6/6 in2.9m;
the failed journey19.3/20.5/18.1s. Original hosted cause remains unconfirmed; a
complete clean exact-head hosted browser run remains mandatory before merge.

The final guarded load confirmation passes:100 assigned/requested/responded/
ready, all login200, no unexpected user errors,4 workers, minimum100 steady
users,60.244s,7026 started/completed requests,0 failures. P95ms: detail141.896,
contacts232.695, enquiries322.455, notes157.212, properties189.665,
dashboard574.745. All six routes pass unchanged sample/latency limits.
The original setup/latency failures stay retained; no production/network-global
setting is changed or unique cause invented for the intermittent missing setup
responses. Complete local839-case regression now runs serially with real ClamAV;
final browser/hosted checks follow on the new source. Live PR results avoid an
evidence-only commit invalidating an already tested candidate SHA.
