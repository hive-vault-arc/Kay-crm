# KAY local backend

Current copy/paste startup/shutdown, frontend, antivirus, worker and first-login
commands: [Local startup](../docs/06-delivery-and-operations/local-startup.md).
Windows HTTP entry points now use an explicit socket-selector loop factory,
without deprecated global event-loop policies or suppressing exception logs.

SP-22 adds isolated full-volume benchmark/review utilities under benchmarks/,
the combined current-link merge regression and a populated0020 upgrade repair.
[Reproducible commands](../docs/06-delivery-and-operations/local-final-acceptance.md)
and [current execution](../docs/03-planning/sprints/sp-22-execution.md) keep actual
results separate from pending gates. The benchmark alone uses the explicit
app.cli.serve --environment benchmark entry; normal development remains8000.
No new schema revision or public endpoint is introduced by this verification.
SP22 local gates pass with retained corrected attempts. For the measured100-user
configuration run `.venv/Scripts/python.exe -m app.cli.serve --workers 4`;
the bounded CLI default remains1 and did not meet the100-user latency target.
Each process uses the same app factory/DB authorization and pool5/overflow0.

SP-21 adds protected local backup/recovery. From this directory, use
`.venv/Scripts/python.exe -m app.cli.backup` with create/status/schedule/restore/
resume/extract-code. Read the [runbook](../docs/06-delivery-and-operations/local-backup-recovery.md)
before operating: restore targets only the independently verified recovery
database/directory, never development. Windows current-user DPAPI points are
not portable offsite disaster recovery. No public backup route is added.

SP-20 local website intake uses migration0022, the existing worker and a separate
HTTPS127.0.0.1:8001 synthetic form server. After bootstrap and an active agent:
run `.venv/Scripts/python.exe -m app.cli.website_source --agent-id <agent-UUID>`,
then `.venv/Scripts/python.exe -m app.cli.website_simulator` alongside the normal
API/frontend/worker. Never print/copy the ignored signing key to the browser.
[Operation, disable and retained-receipt recovery](../docs/04-design/website-intake-local.md).
No accounts/source are seeded in development; cumulative SP-22 remains pending.

SP-02 provides real PostgreSQL readiness, guarded Alembic history, safe errors and
local HTTPS integration. SP-03 adds interactive first-administrator bootstrap,
Argon2id credentials, revocable database sessions, audit and four facade-only auth
routes. SP-04 implements staff administration; SP-05 adds contacts/enquiries,
SP-06 ownership/history/merge, SP-07 standalone properties/owners/offerings and
SP-08 development hierarchy, physical units, reusable types and whole offerings.
No account is seeded. Subsequent CRM/worker modules through SP21 are recorded in
their sprint ledgers; full acceptance remains SP-22.

## Runtime and locked installation

Use Python **3.14.3**. Only venv creation uses the base interpreter. From `backend/`:

```powershell
py -3.14 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --require-hashes -r requirements-dev.lock
.\.venv\Scripts\python.exe -m pip install --no-deps --no-build-isolation -e .
```

Runtime-only dependencies are separately locked in `requirements.lock`. pip,
setuptools and the declared tooling are pinned in the development lock. No global
pip/tool installation or assumed shell activation is required. The application
refuses a different interpreter prefix/version. All Python subprocesses use
`sys.executable`; Windows wrappers name `.venv/Scripts/python.exe` explicitly.

To regenerate both locks, use `scripts/kay.ps1 -Task lock` after installing the
existing development lock. Review dependency changes before adopting a new lock.

## Private local setup

The authorized development database is `kayrealestate`. The setup tool reads its
supplied password privately from the ignored local note, verifies the PostgreSQL
installer role and configured port, connects through loopback, and creates only
missing `kayrealestate_test`, `kayrealestate_benchmark` and `kayrealestate_recovery`
databases. It never drops, clears or resets an existing database.

```powershell
.\scripts\kay.ps1 -Task setup
.\scripts\kay.ps1 -Task inspect -Environment development
.\scripts\kay.ps1 -Task inspect -Environment test
.\scripts\kay.ps1 -Task inspect -Environment benchmark
.\scripts\kay.ps1 -Task inspect -Environment recovery
```

Generated `backend/.env`, `frontend/.env.local` and
`backend/.local-data/certificates/` are ignored, private local runtime artifacts.
Examples contain variable names only. Do not print/copy URLs, passwords, facade
secrets, certificate keys or the source note into evidence or a commit. On another
machine supply authorized private configuration rather than copying this laptop's
credentials. This setup uses the supplied local installation role; a future
production least-privilege role/provisioning is outside this sprint.

The local CA issues one localhost/loopback certificate shared by Next development
HTTPS and Uvicorn. The facade explicitly trusts its CA. No operating-system trust
store is modified and TLS verification is never disabled server-side. A normal
browser may require explicit trust/acceptance of this private development CA.
Playwright accepts it only in disposable synthetic contexts.

## Migration and startup

Inspect before applying migrations. Unknown revisions or a nonempty unversioned
schema are refused, not silently stamped. Revision `0001_foundation` establishes
only Alembic's version table; `0002_identity` adds identity tables and an empty
singleton agency. Development identity downgrade is refused to prevent accidental
account loss; up/down/up tests run only against the isolated test target.

```powershell
.\scripts\kay.ps1 -Task migrate -Environment test
.\scripts\kay.ps1 -Task migrate -Environment development
.\scripts\kay.ps1 -Task serve
```

The API binds to `https://localhost:8000`. From `frontend/`, `npm run dev` starts
`https://localhost:3000`. The browser uses same-origin `/api/v1/health/ready`;
Next relays it to the API with server-only authority. Readiness makes a real SQL
round trip and returns 503 on database failure; public liveness is independent.
Private configuration, database identity and exception details are never returned.
The facade allowlists health, login/logout/me/change-password and explicit
per-feature staff/business reads and commands. The [current catalogue](../docs/04-design/api-catalogue-local.md)
lists the full implemented API; signed source intake and private direct transfers
keep their separate authentication boundaries. Staff
auth calls require server-only facade authority and current database proof;
mutations require Origin and session-bound CSRF. No generic proxy/bootstrap route.

## First administrator, chosen interactively

After migrations, the intended administrator runs this from an actual local
terminal in `backend/`:

```powershell
.\scripts\kay.ps1 -Task bootstrap
# Equivalent, with the explicit project interpreter:
.\.venv\Scripts\python.exe -m app.cli.bootstrap_admin
```

Enter your display name/email, then your own final password twice at the hidden
prompts (at least 12 characters). Do not pass a password in arguments, environment,
file, pipe or chat. Non-TTY/echo fallback is refused. Success prints only a safe
confirmation and user UUID. Then sign in through the frontend. The singleton lock
commits user/credential/bootstrap marker/audit atomically. Repeat returns
ALREADY_INITIALIZED; an existing installation without an active administrator
needs MANUAL_RECOVERY_REQUIRED, not another bootstrap or a destructive reset.
No real administrator was created by this sprint's synthetic checks. See the
[runbook](../docs/06-delivery-and-operations/admin-bootstrap.md).

## Named staff administration

After migration 0003, use the administrator-only Settings UI. There is no staff
seed, public signup or DELETE endpoint. Create generates a random 192-bit
temporary password once, stores only its Argon2id hash and blocks login until
confirmed in-person handoff. Temporary credentials last 24 hours and require
change/fresh login. Reset requires the current administrator password and revokes
target sessions; disabled-account recovery follows that same handoff flow.
The last active final-password administrator cannot be disabled/demoted.

User commands require current versions and actor-scoped UUID idempotency keys.
No plaintext result is persisted for retries: repeated create/reset returns a
safe conflict; locate/reset the existing account after a lost display. Reads
never retrieve credentials. Agency and ordered user locks serialize authorization
and last-admin decisions. Account, credential, revocations, audit and non-secret
receipt commit together. See [SP-04 evidence](../docs/03-planning/sprints/sp-04-evidence.md)
and the [API contract](../docs/04-design/api-contracts.md#sp-04-implemented-account-wire-contract).

## Leads and contact identity

Revision `0004_contacts_enquiries` adds canonical person/organization contacts,
international phones, emails, contact roles, enquiries, collaborator scope context
and actor/route/key retry records. Active E.164 phones are globally unique;
deferred PostgreSQL checks require one primary per nonempty collection and an
assignee with contact scope. phonenumbers 9.0.41 validates explicit international
input; no region is guessed. A Lead is an enquiry, not a second identity table.

Contact plus enquiry, provenance, typed audit and retry receipt commit together.
An accessible duplicate requires deliberate reuse; a private phone reveals only
the responsible agent's display name. Current scope is applied before search,
counts, sorting, pagination and receipt replay. Agency serialization favors local
correctness, not benchmark acceptance. SP-06 adds assignment/collaboration
management and history below; SP-11 adds explicit deal creation as described below.
See [SP-05 evidence](../docs/03-planning/sprints/sp-05-evidence.md) and
[wire contract](../docs/04-design/api-contracts.md#sp-05-implemented-contact-and-enquiry-wire-contract).

## Quality and isolated tests

SP-06's `0005_ownership_history` / `0006_ownership_scope_guard` add immutable
typed timeline/assignment history, preserved original-contact FKs and archived
merge aliases. Use the same inspect/migrate commands above; never downgrade
development. Populated SP-05 data and legacy retry snapshots are backfilled.

In Contacts within Leads, a manager/administrator previews and confirms a
transfer, explicit collaborator set, archive or restore. Preview names the
responsible agent after the operation, even if they already had collaborator
access. Invalid enquiry assignments return to the manager queue with history;
the Lead detail can explicitly reassign them to a scoped agent. Agents can log
notes/manual interactions and merge two writable contacts, with an explicit
survivor, both versions, reason and retry key. Cross-portfolio merge is M/A-only.
Old URLs authorize the final survivor; merged source/history remain identifiable,
but Restore does not silently undo a merge. No email/visit action is sent by a
manual log. Future link modules must extend the same merge path before use.
See [SP-06 evidence](../docs/03-planning/sprints/sp-06-evidence.md) and
[wire contract](../docs/04-design/api-contracts.md#sp-06-implemented-ownershiphistory-wire-contract).

```powershell
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m ruff format --check .
.\.venv\Scripts\python.exe -m mypy app
.\.venv\Scripts\python.exe -m pytest --cov=app
.\.venv\Scripts\python.exe -m pip check
.\.venv\Scripts\python.exe -m pip_audit --no-deps --disable-pip -r requirements.lock
```

The fixture forces the explicit test environment and compares live PostgreSQL
cluster system ID/database OID against development. Host/role/URL aliases cannot
turn development into a test target. Missing connectivity or ambiguous identities
fail closed before DDL. No SQLite fallback is present. Tests use temporary or
explicit synthetic probe objects and clean up only objects they created. Never
reset a database to make a failed test pass.

SP-07 introduces `app/inventory` and additive migration
`0007_standalone_inventory`: standalone properties, legal-owner provenance,
independent current sale/rental campaigns and immutable confirmation/price history.
Follow-on `0008_inventory_finite_amounts` rejects numeric NaN in prices/area/history;
it preserves the applied migration and fails rather than rewriting invalid data.
All staff read safe inventory; M/A write. Owner contact identity is separately
scoped; inventory never grants contact access. Decimal strings/MAD and exact
month×12 comparisons are preserved. Aggregate versions, 24-hour typed receipts,
deferred owner/availability guards and partial current-campaign uniqueness apply.
The existing contact-merge policy now reparents legal-owner links and binds them
in impact previews without leaking private merge reasons into shared history.
At the SP-07 boundary there were no hierarchy, files, reservation or outcomes. See the
[wire contract](../docs/04-design/api-contracts.md#sp-07-standalone-inventory-wire-contract)
and [verified execution evidence](../docs/03-planning/sprints/sp-07-evidence.md).

SP-08 adds reviewed `0009_development_hierarchy`, five tables and optional real
property FKs, target-XOR campaigns/history/receipts, safe optional briefing and
shared numbered hierarchy/unit reads. Development/owner/offer commands share
version, current-authority, CSRF, receipt, audit and history infrastructure.
Developer and owner identities require separate current Contacts scope; merge
preserves origins and advances affected aggregates. Type defaults never rewrite
unit facts. See [SP-08 contract](../docs/04-design/api-contracts.md#sp-08-development-wire-contract)
and [execution record](../docs/03-planning/sprints/sp-08-evidence.md). Files,
reservations, stock outcomes and later services remain separate sprints.

Frontend `test:e2e`/`test:chrome` start isolated API HTTPS on 8100 and Next HTTPS on
3100. A separate test-only process supervisor on loopback 8101 stops/restarts its
own API child tree. Its random control token lives only in ignored local output;
no test-control route is mounted in FastAPI or Next. Its private pipe creates and
removes only runtime-random synthetic actors in the verified test target, never
development. Do not run migration/reset pytest cases concurrently with browser
fixtures against that same isolated database. Both runners now hold the same
session-level PostgreSQL advisory lease before any synthetic cleanup; a second
writer fails closed, including while the browser API is stopped for an outage
test. The lease is a harness guard, not a product endpoint. Keep all three ports free.

See [SP-02 evidence](../docs/03-planning/sprints/sp-02-evidence.md), [SP-03 evidence](../docs/03-planning/sprints/sp-03-evidence.md) and
[QA commands](../docs/QA_COMMANDS.md) for actual executed results and limitations.

## Protected files and real antivirus (SP-09)

Install the updated hash locks in this directory's `.venv` (Pillow12.3.0,
pypdf6.20.1). Reviewed additive Alembic0010/0011 introduce seven file/outbox/job
tables and session-proof hashes. Inspect first, then
`scripts/kay.ps1 -Task migrate -Environment development` for ordinary local use,
or `-Environment test` for isolated tests. Never reset development.

With Docker's Linux engine running, use separate terminals in `backend/`:

```powershell
docker compose -f compose.clamav.yaml up -d
docker compose -f compose.clamav.yaml ps
.venv/Scripts/python.exe -m app.cli.worker
```

Wait for healthy ClamAV before expecting scan completion. The compose file pins
the digest, persisted signatures,4GiB memory limit and127.0.0.1:3310 only.
`ANTIVIRUS_HOST` is loopback-only; `ANTIVIRUS_PORT` defaults3310. API and worker
share the selected ignored configuration (`APP_ENVIRONMENT=development` normally).
FastAPI8000 and Next3000 require the exact configured frontend Origin and trusted
local certificate. Scanner outages retain quarantine, never fake success.

Ctrl+C stops the worker; durable leased work recovers on restart.
`docker compose -f compose.clamav.yaml stop` stops only KAY's scanner and retains
its cache. Do not delete volumes or reconfigure unrelated containers. No account,
worker or database reset is seeded. Private immutable objects live only in
`.local-data/files/{environment}/`, never frontend/public. Do not manually delete
committed objects; archive through the application.

After inspecting the selected target, `.venv/Scripts/python.exe -m app.cli.file_maintenance`
reconciles old uncommitted staging/orphans with a one-hour grace period and
active-permit/database checks. It never purges pending/clean/rejected evidence.
Backups cover both PostgreSQL and the private directory; measured local recovery
and its limits are recorded in [SP-21 execution](../docs/03-planning/sprints/sp-21-execution.md).

Focused verification: `.venv/Scripts/python.exe -m pytest tests/test_files.py tests/test_file_edges.py -q`.
It requires healthy real ClamAV and isolated test PostgreSQL. Browser suites start
a separate explicit-venv worker with private outage controls. Never run them
concurrently with pytest. See the [wire contract](../docs/04-design/api-contracts.md#sp-09-protected-file-wire-contract)
and [SP-09 evidence](../docs/03-planning/sprints/sp-09-evidence.md) for current results.

## Independent searches and exact shortlists (SP-10)

`app/requirements` adds contact-scoped searches/typed criteria, original MAD
budgets, exact annual rental comparison, versioned shortlist/feedback commands
and current-scope idempotent replay. Shared offering selection projects only
safe target facts. It never creates an offering for a reusable type or reserves
stock. Contact merge reparents independent searches without rewriting origins,
actors, criteria or selected offering identities. Retained archived/withdrawn
offering links remain readable in current scope.

Reviewed additive Alembic `0012_requirements_shortlists` adds four tables and
SQL/FK/unique/type/intent/identity guards. Inspect each selected database before
`scripts/kay.ps1 -Task migrate -Environment development` (or test). Development
must never be reset/seeded; downgrade refuses development and retained history.
Use the explicit venv for every migration, application and test command.

Focused tests: `.venv/Scripts/python.exe -m pytest tests/test_requirements.py -q`.
Full tests include earlier real-antivirus regressions and therefore require the
SP-09 local ClamAV service. Browser/pytest fixtures share the exclusive test lease
and must not run concurrently. No additional worker/broker/dependency is added
by SP-10. See the [wire contract](../docs/04-design/api-contracts.md#sp-10-requirements-and-manual-shortlist-wire-contract)
and [execution record](../docs/03-planning/sprints/sp-10-evidence.md).

## SP-11 deals and private deal files

`app.deals` adds explicit current-contact-scoped affaires, ordinary stage skips,
next actions, separate customer proposals and immutable true-actor revisions.
The current responsible agent is derived from the contact. Accepting a proposal
never changes stock or closes an affaire. SP-12 adds dedicated reservation/release
commands; SP-13 adds outcomes/reopening, visits/tasks/finance remain SP-14/15/16.
Reviewed additive0013_deal_pipeline adds four tables and typed document/audit/
timeline deal links. Inspect then migrate the selected environment with the
existing scripts/kay.ps1 tasks; never reset/seed development. Downgrade refuses
development or retained history. Deal documents reuse the real ClamAV/private
file pipeline and follow current contact scope after transfer/merge.

Focused command (backend cwd): `.venv/Scripts/python.exe -m pytest tests/test_deals.py tests/test_deal_edges.py tests/test_deal_links.py -q --tb=short -x`.
Run all DB-writing suites serially under the existing lease. Full pytest/browser
regressions require healthy local ClamAV. No dependency, broker or scanner mock
was introduced. [Wire/model contract](../docs/04-design/deal-pipeline-local.md)
and [actual evidence](../docs/03-planning/sprints/sp-11-evidence.md) distinguish
implementation from technical acceptance and Khalid's product review.

## SP-12 persistent reservations and overlap

Explicit deal commands call the inventory stock boundary, lock development first
and affected offerings in stable order, and persist a non-expiring hold or a
reasoned release with original actor/history/outbox/receipt. Same-kind whole/
child and same-offering claims cannot both win. Shared stock exposes safe conflict
codes, not private deal/contact metadata. Ordinary progress never releases stock.

Additive `0014_reservations` introduced this boundary. Inspect before migrating;
development must never be reset/seeded and downgrade refuses retained history.
The existing file worker still consumes only `file.scan`; stock notifications
remain SP-15. No new worker, broker or dependency was introduced.

Focused command: `.venv/Scripts/python.exe -m pytest tests/test_reservations.py tests/test_reservation_migration.py tests/test_reservation_http.py -q --tb=short`.
Run DB-writing suites serially. Full regressions need healthy real local ClamAV.
See the [local protocol](../docs/04-design/reservations-local.md) and
[execution evidence](../docs/03-planning/sprints/sp-12-execution.md).

## SP-13 outcomes and guarded reopening

SP-13 revision `0015_outcomes_reopening` adds immutable private outcomes, original
responsible-agent snapshots, linked reopenings and Inventory-owned stock effects/
reversals. Explicit commands review current exact stock under shared locks;
external results require manager authority and create no KAY win/income. Partial
developments stay blocked for review, not silently reduced to remaining units.
Reopen never erases originals or resurrects a reservation. No financial or
notification consumer is introduced; SP-16 must rerun financial preservation.

Focused command: `.venv/Scripts/python.exe -m pytest tests/test_outcomes.py tests/test_outcome_edges.py tests/test_outcome_hierarchy.py tests/test_outcome_sql.py tests/test_outcome_migration.py tests/test_outcome_http.py -q --tb=short`.
Keep all database-writing suites serial under the shared isolated-target lease.
See [wire/model contract](../docs/04-design/outcomes-local.md) and
[execution evidence](../docs/03-planning/sprints/sp-13-execution.md), including
remaining gates and separate product review.

## SP-14 working policy and visits

Current additive head `0016_visit_calendar` creates the policy/windows, visits,
participants, immutable events and retry receipts. Inspect then migrate using
the existing explicit-venv tasks; never reset/seed development or erase retained
history. The intrinsic policy starts at capacity2/no hours, not a staff fixture.
An administrator must configure actual work/lunch times before off-site booking;
office visits remain possible without those settings.

The Windows local runtime explicitly pins tzdata2026.5. Backend ZoneInfo resolves
Casablanca civil input/projections because the inspected browser/shared database
timezone data differ. Do not update that shared installation or introduce client
civil conversions silently. Future tzdata/platform upgrades require fold/skipped
and hourly-boundary regression; production/Linux timezone paths are not accepted
through this Windows-local adapter.

Focused command: `.venv/Scripts/python.exe -m pytest tests/test_schedule.py tests/test_schedule_edges.py tests/test_schedule_http.py tests/test_schedule_migration.py -q --tb=short -x`.
Keep all DB-writing suites serial under the isolated-target lease. Current contact
authority applies after waits and before old receipt replay; colleague busy and
capacity views expose no private visit metadata. Policy preview preserves existing
visits. No fleet allocation, reminder consumer or SP-15 overdue work is added.
[Concrete contract](../docs/04-design/visit-scheduling-local.md) and
[execution evidence](../docs/03-planning/sprints/sp-14-execution.md) record the
actual technical boundary separately from Khalid's product review.

## SP-15 tasks and durable reminders

Additive head0017_tasks_reminders extends the existing queue with contact-scoped
tasks, append-only task history, receipts, typed internal notifications and a
visit schedule_version independent of policy/ordinary record versions.
[Concrete contract](../docs/04-design/tasks-reminders-local.md) and
[verification](../docs/03-planning/sprints/sp-15-execution.md) are authoritative.

From backend with the existing authorized ignored configuration, run
`.venv/Scripts/python.exe -m app.cli.worker` for the local worker,
`--once` for one bounded file/reminder iteration, or `--status` for safe
aggregate counts. Development is the default local target; isolated commands
must explicitly select test and restore the previous APP_ENVIRONMENT. There is
no product clock flag. Do not run Python globally, reset development, print
credentials or substitute a broker/background task.

Focused checks: explicit-venv pytest tests/test_work.py tests/test_work_edges.py
tests/test_work_http.py tests/test_work_process_migration.py. Full quality and
regression commands/results are in the QA register, not inferred from this text.
Old descriptions of SP-15 as future work are historical sprint boundaries.

## SP-16 optional commissions

app/finance adds exact optional commissions, separate recognition, derived
collections and retained linked corrections under current M/A authority. Additive
0018_commissions_collections introduces four guarded tables, not an editable
balance. Reopening appends review without changing prior financial facts.
See [the concrete contract](../docs/04-design/commissions-local.md) and
[focused execution evidence](../docs/03-planning/sprints/sp-16-execution.md).
All Python checks continue to use this directory's explicit .venv interpreter.

## SP-18 atomic contact CSV import

app/imports separates exact CSV parsing, row eligibility/agent mapping, protected
upload and one-transaction approval. Additive0019_atomic_contact_import retains
batch, source rows, preview snapshots and permanent result/retry identity.
Original import links are immutable historical provenance across contact merge;
private-file reconciliation retains referenced raw CSV. No raw download route,
inventory import or automatic enquiry/deal creation. Current M/A authority and
agent/phone/hash revalidation are required at approval and result replay.
See [contract](../docs/04-design/contact-import-local.md) and
[actual checks](../docs/03-planning/sprints/sp-18-execution.md). Preserve the
serial isolated-writer lease and explicit venv for tests/migrations/fixtures.
