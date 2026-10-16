# Local startup verification

2026-10-16. Scope: repair and verify local launchers, provide manual commands,
then stop KAY-owned services. This is not deployment or whole-product acceptance.
[Manual commands and prerequisites](local-startup.md).

## Changes

- Development frontend now uses Node's stable HTTPS server and the installed
  Next programmatic API, including its real HMR upgrade handler. The launcher
  supplies the existing local CA at child-process startup and propagates shutdown
  through IPC. It no longer invokes Next's experimental HTTPS CLI switch.
- Launchers remove FORCE_COLOR only when NO_COLOR is already set; they do not
  globally suppress framework warnings. Compiled startup explicitly selects
  production mode and rejects unknown port arguments.
- Windows API and simulator launchers select a local SelectorEventLoop factory
  through pinned Uvicorn's supported custom-loop hook. No deprecated global loop
  policy or exception/log filter was added. Other platforms retain auto selection.
- The simulator's fixed static-asset proxy accepts the percent-decoded `@` in a
  real Next scoped-helper chunk filename. Tests retain traversal, host, punctuation
  and staff-API rejection. This is not a general proxy or WebSocket endpoint.
- Browser integration now asserts secure development HMR frames. Website test
  readiness has bounded navigation/enabled-form assertions before filling fields.
  README entry points link the manual runbook.

There are no new migrations, API contracts, permissions, domain rules, seeded
accounts or dependencies. Four backend Python source files changed for runtime
selection/static compatibility; prior Iconsax backend-preservation evidence
predates these explicitly requested startup repairs.

## Actual checks

Frontend commands run in `frontend/`; Python commands run in `backend/` with
the explicit project venv. Checks were serial against the guarded test database,
not concurrent writers against development.

| Check | Result |
|---|---|
| `npm run lint` | Exit0, ESLint zero warnings; icon inventory27 exports/21 consumers/40 sites/zero violations |
| `npm run typecheck` | Exit0 |
| `npm run build` | Exit0; final build `AVrHScmNlfMZXMtz3FMFU` |
| `.venv/Scripts/python.exe -m ruff check app/runtime.py app/cli/serve.py app/cli/website_simulator.py app/intake/simulator.py tests/test_serve.py tests/test_simulator_assets.py` | Pass |
| Same six paths with `ruff format --check` | Pass after formatting the new test |
| `.venv/Scripts/python.exe -m mypy app/runtime.py app/cli/serve.py app/cli/website_simulator.py app/intake/simulator.py` | Pass |
| `.venv/Scripts/python.exe -m pytest tests/test_serve.py tests/test_simulator_assets.py -q --tb=short` |11/11 passed,1.73s |
| `node scripts/scan-client-secrets.mjs` |4 roots/351 browser JS files/zero configured facade or signing-key occurrences |

### Exact manual launch checks

Both ordinary `npm run dev` and final `npm.cmd run start` were launched on3000,
with the actual development backend on8000 using the project venv. Neither
manual startup produced terminal warnings or errors. The final compiled check
used `.venv/Scripts/python.exe -m app.cli.serve`, the command in the runbook.

CA-verified HTTPS probes returned200 for direct API liveness, frontend login and
frontend-facade readiness. Direct API readiness returned the expected403; its
facade guard was not weakened. Thirty intentionally interrupted TLS connections
produced no Windows Proactor10054 traceback after the loop change. Read-only
worker status returned no queued/undispatched jobs without a warning. This is
focused startup/disconnect evidence, not a load or long-duration soak test.

### Headed, isolated Chrome checks

Installed Chrome155.0.8059.79, Playwright1.64.1. The existing `test:chrome` runner
opens disposable headed contexts with synthetic fixtures. Its test-only TLS
exception does not disable server-side certificate verification or change the
user's browser trust. Prior environment values were restored after each run.

The first development selection was:

```text
npm run test:chrome -- tests/e2e/shell.spec.ts tests/e2e/integration.spec.ts tests/review/iconsax.chrome.spec.ts tests/e2e/files.spec.ts tests/review/intake.chrome.spec.ts --grep '@shell|SP02|Iconsax:|SP09 AT-06/26/35|SP20 visible Chrome' --max-failures=1
```

It passed seven cases: four shell cases, two Iconsax SSR/offline cases and the
protected-file scan/download case. The signed simulator case timed out. The
`SP02` grep did not match the hyphenated integration title; that case was run
explicitly afterward, not counted as passing in this first selection.

Repeated explicit development integration checks passed the real facade
stop/restart/retry flow and received secure HMR frames. The separate simulator
remained unhydrated. Investigation found and repaired the scoped-helper static
filename404, but development WebSocket errors and a disabled form persisted.
An attempted direct-development asset/HMR configuration did not fix it and was
fully removed, including its temporary origin/CORS configuration. Test diagnostic
logging was removed; the bounded readiness assertion remains. No failed simulator
development run is reported as passing.

Final compiled selection, with `KAY_E2E_PRODUCTION=1`:

```text
npm run test:chrome -- tests/e2e/integration.spec.ts tests/review/intake.chrome.spec.ts --max-failures=1
```

Final saved HTML report:2 expected/0 unexpected/0 flaky/0 skipped, and
`test-results/.last-run.json` status `passed`. Integration12.742s; signed intake
42.007s. The latter verifies real signed submission, scoped Leads, native states,
touch, keyboard and zoom. In total nine unique selected cases passed across the
supported development/compiled runs; this is not one clean nine-case invocation,
a full backend suite, a fresh five-browser matrix or an all-routes acceptance run.

## Remaining limitations and user-controlled steps

- Use compiled frontend mode for the separate signed website simulator. Normal
  CRM development/HMR is verified, but that simulator's restricted proxy does not
  reliably hydrate Next's development runtime. No staff/API/WS proxy expansion
  was introduced to hide this limitation.
- An ordinary isolated Chrome navigation reported `ERR_CERT_AUTHORITY_INVALID`:
  the valid local CA is not in Windows trust. No root-store change was made while
  approval was pending. The runbook gives the explicit optional CurrentUser trust
  command; warning-free ordinary Chrome cannot be claimed before that choice.
- Development has no administrator account. Bootstrap remains an interactive,
  user-run one-time step, not a seeded password or automatic credential change.
- No fresh full-suite, load, recovery, actual-device or production certification.

## Cleanup

After the final browser writer exited, the exclusive test lease verified database
`kayrealestate_test` OID109061 and the dedicated private test storage path. Cleanup
found zero residual record rows and removed three synthetic orphan objects.
All66 test record tables remain empty, bootstrap unset, default policy retained.
This synthetic cleanup is not a real-data retention operation.

A separate read-only probe verified development `kayrealestate` OID109060:
66 record tables/zero rows/bootstrap unset, policy1/car capacity2/no editor and
zero working/lunch windows. Both database identities resolve to the established
shared cluster; no development reset/bootstrap was performed.

Manual/test frontend and API processes exited. The task-created Chrome privacy
error tab was closed. The KAY ClamAV container was stopped without removing its
volume/signature cache. Final project-listener/process checks are recorded below;
the shared PostgreSQL service on5432 is intentionally preserved for other projects.

Final read-only inventory: zero project-owned Python/Node/cmd/PowerShell processes
and zero listeners on3000,3100,8000,8001,8100,8101,8102,8200,3310. Shared5432
still listens on its two address families. ClamAV is exited143 after the requested
stop, with no published ports; this is termination status, not a failed startup.
The saved Playwright report privacy audit found3 JSON entries/2 step arrays/zero
input-bearing detailed step arrays. Generated reports remain local artifacts.

## Direct Uvicorn and approved CurrentUser trust

2026-10-16, subsequent user-reported repair. The reported command was the standard
`uvicorn app.main:app --reload`, not the earlier KAY launcher. It failed because
main.py exported only `create_app`. The frontend screenshot separately showed
`ERR_CERT_AUTHORITY_INVALID` despite a successfully listening development server.

Changes are local on `fix/direct-uvicorn-local-startup`; no new push, PR, main
update or deployment was performed by this repair. main.py now exports
`app = create_app()` after its handler definitions. Connections remain lifespan-
owned; existing factory callers and authorization/middleware are unchanged.
Two regression cases check a real FastAPI Uvicorn target, no import-time database,
no implicit-factory warning and the retained factory's equivalent routes/middleware.
No frontend UI/dependency/backend business/schema change was required.

Khalid explicitly approved this existing checkout's CA in Windows CurrentUser.
The known localhost leaf first verifies against the exact local CA; a fresh
CurrentUser store read finds that authority and Windows' default trust chain
validates the leaf. The certificate provider initially returned stale presence
information after import; the fresh store/default-chain checks resolve it.
Only this public CA was imported, not a private key or machine-wide root change.
Neither browser nor server certificate validation was disabled.

Actual verification:

- The exact direct-venv Uvicorn command with `--reload` starts successfully at
  HTTP127.0.0.1:8000, completes ASGI startup and returns200 public liveness.
- The connected CRM uses Uvicorn's standard `--ssl-keyfile`, `--ssl-certfile`,
  `--loop app.runtime:create_server_loop` and `--no-access-log` options, as copied
  in the runbook. HTTPS8000 liveness200 and dev3000 facade database readiness200
  pass with normal Windows validation; direct readiness without authority is403.
- A real Python source edit triggers StatReload, graceful lifespan shutdown,
  a new server child and completed startup; post-reload facade readiness200.
  Uvicorn's normal file-change/reload notice is not an application failure.
- `npm.cmd run dev` uses the existing3000 HTTPS launcher. Ordinary isolated
  visible Chrome and the in-app browser reach `/login` with enabled email/password
  controls and submit button, not a certificate-error page. No staff credentials
  were entered in these ordinary development-profile checks.
- Focused backend initial14/14 passed9.94s. After strengthening route/middleware
  assertions, the final serial14/14 passes9.38s. Ruff check/format passes2 files;
  strict mypy passes177 application modules.
- Headed native integration first passes1/1 in33.1s with test-shell conflicting
  NO_COLOR/FORCE_COLOR warnings. The final rerun removes only NO_COLOR within
  that shell, restores it afterward and passes1/1 in28.7s without those warnings.
  The test exercises real authenticated synthetic facade readiness, secure HMR,
  API stop/restart, retry and responsive widths. Tests use isolated3100/8100,
  separate from the direct manual8000/dev3000 smoke.
- An accidental concurrent pytest attempt refuses `ISOLATED_TEST_RUN_ALREADY_ACTIVE`
  before fixture writes; it is retained as a rejected attempt, not a pass or a
  relaxed lease. The final backend run starts only after browser supervision exits.
- Frontend full lint, route typecheck/TypeScript and production build all exit0.
  The manual dev server is stopped before the build touches its `.next` directory.
  Icon guard remains27 semantic/21 consumers/40 sites/zero violations.

No fresh full508+ backend/79-browser, five-browser, recovery/load or production
certification is claimed for this narrow repair. Existing compiled-mode guidance
for the separate signed website simulator still applies. No administrator was
seeded, account changed or development data reset. Private runtime values, keys,
tokens and contact records were not copied into this record.

Final post-build manual dev restart: login200, facade real readiness200 and direct
Uvicorn HTTPS liveness200 with default Windows certificate verification. Visible
Chrome reload again shows the enabled login. The earlier in-app navigation had
also succeeded without a certificate bypass; after stopping the server for the
build, that tab retained a connection-refused data-URL error page which the host
browser tool would not navigate. No browser URL-policy/security bypass was used;
close/reopen an old error tab after starting the servers if it remains cached.

A final read-only isolated lease/ORM probe confirms0 users/contacts/staff sessions
after fixture teardown; no extra cleanup write was performed. Manual Uvicorn
shuts down its lifespan/reloader, npm dev exits after Ctrl+C/Y. All ten project
ports above and project service processes are0. Shared PostgreSQL5432 and Codex's
browser-helper processes are intentionally preserved. No service is left to
occupy the user's manual3000/8000 startup ports.
