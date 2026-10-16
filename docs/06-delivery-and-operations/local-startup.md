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
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload `
  --ssl-keyfile .local-data/certificates/localhost-key.pem `
  --ssl-certfile .local-data/certificates/localhost.pem `
  --loop app.runtime:create_server_loop `
  --no-access-log
```

This is the installed project's standard Uvicorn executable, not a KAY launcher.
Without activating, use `.\.venv\Scripts\uvicorn.exe` with the same arguments.
The `app.main:app` object and `app.main:create_app` factory expose the same routes,
middleware and lifespan-owned database resources. Reload is for development only.
The explicit Windows loop avoids Proactor reset callbacks; access logging stays
off so request paths/record identifiers are not written to ordinary server logs.

`uvicorn app.main:app --reload` alone now imports and starts successfully, but
Uvicorn defaults to **HTTP**. It cannot serve the connected HTTPS CRM without
the two certificate options above. Do not point the facade at HTTP or disable
certificate verification. Uvicorn does not read its `UVICORN_*` server options
from an application `--env-file`. The older `app.cli.serve` remains available
for existing supervisors/benchmarks; it is not required for manual development.

API origin:`https://localhost:8000`. Public liveness is
`https://localhost:8000/api/v1/health/live`. The direct readiness endpoint is
facade-protected and deliberately returns403 without server authority; check
`https://localhost:3000/api/v1/health/ready` through the frontend instead.
Do not disable facade authorization to make a direct health probe return200.

## Start the frontend

In PowerShell terminal2:

```powershell
Set-Location -LiteralPath 'C:\Users\khali\Desktop\HVA\03 - PROJECTS\CUSTOM PROJECTS\Kayrealestate\frontend'
npm.cmd run dev
```

Open **https://localhost:3000**. `npm run dev` starts that exact port with hot
reload and the existing local HTTPS certificate. A printed listening URL proves
the process is running, not that a particular browser trusts its certificate.

For the separate signed website simulator, stop dev, run `npm.cmd run build`,
then `npm.cmd run start` on the same3000 origin. This is compiled local mode,
not deployment. Normal CRM development and secure HMR are verified. The simulator
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

On2026-10-16 Khalid explicitly approved trusting this checkout's existing CA in
his Windows CurrentUser root store. Its exact presence and the localhost leaf
chain were verified, and ordinary Chrome and Windows HTTPS requests open the
development frontend without a certificate bypass. This is a local user-store
change, not a tracked certificate, machine-wide change or automatic setup policy.

On a new account/checkout an untrusted CA causes `ERR_CERT_AUTHORITY_INVALID`
even while `npm run dev` is correctly listening. Server-side TLS verification
remains mandatory. Obtain approval for that account's trust-store change first.

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
