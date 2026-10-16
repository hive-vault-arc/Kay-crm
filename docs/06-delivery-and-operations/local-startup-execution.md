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
