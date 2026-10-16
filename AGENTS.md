# KEPVY for KAY: agent instructions

SP-19 implements scoped cross-domain search/counts, M/A filtered CSV export jobs
on the existing PostgreSQL worker/private transfer flow, physical archive/restore
and contextual audit. See [contract](docs/04-design/discovery-contract.md) and
[execution](docs/03-planning/sprints/sp-19-execution.md). Security-only retention
CLI is implemented but must not be executed on real/development data without
explicit approval; protected business/finance history is preserved.

Status: active project working rules for documentation and future implementation  
Date: 2026-10-16

## Read first

1. [Project index](README.md), [scope](core-scope.md), and [decisions](decisions.md).
2. For the task's domain, read the relevant [business rules](docs/02-requirements/business-rules.md), [permissions](permissions.md), [workflows](workflows.md), [architecture](docs/04-design/architecture.md), [data model](docs/04-design/data-model.md), [API contract](docs/04-design/api-contracts.md), and [acceptance scenarios](docs/05-quality/acceptance-tests.md).
3. Read [engineering rules](docs/01-working-agreements/coding-standards.md), [project harness](docs/HARNESS.md), [QA command register](docs/QA_COMMANDS.md), and [lessons](docs/AGENT_LESSONS.md). Read [security check](docs/SECURITY_CHECK.md) for any security-sensitive change.
   For identity or deployment work, also read the [first-administrator bootstrap runbook](docs/06-delivery-and-operations/admin-bootstrap.md).
4. For visual/UI work, read [DESIGN.md](DESIGN.md), the [KAY interface design system](docs/04-design/design-system.md), and the [screen map](docs/04-design/screen-map.md) before choosing tokens, routes, or shared components.
   Open the nine [Approved V3 screenshots and route/extension guide](docs/04-design/ui-reference/approved-v3/README.md). D32 makes them the approved appearance for all existing screens, including unpictured pages derived from shared patterns; business contracts, permissions and accessibility still prevail. No historical sprint evidence implies V3 implementation acceptance.
   Also read all three installed skills linked in the [mandatory UI skill rules](docs/03-planning/ui-skill-rules.md). Use design-system-ops for system-first layout; assess design-taste-frontend's scope explicitly; preserve the user's antislop AFTER timing. Record skill applicability and visual/audit evidence, not just a claimed skill name.
5. For local implementation, read the [approved local roadmap](docs/03-planning/local-roadmap.md), [sprint index](docs/03-planning/sprints/README.md), and current sprint specification. The owner is the implementing agent; technical acceptance and Khalid's product review are separate.

SP-01 created the local `frontend/` shell and root Git repository. SP-02 adds `backend/`, Python 3.14.3 `.venv`, hash locks, guarded PostgreSQL/Alembic setup and local HTTPS health/facade integration. GitHub CI is configured in `.github/workflows/ci.yml`; follow [publication and main-branch policy](docs/06-delivery-and-operations/github-ci.md) and [actual execution](docs/06-delivery-and-operations/github-ci-execution.md). Main promotion requires the real aggregate check, not a claimed local pass. Use actual commands and latest evidence in `docs/QA_COMMANDS.md`; do not generalize scoped verification into completed CRM features or backups.

SP-05 adds canonical contacts and separate enquiries (Leads), scoped list/detail/
edit/atomic create, private-phone denial and ID-only column preferences. No real
records are seeded. SP-06 adds ownership/collaboration, immutable true-actor
history, archive/restore and authorized merge. SP-11 adds explicit contact-scoped
deals, ordinary pipeline, separate proposals and inherited private deal files;
SP-12 adds persistent reservations, explicit release and overlap guards. SP-13
adds explicit outcomes, guarded reopening and manager external stock results;
SP-14 adds administrator working-hours impact preview, scoped visit lifecycle,
desktop calendar/mobile agenda and safe colleague free/busy. Backend Casablanca
civil-time resolution is authoritative. SP-15 adds contact/deal tasks, internal
inbox/read state, unresolved visit follow-up and durable reminders on the existing
PostgreSQL worker; its execution record verifies the locally accepted boundary.
SP-16 adds optional M/A-only commissions/collections; SP-17 adds authoritative
role-scoped reporting, attribution-safe Bklit charts/drill-downs and nonmutating
30/14-day alerts. Read [the report contract](docs/04-design/dashboard-local.md)
before extending counts; current stock/portfolio and selected-period outcomes/
activity are distinct. [SP-17 execution](docs/03-planning/sprints/sp-17-execution.md)
records necessary-only verification, not full-product or human design approval.
SP-18 adds M/A-only atomic contact CSV import inside Leads. Read
[the import contract](docs/04-design/contact-import-local.md) and
[execution](docs/03-planning/sprints/sp-18-execution.md) before extending it.
Preserve exact CSV/row identity, current authority, immutable original import
provenance, explicit agent mapping, whole-batch commit and permanent same-key
result replay. New batch links must declare their merge/reconciliation policy.
Read the current execution records and concrete scheduling contract for verified
boundaries. Future linked modules must extend the existing merge
service and its link policy together; unknown links intentionally fail closed.
Both pytest and the browser supervisor hold the same
fail-closed isolated-database lease before fixture cleanup; keep suites serial.

SP-03 adds local interactive bootstrap and real database-backed authentication.
No real/default administrator is seeded. Use the bootstrap runbook, current
sprint evidence and QA register; later business/file/backup modules remain
out of scope until their own sprints. Auth browser checks disable traces, videos,
automatic screenshots and AI failure snapshots, strip matcher input contexts and
capture only empty fields or safe post-login synthetic UI. Never preserve raw
password/cookie/token diagnostics, including generated test failure artifacts.

SP-04 adds administrator-only Settings/user administration, one-time temporary
credential display, confirmed in-person handoff and current-password-protected
reset. No real staff are seeded. Follow the account API/runbook and current
SP-04 evidence for versions, safe retry conflicts, last-administrator protection
and session revocation. Test-only supervisor cleanup refuses development and
non-synthetic accounts; do not run database-writing pytest concurrently with
browser fixtures on the same isolated target. Real handoff and product/design
review remain human operations, not inferred from synthetic tests.

## Source of truth and scope

- Follow the user's current task and explicit decisions. For project facts, use `decisions.md`, then the scope/permissions/workflows and numbered requirements, then their design and test contracts. Reference snapshots and KV notes supply methods, not new KAY product decisions.
- Keep C01-C14 as the approved core. O17 has been promoted into C04: development → optional block/floor → physical unit, with reusable unit types and both project/unit offerings. The other O01-O23 future options are not authorized implementation scope. Read Q-06 before specifying partly committed whole-development transactions.
- The UI is French; technical identifiers may remain English. KAY is one team, with MAD and `Africa/Casablanca`.
- The approved 22-sprint roadmap is local only: separate `frontend/` and `backend/`, the existing PostgreSQL database plus isolated test targets, private local file storage, real ClamAV, and a signed local website simulator. Cloud/deployment procedures are future reference, not work authorized by these sprints. Use the accepted local defaults even where older specifications still require later real-data validation.
- Backend execution always uses `backend/.venv`: launches, workers, migrations, installs, pytest, Ruff, mypy, Locust, seed/backup/certificate utilities, and Python subprocesses. Use its explicit interpreter/executable and `sys.executable`; do not rely on global Python or an assumed activated shell. Only creation of the venv uses the base Python 3.14.3 interpreter.
- Preserve the confirmed stack and contracts. Do not replace revocable PostgreSQL sessions with generic JWT advice, numbered pages with cursor pagination, FastAPI-mediated private file transfer with public URLs, or the PostgreSQL outbox with a new broker merely because a reference note describes those options.
- Mandatory frontend stack for every UI slice: use shadcn/ui as the source of standard components, Tailwind CSS as the styling system, and Bklit UI for every chart. Build KAY-specific components when needed, reusing shadcn/ui primitives where applicable; narrowly scoped custom CSS is allowed when Tailwind utilities are inadequate. Do not silently substitute another component kit, CSS framework, or chart library. If a required chart cannot be built by composing or extending Bklit, ask KAY for a decision before changing libraries. See [coding standards](docs/01-working-agreements/coding-standards.md), [component guide](docs/04-design/ui-components.md), [styling guide](docs/04-design/styling.md), and [chart guide](docs/04-design/charts.md).
- Mark any new assumption or trade-off as a proposal. Do not silently turn it into a confirmed business rule.

## Work loop

Define the smallest testable outcome and acceptance criteria. Inspect related files before editing. Make scoped changes, verify them with the applicable real commands and cases, fix failures, then report evidence and remaining risks. If two or three focused fix/rerun cycles bring no new information, stop and explain the blocker rather than broadening scope.

Implement future work as vertical product slices: backend rule, data change, API, UI states, tests, and documentation together when relevant. Preserve unrelated user changes. Update contracts and traceability when behavior changes. Prefer the shared component and module boundaries in [coding standards](docs/01-working-agreements/coding-standards.md).

## Gates and approvals

- Use [QA commands](docs/QA_COMMANDS.md) for commands that actually exist. For frontend changes, inspect desktop and mobile behavior, keyboard/touch, zoom, and loading/empty/error/denied states. For data/API changes, cover allowed, forbidden, invalid, concurrent, interrupted, and retry cases.
- For each local feature sprint, run relevant Python/PostgreSQL tests, Playwright against the real running stack, and an interacting visible isolated Chrome session; fix failures and regressions before progression. SP-01 explicitly has no backend to test. Passing the documented technical gate authorizes the next in-scope sprint without another routine approval. Record product review pending until Khalid actually reviews it.
- Run the [security check](docs/SECURITY_CHECK.md) when work touches identity, permissions, records, files, imports, finance, integrations, logs, secrets, migrations, or production behavior. Backend authorization is authoritative.
- Stop for a decision before production access, real-data import/export, external messaging, destructive or irreversible data changes, spending, or a material change to approved scope or architecture. Supplied local development credentials may be used for the authorized local workflow without repetitive approval, but never exposed in outputs or committed. Normal in-scope implementation and read-only checks do not need another approval.
- Never put credentials, private client records, raw contact data, or real documents in prompts, commits, examples, screenshots, logs, or agent lessons. Use synthetic data.
  Khalid's supplied PostgreSQL development database is `kayrealestate`. Its password is held only in the authorized [private local credentials note](docs/03-planning/local-database-credentials.md), excluded by the root .gitignore, then in ignored runtime configuration. This local note is the narrow exception to a no-secrets-in-documentation rule; do not copy its secret into tracked docs or evidence. Verify the unsupplied role/host/port and use separate test/benchmark/recovery targets.

## Handoff

Report: what was found, what changed, what was verified (with commands/results), what could not be verified, and what remains. Include security evidence when applicable. Save a repeatable mistake or correction in [agent lessons](docs/AGENT_LESSONS.md); promote a stable high-risk rule here only after it is justified.

<!-- antislop:start -->
## antislop

For UI work, read the installed [antislop core](<C:/Users/khali/.codex/skills/antislop/SKILL.md>) and the [KAY UI skill rules](docs/03-planning/ui-skill-rules.md). Khalid already chose AFTER: audit completed UI and obtain his selection of numbered findings before audit-only fixes. Do not reopen that timing question unless he changes the choice. The requested core pointer is registered here; no optional antislop bundle is installed by this documentation update.
<!-- antislop:end -->
