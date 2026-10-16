# Proposed KAY repository structure

Status: foundations, identity, contacts/history and SP-07/SP-08 inventory technically accepted; later modules proposed
Date: 2026-10-15  
Confirmed decisions: Next.js frontend with shadcn/ui, Tailwind CSS, and Bklit UI; FastAPI modular monolith, PostgreSQL, a separate worker process, and private file storage.  
Technical proposal: the source layout and ownership rules below, to be refined when the first application slice is created.  
References: [architecture](../04-design/architecture.md), [scope](../../core-scope.md), [component guide](../04-design/ui-components.md), [styling](../04-design/styling.md), [coding standards](coding-standards.md), KV `Agentic Coding/Harness/Project Agent Operating Playbook.md` and `Knowledge/Engineering/Software Architecture Patterns.md`.

SP-01 created `frontend/`, locked dependencies/checks and root Git metadata. SP-02
adds `backend/app/main.py`, settings/runtime, health/errors, `app/db/`, local CLI
tools, Alembic foundation, tests, `.venv`, manifest and two hash locks. Frontend API
facade, status island and HTTPS/test-process scripts now exist. Chart/business
modules, worker and infra paths below remain future targets. Tailwind's entrypoint is
`frontend/src/app/globals.css` and the token adapter is `frontend/src/lib/theme.ts`.
Create only directories required by a slice. SP-03/SP-04 use `backend/app/identity`
and `frontend/src/features/auth` / `features/users`; SP-05 uses
`backend/app/contacts` (access/contracts/queries/commands/projections/router/models)
and `frontend/src/features/contacts`. These direct modular packages are the actual
layout, not the future `app/modules` sketch below. `app/db/models.py` registers
cross-module metadata for HTTP and CLI; revisions0002–0004 are reviewed DDL.
Browser E2E/review/helpers and the private process supervisor remain under
frontend/tests and frontend/scripts. No worker or infrastructure directory is
created just because it appears in the proposed tree.

SP-06 extends the existing contacts package, not a parallel CRM service:
ownership contracts/preview/commands/router, eligibility, merge and history models/
queries. Revisions0005/0006 carry history/origin/alias constraints and ownership
guard refinement. Frontend tabs, ownership impact/controls, history and enquiry
assignment remain under features/contacts, with one shared shadcn-derived Tabs
primitive. Synthetic private IPC explicitly decodes UTF-8. Future module links
are registered in the same merge path; no placeholder modules/tables are created.

SP-07/SP-08 use `backend/app/inventory` and `frontend/src/features/inventory`:
physical assets/campaigns plus real development structure, types, safe briefing,
owner links, typed immutable history and retry receipts. Revisions0007–0009 own
these tables/guards. Hierarchy support stays within inventory; contact merge
extends its existing policy/preview/service. Shared owner/campaign/history and
version comparison components serve both target levels. No speculative file,
deal, reservation, stock-outcome, worker or infrastructure module is created.
See [SP-08 execution](../03-planning/sprints/sp-08-evidence.md).

```text
Kayrealestate/
  AGENTS.md
  README.md
  decisions.md
  core-scope.md
  permissions.md
  workflows.md
  docs/
    01-working-agreements/    project rules and knowledge adoption
    02-requirements/           glossary and business rules
    03-planning/               backlog and sprint specifications
    04-design/                 architecture, API, data, security, UI
    05-quality/                acceptance tests and traceability
    06-delivery-and-operations/ release and recovery
    reference/                 pinned third-party references
    HARNESS.md
    QA_COMMANDS.md
    SECURITY_CHECK.md
    AGENT_LESSONS.md
  diagrams/                   synchronized Mermaid sources
  branding/                   supplied brand assets
  frontend/                   implemented SP-01 shell foundation
    src/app/                   Next.js routes, layouts, route boundaries
    src/features/              domain UI: contacts, inventory, deals, etc.
    src/components/ui/         shadcn/ui source copied by its CLI
    src/components/charts/     Bklit UI chart source copied by its registry
    src/components/shared/     KAY-wide composed UI patterns
    src/lib/api/               typed API client and error mapping
    src/lib/format/            MAD, date, phone display helpers
    src/app/globals.css        Tailwind entrypoint / semantic utilities
    src/lib/theme.ts           root branding JSON to CSS variable mapping
    tests/                     component and E2E tests as selected
  backend/                    implemented SP-02 foundation
    .venv/                    mandatory ignored Python runtime/tools
    .local-data/              ignored private local files/certificates/backups
    app/main.py               FastAPI composition root
    app/settings.py           server-only configuration
    app/runtime.py            pinned venv/version guard
    app/health.py             safe live/ready endpoints
    app/cli/                  local setup, inspect, serve and HTTPS smoke
    app/cli/bootstrap_admin.py future one-time server-local first-admin script
    app/modules/              identity, contacts, requirements,
                              inventory, deals, schedule, finance,
                              imports, intake, reporting, files, audit
    app/shared/               cross-module types and infrastructure
    app/db/                   session and transaction setup
    app/worker/               outbox/job process using shared domain code
    alembic/                  reviewed schema migrations
    tests/                    unit, API, PostgreSQL, concurrency tests
    pyproject.toml            backend and tool configuration
    requirements.lock         hash-locked runtime packages
    requirements-dev.lock     hash-locked runtime and development tools
    scripts/kay.ps1           explicit-venv setup/start/test/migration wrappers
  infra/                      only after deployment configuration is real
```

The worker is a separate process, not a second copy of business logic. It imports the backend's domain/application modules and has its own entrypoint. The shared database belongs to the backend. Next.js never writes tables directly and does not decide permissions, stock, or financial results. Use the [architecture](../04-design/architecture.md) for the authoritative boundaries. The frontend tree preserves the mandatory shadcn/ui, Tailwind CSS, and Bklit UI choices; custom KAY components and scoped CSS exceptions do not create alternate component or styling stacks. The actual Bklit target path follows the selected `components.json` configuration.

The future `inventory` feature/module owns standalone properties and development hierarchy together, not one backend service per block or floor. Reuse shared UI controls for scope labels, statuses, and money, while keeping development explorer, unit-type editor, and unit availability workflows inside the inventory feature. Deal routes call the inventory module's checked reservation/close operations. Do not duplicate overlap rules in frontend view models or separate project and unit tables without a domain reason.

## Ownership and reuse

| Location | Belongs there | Does not belong there |
|---|---|---|
| `frontend/src/app` | Routing, layout composition, route-level loading/error boundaries | Long data workflows, direct SQL, scattered API implementations |
| `frontend/src/components/ui` | Reviewed shadcn/ui primitives copied into KAY | Business-specific contact or deal logic |
| `frontend/src/components/charts` | Reviewed Bklit UI registry components and KAY chart wrappers | A parallel chart-library implementation |
| `frontend/src/components/shared` | Reused KAY controls with the same meaning across features, such as a permission-aware empty state or money display | A one-off component forced into a generic API |
| `frontend/src/features/<domain>` | Domain screens, forms, tables, hooks, and view models | Cross-domain primitives or backend-only invariants |
| `frontend/src/lib/api` | Typed calls, auth/session handling, normalized API errors | Business authorization decisions |
| `backend/app/modules/<domain>` | Routes, schemas, services, repositories, domain rules, tests for one domain | Unrelated domains mixed in a large utility module |
| `backend/app/shared` | Small cross-cutting infrastructure and types with clear owners | A dumping ground for domain logic |

Extract a shared component when the same interaction and semantics recur, or when a stable primitive supports several features. Do not share solely because two screens have similar markup today. Keep a feature's component local until reuse is real. Cross-module backend calls use explicit service interfaces; avoid importing another module's repository or table mutation code from a route.

Do not add a cross-language `packages/shared` directory by default. TypeScript and Python cannot directly share runtime code. Treat the versioned API contract as the boundary, and consider generated client types only after the API/OpenAPI workflow is verified. Add Redis, Kafka, search engines, Kubernetes, or a separate frontend state framework only for a measured or required capability, not as a starter scaffold.

## Planning and evolution

Use the [approved 22-sprint index](../03-planning/sprints/README.md) and [local roadmap](../03-planning/local-roadmap.md) for the selected local runtime, venv and service boundaries. When implementation starts, commit manifests, lockfiles, tests, `.env.example` without values, and local quality scripts in the same slice that needs them. CI/cloud provisioning is outside this local roadmap. Update this proposal and [QA commands](../QA_COMMANDS.md) to describe the structure and commands that actually exist.
