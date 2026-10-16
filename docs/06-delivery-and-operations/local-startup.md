# Local startup and shutdown

2026-10-16. Existing installed checkout; no reinstall, database reset, migration
or seeded login is required by these runtime repairs. Use the project's Python
venv, not global Python. Docker Desktop and the shared PostgreSQL18 service must
be running. This is local operation, not deployment.

## Start the backend and antivirus

In PowerShell terminal1:

```powershell
Set-Location -LiteralPath 'C:\Users\khali\Desktop\HVA\03 - PROJECTS\CUSTOM PROJECTS\Kayrealestate\backend'
docker compose -f compose.clamav.yaml up -d --wait
.\.venv\Scripts\python.exe -m app.cli.serve
```

API origin:`https://localhost:8000`. Public liveness is
`https://localhost:8000/api/v1/health/live`. The direct readiness endpoint is
facade-protected and deliberately returns403 without server authority; check
`https://localhost:3000/api/v1/health/ready` through the frontend instead.
Do not disable facade authorization to make a direct health probe return200.

## Start the frontend

In PowerShell terminal2:

```powershell
Set-Location -LiteralPath 'C:\Users\khali\Desktop\HVA\03 - PROJECTS\CUSTOM PROJECTS\Kayrealestate\frontend'
npm.cmd run build
npm.cmd run start
```

Open **https://localhost:3000**. This compiled local mode is the recommended
manual workflow, including the separate signed website simulator. It is not
a deployment.

For coding with hot reload, stop start and run `npm.cmd run dev` instead.
Normal CRM development and secure HMR are verified. The separate signed simulator
does not reliably hydrate Next's development runtime through its restricted
proxy; use compiled mode for that workflow. This remains an explicit development
limitation, not a passing test or a reason to widen the staff/API proxy.

Development uses Node's stable HTTPS server
with Next's real WebSocket/HMR handler; it no longer uses Next's experimental
HTTPS CLI switch. The local CA is supplied to the Node child at process start.
Only the contradictory FORCE_COLOR variable is removed when NO_COLOR is set;
application/framework warnings are not globally muted. `-- --port 3100` is
supported for isolated tests; normal local origins remain3000/8000.

Never run dev and start on the same port together. Both serve the same app and
HTTPS origin. The custom launcher accepts only the documented `--port` override.

## Start the background worker

In PowerShell terminal3:

```powershell
Set-Location -LiteralPath 'C:\Users\khali\Desktop\HVA\03 - PROJECTS\CUSTOM PROJECTS\Kayrealestate\backend'
.\.venv\Scripts\python.exe -m app.cli.worker
```

Keep it running for antivirus/file jobs, exports, website intake and internal
reminders. The worker has no listening port. A quiet terminal with no pending
jobs is normal. Read-only status:
`.\.venv\Scripts\python.exe -m app.cli.worker --status`.

## First login, only if not yet initialized

No default administrator/password is seeded. The intended administrator runs
this once from an interactive backend terminal and chooses their own credentials:

```powershell
.\.venv\Scripts\python.exe -m app.cli.bootstrap_admin
```

Do not pass passwords in arguments, environment, files, pipes or chat. The
password prompts are hidden. A completed installation refuses repeat bootstrap;
this command is not a password-reset mechanism. [Bootstrap runbook](admin-bootstrap.md).

## Local browser certificate trust is a separate user choice

The project's private CA is valid, but was not trusted by Windows during the
startup check. Therefore an ordinary Chrome profile can show
`ERR_CERT_AUTHORITY_INVALID` until the user explicitly trusts it. Server-side
TLS verification remains enabled and passed the direct/facade checks.

No Windows trust change is performed without the user's approval. To deliberately
trust **this existing project's public CA for your current Windows account**,
run from the project root:

```powershell
Import-Certificate -FilePath '.\backend\.local-data\certificates\ca.pem' -CertStoreLocation 'Cert:\CurrentUser\Root'
```

This changes the current user's trusted-root store, not just a browser tab.
Only import the known project CA, never a downloaded replacement or a private-key
file. Close/reopen the browser if it retains a cached certificate error. No
administrator account/password or paid certificate is needed. Do not work around
this with `NODE_TLS_REJECT_UNAUTHORIZED=0`, global browser certificate bypasses,
turning off HTTPS or removing secure-cookie/facade protections.

## Stop everything owned by this project

Press **Ctrl+C** in the frontend, backend and worker terminals. From backend/:

If `npm.cmd` asks `Terminate batch job (Y/N)?`, answer `Y` to close its wrapper.

```powershell
docker compose -f compose.clamav.yaml stop
```

This stops the antivirus container but preserves its signature cache and volume.
Do not use `down -v`. If the optional signed simulator is running, Ctrl+C its
terminal too. The shared Windows PostgreSQL service on5432 belongs to other local
projects as well; do not terminate it as a KAY process.

Final project-port check (PowerShell; no output means closed):

```powershell
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object LocalPort -in 3000,3100,8000,8001,8100,8101,8102,8200,3310 |
  Select-Object LocalAddress,LocalPort,OwningProcess
```

Runtime changes and actual checks: [startup execution](local-startup-execution.md).
Optional signed website setup remains the [intake contract](../04-design/website-intake-local.md),
not automatic account/source configuration or a real website connection.
