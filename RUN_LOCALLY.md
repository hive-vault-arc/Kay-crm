# Run KAY CRM locally on Windows

Reviewed: 2026-10-20. Commands use PowerShell and this checkout:

```text
C:\Users\khali\Desktop\HVA\03 - PROJECTS\CUSTOM PROJECTS\Kayrealestate
```

This guide covers local installation, configuration, database preparation,
startup, verification and shutdown. It does not deploy to Vercel or DigitalOcean.
Never use production database credentials in this procedure.

If the checkout is already installed, use [Daily startup](#1-daily-startup).
For a new computer, start with [Required software](#2-required-software), then
follow sections 3 through 7 before returning to daily startup.

## Local services and ports

| Component | Address / port | How it runs |
|---|---|---|
| Frontend | `https://localhost:3100` | Next.js HTTPS development server |
| Backend API | `https://localhost:8100` | FastAPI through Uvicorn |
| Background worker | No listening port | Python process using the PostgreSQL queue |
| PostgreSQL | `localhost:5432` on this laptop | Existing native Windows PostgreSQL 18 service |
| ClamAV antivirus | `127.0.0.1:3310` | Project-owned Linux container in Docker Desktop |

Only ClamAV runs in Docker in this local setup. The repository does not provide
a Compose stack for the frontend, backend or database. Redis/Valkey, a mail
server, Vercel and DigitalOcean accounts are not required to run the local CRM.

The current manual configuration is 3100/8100. Some source defaults, examples
and older records still use 3000/8000. The explicit port arguments and matching
environment values below take precedence. Do not stop another project on 8000.

## 1. Daily startup

Use this section when dependencies, private configuration, certificates,
migrations and the first administrator already exist. Do not reinstall,
recreate databases or bootstrap an administrator each time you start the app.

Open Docker Desktop and wait until its Linux engine is running. The Windows
PostgreSQL service must also be running. Keep the following three PowerShell
terminals open while using the CRM.

### Terminal 1: ClamAV, then backend API

```powershell
Set-Location -LiteralPath 'C:\Users\khali\Desktop\HVA\03 - PROJECTS\CUSTOM PROJECTS\Kayrealestate\backend'
docker compose -f compose.clamav.yaml up -d --wait
```

Wait for a healthy container. The first image download and antivirus signature
initialization can take several minutes. If this command fails, diagnose it
before continuing; do not disable scanning.

Then, in the same terminal:

```powershell
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8100 `
  --ssl-keyfile .local-data/certificates/localhost-key.pem `
  --ssl-certfile .local-data/certificates/localhost.pem `
  --loop app.runtime:create_server_loop `
  --no-access-log
```

Expected: Uvicorn starts on `https://127.0.0.1:8100` and reports application
startup complete. The frontend uses the equivalent certificate hostname
`https://localhost:8100`.

For backend code editing, add `--reload` to this command. It is optional for
normal use. The explicit loop option is the project's Windows socket-loop
configuration; keep it. Access logs remain off to avoid logging record paths.

This uses ordinary Uvicorn, not a required custom KAY server CLI. Virtualenv
activation is unnecessary because the command names its executable directly.
Bare `uvicorn app.main:app --reload` defaults to HTTP on 8000 and is not the
connected local HTTPS workflow.

### Terminal 2: background worker

```powershell
Set-Location -LiteralPath 'C:\Users\khali\Desktop\HVA\03 - PROJECTS\CUSTOM PROJECTS\Kayrealestate\backend'
.\.venv\Scripts\python.exe -m app.cli.worker
```

Leave this running for file scanning, reminder delivery, exports and signed
website intake. A quiet terminal when there are no pending jobs is normal.
Do not start a test fixture supervisor in its place.

### Terminal 3: frontend

```powershell
Set-Location -LiteralPath 'C:\Users\khali\Desktop\HVA\03 - PROJECTS\CUSTOM PROJECTS\Kayrealestate\frontend'
npm.cmd run dev -- --port 3100
```

Open [https://localhost:3100](https://localhost:3100). Sign in with an existing
local KAY account. There is no default login or password.

Use HTTPS, not HTTP, and use `localhost` rather than substituting another
hostname. The frontend origin participates in cookie, CSRF and origin checks.
Plain `npm run dev` uses 3000; it does not select 3100 automatically.

### Terminal 4: verify the running stack

Run the checks in [section 8](#8-check-that-the-stack-is-working). A listening
port alone does not prove database readiness, successful authentication or
working background jobs.

## 2. Required software

Install these before preparing a new checkout. Reopen PowerShell after changing
PATH. Use the repository's pinned versions rather than updating dependencies
to whatever is newest.

| Software | Version / requirement | Installation source |
|---|---|---|
| Git for Windows | Needed to clone and update the repository | [Official Git installation](https://git-scm.com/install/windows) |
| Node.js | **24.13.1**, matching `.nvmrc`; this laptop uses npm **11.8.0** | [Official 24.13.1 release and Windows installers](https://nodejs.org/en/blog/release/v24.13.1) |
| Python | **3.14.3 exactly**, including pip and venv support | [Official Python 3.14.3 Windows installer](https://www.python.org/downloads/release/python-3143/) |
| PostgreSQL | **18**, native Windows server plus command-line tools; installed laptop version is 18.2 | [Official PostgreSQL Windows installer page](https://www.postgresql.org/download/windows/) |
| Docker Desktop | Linux containers, working `docker compose` command | [Official Windows installation and prerequisites](https://docs.docker.com/desktop/setup/install/windows-install/) |
| Browser | Chrome or another supported modern browser; installed Chrome is used by headed Chrome tests | Install separately if absent |

Docker's WSL 2 setup requires enabled hardware virtualization and a supported
Windows version. Follow Docker's linked prerequisites; its current instructions
require WSL 2.1.5 or newer and at least 8 GB system RAM. KAY's ClamAV container
alone has a 4 GB memory limit, so allow room for it as well as PostgreSQL, Node,
Python and Windows. Docker Desktop licensing must suit your organization.

If WSL is missing, these are installation commands for an administrator
PowerShell, not daily startup commands. Restart Windows if prompted:

```powershell
wsl --install
wsl --update
```

In Docker Desktop, use the WSL 2 engine / Linux containers. You do not need to
install Python, Node or PostgreSQL inside WSL for this Windows procedure.

Check the installed tools in a new PowerShell:

```powershell
git --version
node --version
npm.cmd --version
py -3.14 --version
docker version
docker compose version
wsl --version
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' --version
```

`py -3.14 --version` must say `Python 3.14.3`. If the Python launcher is absent,
use the full path of the installed Python 3.14.3 executable for venv creation
only. After that, use `backend\.venv` for every backend command. The application
refuses a different local Python version or a different virtualenv location.

The PostgreSQL installer should include the server and command-line tools.
pgAdmin is optional. Keep the installer administrator role and its password
privately; the setup helper reads the role and installation paths from the
Windows registry. Do not install a second server on an occupied port.

## 3. Obtain the code and install dependencies

Skip cloning if this project folder already exists. For a genuinely new
checkout, clone into the desired location:

```powershell
git clone https://github.com/hive-vault-arc/Kay-crm.git 'C:\Users\khali\Desktop\HVA\03 - PROJECTS\CUSTOM PROJECTS\Kayrealestate'
```

If you use a different project directory, update the `Set-Location` paths in
this guide and the absolute `API_CA_FILE` path in your private configuration.

### Backend dependencies

From a new checkout with no `.venv`:

```powershell
Set-Location -LiteralPath 'C:\Users\khali\Desktop\HVA\03 - PROJECTS\CUSTOM PROJECTS\Kayrealestate\backend'
py -3.14 --version
py -3.14 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --require-hashes -r requirements-dev.lock
.\.venv\Scripts\python.exe -m pip install --no-deps --no-build-isolation -e .
.\.venv\Scripts\python.exe -m pip check
```

Run commands one at a time and stop if one fails. Do not recreate an existing
working `.venv`. The development lock includes the runtime dependencies and
the local setup, linting, typing and test tools. `requirements.txt` is the
hash-locked runtime-only set; it is not the complete workstation toolset.
`requirements.lock` is a compatibility entry point to that runtime set.

### Frontend dependencies

```powershell
Set-Location -LiteralPath 'C:\Users\khali\Desktop\HVA\03 - PROJECTS\CUSTOM PROJECTS\Kayrealestate\frontend'
npm.cmd ci
```

Use `npm ci` with the committed `package-lock.json`, not `npm update`.
Next.js, React, Tailwind and the other frontend packages install locally.
FastAPI, Uvicorn and Alembic likewise install inside the backend venv; no global
framework installation is needed. `npm.cmd` avoids PowerShell's `npm.ps1`
execution-policy issue without weakening your execution policy.

## 4. Prepare PostgreSQL and private local configuration

This section is for a new installation. The existing laptop setup already has
its development database and private configuration. Do not replace those files
with blank `.env.example` files or create a new empty database over existing data.

### 4.1 Confirm the native PostgreSQL service

```powershell
Get-Service -Name '*postgres*' | Select-Object Name,Status
& 'C:\Program Files\PostgreSQL\18\bin\pg_isready.exe' -h localhost -p 5432
```

On this laptop the service is `postgresql-x64-18`. If it is stopped, start that
verified service from Windows Services, or deliberately use administrator
PowerShell:

```powershell
Start-Service -Name 'postgresql-x64-18'
```

If your installer chose another service name, installation folder, role or port,
use those verified values. Do not alter another project's server. The local
helper expects a native Windows PostgreSQL installation registered by its
installer; a Docker database is not a drop-in replacement for that helper.

### 4.2 Create only a missing development database

Connect using the local installer administrator. `postgres` is the usual
installer role, not a claim about every installation. `-W` prompts for the
password instead of putting it in command history:

```powershell
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -h localhost -p 5432 -U postgres -d postgres -W
```

Inside psql, inspect first:

```sql
SELECT datname FROM pg_database WHERE datname = 'kayrealestate';
```

Only if the result has no row, create the empty development database:

```sql
CREATE DATABASE kayrealestate;
```

Exit psql:

```text
\q
```

Do not drop, restore over or reset an existing database. There is no database
dump or customer-data import required for a fresh installation.

### 4.3 Supply the local password privately

The existing Windows setup helper reads this Git-ignored file:

```text
docs/03-planning/local-database-credentials.md
```

First check its exclusion from the project root:

```powershell
Set-Location -LiteralPath 'C:\Users\khali\Desktop\HVA\03 - PROJECTS\CUSTOM PROJECTS\Kayrealestate'
git check-ignore docs/03-planning/local-database-credentials.md
```

Expected: the path is printed. If it is not ignored, stop before entering a
password. Open/create the note privately in your editor. The helper requires
exactly one backtick-delimited password on a line containing `password` or
`mot de passe`. This example contains a placeholder, not a usable password:

```markdown
PostgreSQL password: `<YOUR_LOCAL_POSTGRESQL_PASSWORD>`
```

Replace only the placeholder with the local PostgreSQL installer role's actual
password. Never commit or share this note, database URLs, private keys or `.env`
contents. A PostgreSQL password is distinct from a CRM user's login password.

### 4.4 Run the local setup helper once

```powershell
Set-Location -LiteralPath 'C:\Users\khali\Desktop\HVA\03 - PROJECTS\CUSTOM PROJECTS\Kayrealestate\backend'
.\.venv\Scripts\python.exe -m app.cli.setup_local
```

The helper:

- Reads the registered installer role, port and PostgreSQL binary directory.
- Verifies the existing `kayrealestate` database and creates only missing
  `kayrealestate_test`, `kayrealestate_benchmark` and `kayrealestate_recovery`
  databases. It never resets their contents.
- Writes ignored backend/frontend configuration with correctly encoded local
  database URLs and a shared server-only `FACADE_SECRET`.
- Generates the local HTTPS certificate set if none exists, preserves a complete
  existing set, and refuses a partial set. It does not trust the CA in Windows.

It does not install PostgreSQL, create the development database, apply
migrations or create a CRM administrator. It uses the first registered
PostgreSQL installation; if several installations exist, review its target
before running it. The installer role needs the local privileges used to
create the isolated databases and inspect database identity. This development
helper is not a production-role or managed-database setup procedure.

The helper still writes the older 3000/8000 origin defaults. Immediately apply
the 3100/8100 configuration in section 5. Do not rerun the helper as a daily
startup step, because it rewrites those values.

## 5. Configure the frontend and backend for 3100/8100

Edit the private files in your editor. Preserve the database URLs and generated
secret. The snippets below show only the keys to set, not replacement contents
for the complete files.

In `backend/.env`:

```dotenv
APP_ENVIRONMENT=development
FRONTEND_ORIGIN="https://localhost:3100"
ANTIVIRUS_HOST=127.0.0.1
ANTIVIRUS_PORT=3310
```

In `frontend/.env.local`:

```dotenv
API_BASE_URL="https://localhost:8100"
FRONTEND_ORIGIN="https://localhost:3100"
API_CA_FILE="C:/Users/khali/Desktop/HVA/03 - PROJECTS/CUSTOM PROJECTS/Kayrealestate/backend/.local-data/certificates/ca.pem"
```

Use forward slashes in the quoted Windows CA path, or properly escaped
backslashes. It must be an absolute readable file path. `API_BASE_URL` is an
HTTPS origin only, with no `/api/v1` suffix, credentials, query or fragment.

| Backend key | Local meaning |
|---|---|
| `DATABASE_URL` | Generated `postgresql+psycopg` URL for the local `kayrealestate` database |
| `TEST_DATABASE_URL` | Separate `_test` target; required when running test mode |
| `BENCHMARK_DATABASE_URL` | Separate `_benchmark` target; required in benchmark mode |
| `RECOVERY_DATABASE_URL` | Separate `_recovery` target; required in recovery mode |
| `FACADE_SECRET` | Same private value in both configuration files, at least 32 characters |
| `POSTGRES_BIN` | Verified local PostgreSQL 18 `bin` directory, needed by database utilities |
| `FRONTEND_ORIGIN` | Exact browser origin, `https://localhost:3100` |

Ordinary development does not require the three isolated URLs to be populated,
but tests, benchmarks and recovery do require their respective separate targets.
The setup helper prepares all of them. Do not point any isolated variable at
`kayrealestate` or at a production database, even temporarily. `DATABASE_URL`
remains the development identity baseline during local isolated runs.

The helper configures loopback PostgreSQL access; it does not install TLS on
the native PostgreSQL server. Local web/API HTTPS and managed-database TLS are
different connections. Production PostgreSQL still requires the configured
managed host and verified `sslmode=verify-full`; see the separate production
runbook rather than adapting these local commands.

Do not prefix any database URL, CA configuration or facade secret with
`NEXT_PUBLIC_`. Keep local `APP_ENVIRONMENT=development`; inherited shell
environment variables override `.env` values. Use fresh terminals after tests
or configuration changes, and restart the API, worker and frontend after edits.

### Local HTTPS certificates and browser trust

The setup helper creates these ignored files:

```text
backend/.local-data/certificates/ca.pem
backend/.local-data/certificates/localhost.pem
backend/.local-data/certificates/localhost-key.pem
```

The frontend launcher automatically reads the localhost certificate/key from
that directory. The API uses the same files through the Uvicorn options above.
The facade verifies the API using `API_CA_FILE`.

On a new Windows account, decide whether to trust this known project's public
CA for that account. This is a trusted-root change, not just a page setting.
After reviewing and approving that change, run from the project root:

```powershell
Import-Certificate -FilePath '.\backend\.local-data\certificates\ca.pem' -CertStoreLocation 'Cert:\CurrentUser\Root'
```

Import only `ca.pem`, never a private key or an unknown downloaded CA. This
trust step is not repeated every day. Reopen Chrome if it retains a cached
certificate error. The project does not automatically change your trust store.

Never use `NODE_TLS_REJECT_UNAUTHORIZED=0`, a browser verification bypass,
insecure HTTP or removal of secure-cookie/CSRF protections to fix a trust error.
Do not delete the certificate directory to clear a browser cache.

## 6. Apply database migrations

Migrations are a first-installation or approved code-update step, not a server
startup command. Back up existing data before a schema upgrade and stop API and
worker writers. Keep the intended local development target selected.

From the backend directory, first validate configuration without connecting:

```powershell
.\.venv\Scripts\python.exe -c "from app.settings import load_settings; print('Environment:', load_settings().app_environment)"
```

Expected: `Environment: development`. Then inspect the database and migration
state:

```powershell
.\.venv\Scripts\python.exe -m app.cli.inspect_database
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic heads
```

The inspection writes ignored, read-only catalogue/identity metadata under
`backend/.local-data/inspection/`. Review the intended local target before DDL.
For an empty prepared database, or an approved upgrade of the existing schema:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
```

The current revision must match the repository's head; do not rely on a revision
number copied from an old document. A successful upgrade may produce little
output, so check the command's exit status and current revision.

Unknown revisions and a populated unversioned schema are intentionally refused.
Do not use `alembic stamp`, a downgrade, table deletion or disabled isolation to
silence those safeguards. Investigate the database identity and migration history.
`alembic check` checks model/schema drift; it does not apply migrations.

## 7. Create the first administrator once

Only for a migrated, uninitialized installation, the intended administrator
runs this in an interactive PowerShell from `backend/`:

```powershell
.\.venv\Scripts\python.exe -m app.cli.bootstrap_admin
```

Enter the requested name, email and password confirmation. Password entry is
hidden; choose a password of at least 12 characters. This first administrator
chooses their own final password. No default account is seeded and no readable
password file is created. Keep the chosen credentials privately.

The command takes no credential arguments, environment password, piped input or
default password. It refuses a repeat initialization and is not a password-reset
tool. If the local installation already has users, sign in with an existing
account instead of attempting another bootstrap.

Subsequent staff accounts are created by an administrator in Settings. Their
initial password is chosen by that administrator, and their first login requires
a different personal password followed by fresh login. See the
[administrator bootstrap runbook](docs/06-delivery-and-operations/admin-bootstrap.md)
for failure codes and recovery boundaries.

Now follow [Daily startup](#1-daily-startup).

## 8. Check that the stack is working

Use a separate PowerShell while the three application terminals remain open.
These checks do not require printing credentials or disabling TLS verification.

### Database server and antivirus

```powershell
& 'C:\Program Files\PostgreSQL\18\bin\pg_isready.exe' -h localhost -p 5432
Set-Location -LiteralPath 'C:\Users\khali\Desktop\HVA\03 - PROJECTS\CUSTOM PROJECTS\Kayrealestate\backend'
docker compose -f compose.clamav.yaml ps
```

Expected: PostgreSQL accepts connections, and ClamAV is running/healthy with its
host port bound to `127.0.0.1`. `pg_isready` alone does not validate the app's
password, migration revision or authorization.

Optional ClamAV protocol check, without sending any files:

```powershell
.\.venv\Scripts\python.exe -c "import socket; s=socket.create_connection(('127.0.0.1',3310),timeout=5); s.sendall(b'zPING\0'); print(s.recv(64).decode().strip('\0')); s.close()"
```

Expected: `PONG`. Keep ClamD private; it is not a public HTTP endpoint.

### HTTPS API and frontend facade

```powershell
Invoke-RestMethod -Uri 'https://localhost:8100/api/v1/health/live'
Invoke-RestMethod -Uri 'https://localhost:3100/api/v1/health/ready'
(Invoke-WebRequest -UseBasicParsing -Uri 'https://localhost:3100/login').StatusCode
```

Expected: `status: live`, `status: ready` and HTTP `200`, respectively. Windows
must trust the project's CA for these normal HTTPS requests to work.

The direct API readiness endpoint is facade-protected: requesting
`https://localhost:8100/api/v1/health/ready` anonymously returns `403` by design.
Use the frontend readiness URL above; do not bypass facade authorization.

### Worker and browser

```powershell
.\.venv\Scripts\python.exe -m app.cli.worker --status
```

This reports queue counts; it does not prove every historic job succeeded. If
failed jobs exist, investigate their safe error codes rather than clearing or
replaying them blindly. A running worker and a ready database are both needed
for new background work.

In the browser, open `https://localhost:3100`, sign in, then open Dashboard,
Leads, a permitted record and the visit calendar. A fresh database can show empty
lists. Existing records depend on the signed-in user's permissions. Do not
import customer data or capture private information merely to test startup.

## 9. Run a compiled frontend instead of dev

Stop the frontend development terminal first. From `frontend/`:

```powershell
npm.cmd run build
npm.cmd run start -- --port 3100
```

The local `start` launcher still serves HTTPS with the same certificates and
port configuration. Keep the backend and worker running separately. This is a
local compiled build, not a cloud deployment. Do not run dev and start together
on the same port, or build into the live dev output directory while dev is using it.

The optional signed website simulator needs its separate source/agent setup
and the compiled frontend; its restricted proxy does not reliably hydrate the
Next development runtime. It is not required for normal staff use. Follow the
[local intake contract](docs/04-design/website-intake-local.md) if testing it.

## 10. Development checks and isolated tests

These are verification commands, not required daily startup commands. Stop
frontend dev before building. Frontend checks from `frontend/`:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:unit
npm.cmd run build
```

Backend checks from `backend/`, using the locked development dependencies:

```powershell
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m ruff format --check .
.\.venv\Scripts\python.exe -m mypy app
.\.venv\Scripts\python.exe -m pip check
.\.venv\Scripts\python.exe -m tests.unit_runner
```

`tests.unit_runner` is the reviewed database-independent selection; it blocks
database connections. It is not a substitute for database integration testing.

Full pytest/browser integration uses the separate test database, synthetic
fixtures, real ClamAV and the shared isolated-database lease. Run those suites
serially, never against development or production. Browser harnesses also use
3100/8100 and control ports, so stop the manual frontend/API/worker first.
Do not run `scripts/test-api.mjs` as an ordinary development server: it owns
synthetic fixtures and cleanup. Installed Chrome is required for visible
`npm.cmd run test:chrome` checks.

Use the [QA command register](docs/QA_COMMANDS.md) and
[local acceptance procedure](docs/06-delivery-and-operations/local-final-acceptance.md)
for the specific integration commands and release gates. Database-dependent
backend/browser GitHub suites are manual-only, preserved and still required
before release with real customer data. Not running them is **not executed**,
not passed. See [production settings and CI](docs/06-delivery-and-operations/production-settings-ci.md).

## 11. Troubleshooting

| Symptom | Check / action |
|---|---|
| `npm` / `node` not recognized | Install Node 24.13.1 and reopen PowerShell. Use `npm.cmd` if `npm.ps1` is blocked. |
| Python runtime / venv refusal | Use the executable under this checkout's `backend\.venv`, created with Python 3.14.3. Do not use global Python or another project's venv. |
| `Attribute "app" not found` | From `backend/`, use this checkout's `.venv\Scripts\uvicorn.exe app.main:app`; confirm you have current code and no unrelated `app` module. |
| Port occupied / `EADDRINUSE` | Inspect the listener and its owner. Stop only your own KAY terminal, or select a deliberate new port and update both origins. Never kill a process merely because it uses 8000. |
| Browser opens 3000, or login/origin checks fail | Start with `-- --port 3100`; both private `FRONTEND_ORIGIN` values must be `https://localhost:3100`, and API origin must be 8100. Restart services after edits. |
| `ERR_CERT_AUTHORITY_INVALID` | Verify the known project's CA and approved CurrentUser trust step. Reopen the browser. Do not disable certificate verification. |
| Missing localhost certificate/key or `ENOENT` | Check the three files in `.local-data/certificates`. On a fresh setup generate them through the helper. A partial set needs review; do not delete existing private data or silently regenerate a trusted identity. |
| Facade `503` | Check API liveness, exact `API_BASE_URL`, readable local `API_CA_FILE` and matching `FACADE_SECRET`. Check values privately, never paste the secret or URL credentials into logs/chat. |
| Anonymous direct API readiness returns `403` | Expected. Request readiness through the frontend facade instead. |
| Configuration error | Read only the variable name and safe error code. Confirm local development mode and required values; do not print the full settings object or private environment files. |
| PostgreSQL connection refused | Check the native Windows service and verified port with `pg_isready`. Docker Desktop does not start the native database for you. |
| Database permission / identity / migration refusal | Verify the intended local role, target and migration history. Keep isolation/DDL safeguards. Do not stamp, downgrade, reset or point test URLs at the application database. |
| `LOCAL_SETUP_FAILED` | Review the private note's one-password format, native installer registry entry, readable `postgresql.conf`, existing development database, role privileges and complete certificate set. The helper does not reveal credentials in diagnostics. |
| ClamAV remains starting or unhealthy | Check Docker Linux engine, available memory, image download and signature updates; inspect the project container logs with the command below. |
| Upload stays quarantined / export or reminder pending | Keep the worker running and verify ClamAV where relevant. Quarantine during scanner failure is intentional; never mark unscanned files clean. |
| Bootstrap refuses another administrator | Installation is already initialized, migrations are missing or manual recovery is needed. Use an existing admin or the bootstrap runbook, not an ad hoc database insert. |
| Application opens but has no records | Fresh installations have no seeded CRM records. Check the selected account's permissions before assuming data is missing. |

Safe listener inspection:

```powershell
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object LocalPort -in 3100,8100,3310,5432 |
  Select-Object LocalAddress,LocalPort,OwningProcess
```

ClamAV diagnostics from `backend/`:

```powershell
docker compose -f compose.clamav.yaml logs --tail 50 clamav
```

Do not share logs containing credentials, cookies, tokens or private records.
Do not globally suppress errors to make startup appear successful.

## 12. Stop KAY safely

Press **Ctrl+C** in each KAY frontend, API and worker terminal. If the npm batch
wrapper asks `Terminate batch job (Y/N)?`, answer `Y`. Stop any optional KAY
simulator or test supervisor you deliberately started as well.

Then stop only the project's antivirus container:

```powershell
Set-Location -LiteralPath 'C:\Users\khali\Desktop\HVA\03 - PROJECTS\CUSTOM PROJECTS\Kayrealestate\backend'
docker compose -f compose.clamav.yaml stop
```

This retains the signature cache. Do not use `down -v`, delete `.local-data`,
or stop all Node/Python processes. PostgreSQL on this laptop is shared with other
projects: leave its Windows service running. Leave unrelated Docker containers
and Docker Desktop alone.

Check the three ordinary KAY service ports:

```powershell
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object LocalPort -in 3100,8100,3310 |
  Select-Object LocalAddress,LocalPort,OwningProcess
```

No output means those ports have no listener. The worker has no port, so also
confirm its own terminal has returned to the prompt. An unrelated/shared 5432
listener is not a failed KAY shutdown.

## 13. Files to preserve and verification scope

Keep these private and out of Git:

- `backend/.env` and `frontend/.env.local`.
- The local database credentials note.
- `backend/.local-data/`, including private files, certificates and inspection
  metadata, plus any separate backup locations.
- PostgreSQL database contents and the Docker ClamAV signature volume.

Do not delete them as a dependency/cache cleanup step. Source code alone is
not a database/file backup. Use the
[backup and recovery runbook](docs/06-delivery-and-operations/local-backup-recovery.md)
before a data-bearing upgrade or recovery operation.

This guide was checked against the current launchers, settings, setup helper,
migration safeguards, bootstrap code, Compose file and installed tool versions.
The ignored local origin values, CA-file presence and matching facade-secret
configuration were checked without printing their private contents. The guide
uses the 3100/8100 configuration used for this laptop's local operation.

Writing this guide does not install software, migrate/seed/reset databases,
restart services or certify the full application. Fresh-machine installation
and complete database/browser integration were not executed for this
documentation change. Historical runtime repair evidence remains in
[local startup execution](docs/06-delivery-and-operations/local-startup-execution.md);
other actual test results are in the QA register.
