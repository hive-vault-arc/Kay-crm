# KAY local CRM roadmap and shared sprint gates

Status: approved roadmap; SP-01–SP-22 locally technically accepted; product reviews pending
Date: 2026-10-16  
Confirmed decisions: the user approved 22 ordered local-development sprint specifications, the runtime choices and local defaults below, and automatic progression after technical exit gates pass.  
Technical proposals: package lock generation, local service wiring, and actual command implementations must be verified during setup.  
References: [sprint index](sprints/README.md), [ordered backlog](backlog.md), [scope](../../core-scope.md), [decisions](../../decisions.md), [harness](../HARNESS.md), [acceptance scenarios](../05-quality/acceptance-tests.md), and [QA command register](../QA_COMMANDS.md).  

## Delivery boundary and responsibilities

The deliverable described by these sprints is a complete C01–C14 CRM operating on this laptop with synthetic data. Frontend and backend source will live in separate `frontend/` and `backend/` directories. Sprint 01 initializes the frontend; Sprint 02 initializes the backend and local integration; later sprints implement complete user workflows. Deployment, Vercel/DigitalOcean provisioning, cloud buckets, external messaging, and connection to the unidentified real website are outside this roadmap.

Sprint files begin with planned/not-run status. [SP-01](sprints/sp-01-evidence.md), [SP-02](sprints/sp-02-evidence.md), [SP-03](sprints/sp-03-evidence.md), [SP-04](sprints/sp-04-evidence.md), [SP-05](sprints/sp-05-evidence.md), [SP-06](sprints/sp-06-evidence.md) and [SP-07](sprints/sp-07-evidence.md) record passing local gates. [SP-08](sprints/sp-08-evidence.md) records passing scoped gates on2026-10-15 UTC; [SP-09](sprints/sp-09-evidence.md) records passing scoped file/real-antivirus gates after the Docker-ready resumption. [SP-10](sprints/sp-10-evidence.md) records technically accepted independent searches/real-offering shortlists, exact comparison and final regression/privacy gates, including retained corrected attempts and risks. [SP-11](sprints/sp-11-evidence.md) records263 backend tests/95% coverage,20 SP-11 five-target cases and25 final affected compiled checks across five targets; all36 selected Chrome cases are verified through corrected reruns, not one clean36 invocation. Visible Chrome/16 native captures, selected AFTER011 finding1, finish ship, documenter No changes and privacy/isolation/shutdown pass. [SP-12](sprints/sp-12-execution.md) adds persistent reservations and overlap guards: full284 plus focused23 cover286 backend cases,35 five-target deal/reservation checks,8 broader compiled Chrome checks and15 final affected compiled checks pass. Final headed Chrome/12 native captures, AFTER012 zero findings, finish ship/documenter No changes and privacy/isolation/shutdown pass. [SP-13](sprints/sp-13-execution.md) adds outcomes/reopening:318 backend tests/94% coverage,50 five-target plus8 broader compiled cases, headed workflow/settled refresh checks and16 native captures pass. AFTER013 zero findings, fresh UI reviewer ship/documenter No system changes, final privacy/isolation/shutdown pass. [SP-14](sprints/sp-14-execution.md) adds working-hours impact preview and visit scheduling: 349 backend tests/94% coverage, clean 65 five-target and 14 broader compiled Chrome cases, headed workflow/23 inspected native captures pass. AFTER014 has zero new findings; fresh UI finish reviewer ship, factual component documentation and final privacy/isolation/shutdown pass. [SP-15](sprints/sp-15-execution.md) adds tasks/internal reminders:372 backend tests/94% coverage,95 distinct affected five-target variants through corrected reruns plus14 broader Chrome,2 final headed cases/23 refreshed captures, AFTER015 and final privacy/isolation/shutdown pass. [SP-16](sprints/sp-16-execution.md) adds optional exact commissions/collections:46 focused backend,10 five-target cases, final Chrome2/2 and headed1/1, additive0018 and retained finance/reopen facts pass. AFTER016, scored finish fix, factual documentation and privacy/isolation/shutdown are recorded. [SP-17](sprints/sp-17-execution.md) adds scoped KPIs/Bklit chart-table pairs, attribution-safe drill-downs and nonmutating 30/14-day alerts:22 focused backend checks,10 five-target flows, final Chrome2/2 and headed1/1 pass. F1 period preservation is resolved; AFTER017 LOW1 remains unselected. Documentation/privacy/isolation/shutdown are recorded. [SP-18](sprints/sp-18-execution.md) adds M/A contact CSV preview/correction/agent mapping and durable atomic approval:61 focused backend, final compiled imports2/2 and headed1/1 pass;0019, AFTER018, fresh finish ship and privacy/isolation/shutdown are recorded. [SP-19](sprints/sp-19-execution.md) records scoped discovery/export/lifecycle/audit acceptance. [SP-20](sprints/sp-20-execution.md) adds signed local intake/durable receipt/private routing:19 focused backend checks, final compiled1/1 and native workflow/size-recovery pass;0022, AFTER020, fresh finish ship and factual documentation/privacy/isolation/shutdown recorded. SP-21 local recovery is technically accepted (see its execution ledger); SP-22 local technical acceptance passes in its recorded4-process configuration. Technical acceptance and Khalid's product review are separate. The implementing agent owns execution; no passing technical gate invents human review.

Use the states `planned → ready → in_progress → technically_accepted`, with `blocked` naming an actual unmet prerequisite. A future sprint can be fully specified while remaining planned. Before marking it ready, verify its dependency has passed its technical gate and its environment prerequisites exist. The ordered roadmap is the approved starting sequence; record any later change and its effect on dependencies.

## UI visual reference

Future UI work follows [DESIGN.md](../../DESIGN.md), the [design system](../04-design/design-system.md), Riviera branding and later owner-supplied screen references. Keep the shared shadcn/ui, Tailwind CSS and Bklit stack, implement reusable patterns first, and preserve functional/API/security contracts. The former nine-image reference is retired under D41; historical sprint evidence remains historical.

## Runtime and dependency baseline

The versions below are the approved setup baseline. SP-01 installed and locked the frontend packages and verified Node.js 24.13.1/npm 11.8.0 and browser versions in its evidence record. Python 3.14.3, PostgreSQL 18.2 and Docker were observed during planning, not integrated by SP-01; Docker's engine was stopped at that observation. Recheck the relevant environment when the next setup sprint starts.

| Area | Baseline and packages | Introduction |
|---|---|---|
| Frontend framework | Next.js 16.4.0, compatible React 19/react-dom, TypeScript, ESLint/eslint-config-next and type packages | SP-01 |
| Styling/components | Tailwind CSS 4.3.3, @tailwindcss/postcss, PostCSS, shadcn/ui CLI/source with Radix and New York style; Iconsax semantic Free assets under D33 (supersedes SP-01's Lucide); registry-required dependencies | SP-01 foundation, later D33 icon migration |
| Forms and lists | react-hook-form, @hookform/resolvers, Zod, @tanstack/react-table; use complete Tailwind classes and shared shadcn controls | SP-01 configuration; feature use SP-05 onward |
| Browser automation | @playwright/test with installed browsers, real Chrome channel and Edge channel | SP-01 |
| Backend framework/data | FastAPI 0.143.1, Pydantic 2, pydantic-settings, email-validator, Uvicorn, SQLAlchemy 2.1.4 synchronous sessions, Alembic, psycopg[binary] 3 | SP-02 |
| Python quality/test tools | pip-tools, Ruff, mypy, pytest, HTTPX, coverage reporting, Locust, trustme for local certificates | SP-02 |
| Identity/contact/file support | argon2-cffi, phonenumbers, tzdata for Windows zoneinfo, python-multipart, clamd client as required | SP-03, SP-05, SP-09 |
| Charts | Bklit registry chart source only; install required items and their reviewed dependencies through shadcn | SP-17 |
| Local antivirus | Real ClamAV service using the official Docker image, with signature cache and a pinned image digest | SP-09 |

Use npm and `package-lock.json` for the frontend. Put backend runtime/development dependencies in `pyproject.toml`; compile hash-locked runtime and development requirements with pip-tools in the Python 3.14.3 environment. Keep the application itself installed locally with its locked dependencies. Packages without an exact version above use the compatible stable version resolved during their introduction, then record and lock that exact version. Do not keep `@latest` in repeatable install scripts or substitute libraries.

The official references complement the pinned project copies: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [FastAPI virtual environments](https://fastapi.tiangolo.com/virtual-environments/), [SQLAlchemy](https://docs.sqlalchemy.org/en/21/), [Alembic](https://alembic.sqlalchemy.org/en/latest/tutorial.html), [PostgreSQL 18](https://www.postgresql.org/docs/18/), [Playwright Chrome/Edge channels](https://playwright.dev/docs/browsers), and [ClamAV Docker installation](https://docs.clamav.net/manual/Installing/Docker.html). Each sprint also contains direct topic links for its own work.

### Mandatory backend virtual environment

Creating the environment is the only setup step using the base interpreter. From `backend/`, create `.venv` with the verified Python 3.14.3 interpreter. Afterwards, every backend launch, worker, migration, package installation, test, linter, type checker, load test, certificate generator, import/export tool, seed command, and backup utility must use `.venv` explicitly. Merely assuming a previously activated shell is insufficient. Python subprocesses use `sys.executable`.

Proposed invocations from `backend/`, to register as verified only after their implementations exist:

```powershell
py -3.14 -m venv .venv
.\.venv\Scripts\python.exe -m pip install pip-tools
.\.venv\Scripts\python.exe -m piptools compile --generate-hashes --output-file requirements.lock pyproject.toml
.\.venv\Scripts\python.exe -m piptools compile --extra dev --generate-hashes --output-file requirements-dev.lock pyproject.toml
.\.venv\Scripts\python.exe -m pip install --require-hashes -r requirements-dev.lock
.\.venv\Scripts\python.exe -m pip install --no-deps -e .
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m ruff format --check .
.\.venv\Scripts\python.exe -m mypy app
.\.venv\Scripts\python.exe -m alembic upgrade head
```

The examples do not assert that files, modules, packages, or commands exist yet. Run from the stated directory, verify `sys.executable` and Python version, and record actual results in the QA register.

## Local configuration and service contracts

| Concern | Local behavior |
|---|---|
| Database | Use the already-created development database `kayrealestate` after read-only inspection. Khalid supplied its password in the [private local credentials note](local-database-credentials.md), excluded by the root .gitignore. Verify the unsupplied role/username, host and port, then populate ignored runtime configuration. Inspect application-owned tables and migrations before any change; preserve unrelated data. |
| Test isolation | Separate test, benchmark, and recovery databases, with distinct connection variables and reset guards. Test helpers must compare resolved database identities and refuse the development target. No SQLite substitute for PostgreSQL constraints/locks. |
| Origins | SP-01's standalone shell may use localhost HTTP. SP-02 establishes frontend `https://localhost:3000` and FastAPI `https://localhost:8000` before authentication; bind locally. Ordinary calls use the Next.js facade. The worker is a separate process using the backend package/environment. |
| HTTPS | Generate an ignored local CA/certificate for localhost and share it with Next.js development HTTPS and Uvicorn. Trust that CA explicitly for facade-to-API calls; never disable TLS verification globally. Isolated synthetic browser tests may handle this local certificate explicitly. Secure/HttpOnly/SameSite cookie behavior remains part of authentication tests. |
| Environment files | Frontend `.env.local` and backend `.env` are ignored; committed examples contain names only. Define DATABASE_URL, TEST_DATABASE_URL, BENCHMARK_DATABASE_URL, RECOVERY_DATABASE_URL, FRONTEND_ORIGIN, API_BASE_URL, FACADE_SECRET, local storage path, antivirus endpoint, and simulator signing secret as needed. Server secrets never use NEXT_PUBLIC_ variables. |
| File storage | Private filesystem adapter under ignored `backend/.local-data/files/`; no files under frontend public assets. Use the same typed-parent permissions, permits, quarantine and FastAPI streaming contract as the production design. Cloud storage implementation is outside these sprints. |
| Antivirus | Start the installed Docker engine for the local ClamAV service when SP-09 begins; pin the image digest, retain signatures, and verify a real clean/rejected scan. An unavailable scanner leaves files quarantined. Unit-test fakes never count as the local scanning exit result. |
| Website | A local signed form-server simulator exercises C12; it cannot choose staff roles/owners or expose contact-existence information. No connection to the unknown real website. |
| Backups | Local database/file manifest snapshots and restoration into separate database/directory targets. Retention tests use a controlled clock; local copies are not claimed as independent production disaster recovery. |
| Browser evidence | Synthetic actors and records only; omit credential displays, session tokens and private content from screenshots, traces, logs and documentation. |

## Accepted local implementation defaults

These defaults follow the user's approved plan. They make the local sprints actionable; validation required for a later real-data launch remains in the decision register.

| ID / area | Local default |
|---|---|
| H-01 / H-02 / H-03 | Known strictly positive price and at least one legal owner before an offering is available; allow multiple legal owners. Drafts may retain unknown values. A developer link alone is not ownership. |
| Q-05 | Light-only UI using the existing proposed semantic tokens, Radix/New York shadcn base/style, Iconsax under D33, and system sans-serif until licensed Satoshi files are supplied. No remote font fetch is required. |
| Q-06 | A whole-development close with any already committed child remains blocked for manager review. No invented remaining-units transaction or override that erases commitments. The UI can record a review request; final expanded commercial policy remains outside local scope. |
| Q-07 | Agency-wide company-car capacity starts at 2. Count each local clock-hour interval touched by `[start_at, end_at)`; an exact end boundary does not consume the next hour. Distinguish repeated DST hours by offset/UTC interval. Office visits bypass working times/capacity; without-company-car visits obey work times but do not consume the car limit. No vehicle/fleet allocation module. |
| Q-08 | Keep the named sidebar; use contextual tabs/panels for remaining workflows as specified in the screen map. Project units are a detail tab, and a password-change support screen exists. The route count follows implemented functionality, not an artificial quota of 19. |
| Q-01 / Q-02 / Q-03 | Use the local form simulator. Do not purge transaction/financial history; archive contacts reversibly and test the two-year security-audit policy. Actual website and international/real-data policies do not block a synthetic local prototype. |

## Required technical exit gate

Before implementation, write the focused E2E scenario using the sprint's synthetic dataset and acceptance IDs. Implement frontend/API/database behavior together for feature sprints.

For SP-02 through SP-22, execute relevant pytest unit/API and real PostgreSQL integration cases, then Playwright against the running stack, then a visible isolated Chrome session. SP-01 explicitly has no backend to test yet. Run frontend lint/typecheck/build when the frontend changes and backend Ruff/mypy/tests when the backend changes; retain the latest valid evidence for untouched boundaries. The final sprint reruns the complete applicable suite.

Every applicable exit requires:

- The sprint's observable acceptance criteria pass for the named roles and data.
- Allowed, denied, invalid, conflict, concurrent, retry and interruption cases that can affect this workflow are tested. Race tests use separate real database connections.
- Applicable French loading/empty/filtered-empty/error/denied/conflict/success states work. Check keyboard, touch emulation, 200% zoom, long labels and mobile/desktop widths.
- Standard controls use shadcn/ui, ordinary styling uses Tailwind, and charts use Bklit. Record justified custom-component/CSS exceptions.
- Every UI sprint must read the three [mandatory UI skills](ui-skill-rules.md), use design-system-ops for layout, record design-taste-frontend applicability/exclusions, and perform the antislop AFTER audit of completed UI. Record visual evidence and pending numbered findings; audit-only fixes need Khalid's selection. Preserve the approved stack and design tokens rather than adopting generic skill defaults.
- Chrome review interacts with the feature rather than merely opening a page; record role, viewport, navigation, relevant console/network errors and safe screenshots or reproducible observations.
- Fix defects and rerun affected checks. No failed check or broken earlier workflow is accepted as a passing sprint. A genuine missing prerequisite is marked blocked.
- Update contracts, traceability, migration evidence, QA commands and relevant lessons with actual behavior. Record product review independently.

### Evidence and handoff

Each sprint has an evidence table initialized to **not run**, an empty defect register explicitly stating that checks have not yet run, and a current handoff stating implementation has not started. During execution record the command, working directory, executable/environment, fixture/build/migration versions, timestamp, case/actual result and artifact location. Protect sensitive artifacts and do not add them to documentation as raw data.

Intended frontend scripts are `dev`, `lint`, `typecheck`, `build`, `test:e2e`, and `test:chrome`. `test:chrome` launches the installed Chrome channel headed in an isolated synthetic-data context; `test:e2e` runs automated flows. SP-01/02 must create and verify these commands before any later sprint cites them as executable evidence.

The local `next build` / production-mode smoke check is a build-quality check, not a deployment sprint. Browser mobile profiles and WebKit tests on Windows do not constitute actual iPhone/Safari testing; record that limitation.

## Completion criterion

Documentation structure/links/IDs and Mermaid/JSON consistency can be checked independently with `powershell -NoProfile -File docs/03-planning/validate-sprints.ps1` from the project root. This read-only documentation check does not run or imply any application test.

SP-22 links each AT-01–AT-41 case/variant to passed local evidence or an explicitly identified real-device/real-service limitation outside the local scope. All C01–C14 local workflows are usable, state survives restart, real local PostgreSQL and antivirus/file paths are exercised, and the local website simulator is working. No mock responses remain in completed UI workflows.

Run the specified isolated benchmark (100 accounts and 100 concurrent users, 200,000 contacts, 20,000 physical properties including units), record load mix/duration/hardware and p95, and meet the 1-second ordinary API / 2-second dashboard targets before technical acceptance. Measure local RPO ≤ 1 hour and RTO ≤ 4 hours in recovery. Never promise these results before measurement or silently reduce the workload.

Final handoff includes repeatable installation/start/test/bootstrap/backup/restore instructions, lockfiles and environment names, complete evidence, known device limitations, and Khalid's independent product-review status. SP-01/02 foundations and SP-03 identity checks have passed; the full-product completion gate above is not yet met.

