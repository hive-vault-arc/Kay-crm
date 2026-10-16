# KEPVY for KAY: specification index

Production configuration and the automatic/manual CI split are documented in
[production settings and release gates](docs/06-delivery-and-operations/production-settings-ci.md).
Automatic CI does not execute database/browser integration; those preserved
manual suites remain mandatory before real-customer release.

Approved V3 is now implemented across the existing frontend, including unpictured
workflows. The [route/surface checklist](docs/04-design/ui-reference/approved-v3/coverage.md)
maps29 route files and168 contextual sites; the
[execution ledger](docs/04-design/ui-reference/approved-v3/execution.md) records
actual passing checks, corrected failures and the focused regression selection.
See [implemented system](docs/04-design/ui-reference/approved-v3/implemented-system.md)
for active tokens/components and deliberate asset adaptations. Backend sources,
business contracts and original fields are preserved. Human product acceptance,
physical devices and deployment are not inferred; DESIGN.md's merge choice is
still pending. Earlier sprint evidence below is historical, not fresh V3 evidence.

SP-22 local technical acceptance passes. Its [execution ledger](docs/03-planning/sprints/sp-22-execution.md)
retains corrected failures and current gates; [AT01–41 map](docs/03-planning/sprints/sp-22-acceptance-map.md),
[executable API catalogue](docs/04-design/api-catalogue-local.md) and
[repeatable local procedure](docs/06-delivery-and-operations/local-final-acceptance.md)
make the handoff reproducible. The100-user benchmark passes with explicit4 API
processes: ordinary p95≤630ms/dashboard1.315s. Default1 failed and is not the
measured configuration. Product/design review, broader V3 fidelity, physical
devices, real website and production are not approved by local acceptance.

SP-21 implements protected coherent PostgreSQL/file/code restore points,
30-day local retention and guarded isolated recovery with session/permit
revocation and replay-safe workers. [Execution](docs/03-planning/sprints/sp-21-execution.md)
records the scoped checks and measured synthetic laptop RPO/RTO;
[operator runbook](docs/06-delivery-and-operations/local-backup-recovery.md)
documents commands and same-account/current-authority opening limitations.
No production/offsite or total-source-loss certification is claimed.

SP-20 implements the signed local synthetic website form, anonymous durable
receipt/status, replay-safe PostgreSQL worker and received Leads under current
private scope. [SP-20 execution](docs/03-planning/sprints/sp-20-execution.md)
records scoped passing gates. [Local operation](docs/04-design/website-intake-local.md)
requires ordinary bootstrap/active-agent source setup, not seeded staff.
The actual website and Khalid's product/design review remain pending; SP-22's
local technical acceptance is recorded separately.

SP-19 adds contextual scope-safe search, whole-filter M/A CSV exports with
private protected delivery and durable status, recoverable inventory lifecycle
and Dashboard audit access. [SP-19 execution](docs/03-planning/sprints/sp-19-execution.md)
records the scoped technical result; [contract](docs/04-design/discovery-contract.md)
defines permissions, retries, retention and measured indexes. SP-22,
full-product acceptance and Khalid's product review remain pending.

Status: SP-01–SP-22 locally technically accepted; product reviews pending
Date: 2026-10-16  
Confirmed decisions: one KAY team, core scope C01–C14, French product interface, MAD, and `Africa/Casablanca`.  
Technical proposals: the contracts in `docs/04-design` and procedures in `docs/06-delivery-and-operations`.  
References: [software engineering lifecycle](software_engineering_lifecycle.md), notes in `KV/Knowledge/Design` and `KV/Knowledge/Engineering`.

This folder turns product decisions into testable contracts. Field names, role codes, state codes, and API identifiers remain in English. A confirmed rule records the direction given for KAY; a technical proposal needs implementation testing; an assumption still needs a decision. The local frontend setup and its checks are documented in [SP-01 evidence](docs/03-planning/sprints/sp-01-evidence.md). No production deployment is claimed.

## Run the local stack

Repository publication, CI checks and protected-main workflow:
[GitHub CI](docs/06-delivery-and-operations/github-ci.md), with
[actual execution results](docs/06-delivery-and-operations/github-ci-execution.md).

For current copy/paste PowerShell commands, optional local-CA browser trust,
first login, worker and complete project-service shutdown, use
[Local startup and shutdown](docs/06-delivery-and-operations/local-startup.md).
It records the warning-free HTTPS launcher and Windows socket-loop repairs;
actual checks and remaining limits are linked separately.

SP-11 adds the French Affaires list, single explicit create form, ordinary
pipeline, next actions, separate customer proposals, true-actor history and
private deal files. [Its execution ledger](docs/03-planning/sprints/sp-11-evidence.md)
records the current technical gates; product review remains Khalid's. Creating
an affaire preserves the Lead; an accepted proposal never closes/reserves it.

SP-12 extends that same detail with persistent physical-offering reservations,
explicit reasoned release and same-kind whole-programme/unit overlap protection.
Current scoped stock, reviewable versions and safe conflict recovery are visible
without sharing another contact's deal. [SP-12 evidence](docs/03-planning/sprints/sp-12-execution.md)
records passing local gates. [SP-13](docs/03-planning/sprints/sp-13-execution.md) adds explicit outcomes, guarded reopening and external stock results; its scoped local technical gates pass, with product review independently pending.

SP-14 adds administrator working-hours settings with impact preview and the
French visit calendar/mobile agenda. Staff can book and reschedule all three
visit types, distinguish explained appointment overlap from hard work/lunch/car
capacity rejection, and see colleagues' busy intervals without private details.
[SP-14 execution](docs/03-planning/sprints/sp-14-execution.md) records passing
local technical gates; product review is independently pending.

SP-15 implements contextual tasks, today's/overdue dashboard work, a personal
internal inbox/read state and durable visit/task reminders on the existing worker.
[SP-15 execution](docs/03-planning/sprints/sp-15-execution.md) records actual
passing local technical gates. Product review remains pending; no external send.

SP-16 adds the manager/administrator Finance tab: optional exact fixed/percentage
commissions, explicit recognition, partial receipts and original-preserving
corrections with derived balances and reopening review. Normal closing stays
commission-free. [SP-16 execution](docs/03-planning/sprints/sp-16-execution.md)
records passing focused local technical gates; product review is independently
pending.

SP-17 adds role-scoped current/period KPIs, three real Bklit chart/table pairs,
authorized numbered drill-downs and 30/14-day inventory/deal exceptions without
automatic state changes. [SP-17 execution](docs/03-planning/sprints/sp-17-execution.md)
records focused technical acceptance; optional mobile density polish and Khalid's
product review remain pending. SP-22 tools, repairs and local gates are verified; product/design approval remains pending.

SP-18 adds M/A-only contact CSV import inside Leads: private upload, numbered
errors/skips, corrected files, explicit row/fallback agents and whole-batch
approval with permanent result recovery. [SP-18 execution](docs/03-planning/sprints/sp-18-execution.md)
records focused technical acceptance, migration0019 and isolation/privacy closure.
Contacts only: it never creates inventory, enquiries or deals. Product review
remains pending; this does not mean the complete CRM is finished.

Follow the [backend instructions](backend/README.md) to install the Python 3.14.3
venv/hash locks, configure the authorized local databases and shared HTTPS
certificates, inspect/migrate, and start FastAPI on `https://localhost:8000`.
From `frontend/`, run `npm ci` and `npm run dev`, then open `https://localhost:3000`.
The French authenticated dashboard checks real database readiness through the
same-origin facade and explains failures/recovery. First create your administrator
from an interactive terminal in `backend/` with `scripts/kay.ps1 -Task bootstrap`.
Choose your own password at the hidden prompts; do not send it in chat or pass it
in arguments/environment/files. No account is seeded by installation or tests.
Sign in at `https://localhost:3000`; administrators can open Paramètres → Tous les
utilisateurs to manage staff and their one-time credential handoff. Prospects now
supports scoped Leads, contact identity, duplicate confirmation, editing, filters,
pages and columns. Contact tabs now include authored history/assignments, with
manager collaboration/transfer, archive/restore and authorized merge previews.
Projects now adds standalone villa/house/apartment/land inventory, separately
protected legal owners, sale/rental campaigns and availability history. SP-07's
scoped technical gates pass in its [execution record](docs/03-planning/sprints/sp-07-evidence.md); product review remains pending.
SP-08 adds development hierarchy, real units, reusable types, optional briefing
and separate whole-programme offers; its scoped technical gates pass in
[SP-08 evidence](docs/03-planning/sprints/sp-08-evidence.md).
KPIs and later core modules remain planned. See
[SP-06 evidence](docs/03-planning/sprints/sp-06-evidence.md),
[SP-05 evidence](docs/03-planning/sprints/sp-05-evidence.md), [SP-04 evidence](docs/03-planning/sprints/sp-04-evidence.md), the [frontend instructions](frontend/README.md),
[bootstrap runbook](docs/06-delivery-and-operations/admin-bootstrap.md) and
[SP-03 evidence](docs/03-planning/sprints/sp-03-evidence.md) for the verified boundary.

For every frontend feature, the mandatory stack is **shadcn/ui for standard UI components, Tailwind CSS for styling, and Bklit UI for charts**. KAY-specific components and narrowly scoped custom CSS are allowed when needed; another component kit, CSS framework, or chart library is not an implicit alternative. See [decisions D15–D17](decisions.md) and [coding standards](docs/01-working-agreements/coding-standards.md).

## Reading guide

| Question | Document |
|---|---|
| What is the product and its scope? | [Product brief](Project-brief.md), [C01–C14 scope](core-scope.md), [decisions](decisions.md) |
| What knowledge and engineering rules should the team use? | [Working agreements](docs/01-working-agreements/README.md), [KV adoption map](docs/01-working-agreements/knowledge-adoption.md), [coding standards](docs/01-working-agreements/coding-standards.md) |
| How should the future codebase and sprints be organized? | [Repository structure](docs/01-working-agreements/repository-structure.md), [backlog and sprint method](docs/03-planning/README.md) |
| Where are the 22 approved local sprint specifications? | [Ordered sprint index and AT coverage](docs/03-planning/sprints/README.md), [local runtime/defaults/exit gates](docs/03-planning/local-roadmap.md), [ordered product backlog](docs/03-planning/backlog.md) |
| What do the terms mean, and what rules apply? | [Glossary](docs/02-requirements/glossary.md), [business rules](docs/02-requirements/business-rules.md) |
| Who can do what, and in which workflow? | [Permissions](permissions.md), [workflows](workflows.md) |
| What data, components, and interfaces are proposed? | [Data model](docs/04-design/data-model.md), [architecture](docs/04-design/architecture.md), [API contracts](docs/04-design/api-contracts.md) |
| Which screens and routes are currently named? | [Screen map and navigation contract](docs/04-design/screen-map.md) |
| Which mandatory UI component source does KAY use, and how is it installed? | [shadcn/ui working guide](docs/04-design/ui-components.md) |
| How should the interface be styled? | [Tailwind CSS styling guide](docs/04-design/styling.md) |
| What visual system should the KAY workspace follow? | [Approved V3 screenshots and route/extension guide](docs/04-design/ui-reference/approved-v3/README.md), [design system](docs/04-design/design-system.md), [design entry point](DESIGN.md), [KAY UI tokens](branding/kay-ui-tokens.json), and [branding assets](branding/README.md) |
| Which mandatory chart library and chart types does the dashboard use? | [Bklit UI chart guide](docs/04-design/charts.md) |
| How are data protected and retained? | [Security and privacy](docs/04-design/security-and-privacy.md) |
| How will the requirements be verified? | [Acceptance scenarios](docs/05-quality/acceptance-tests.md), [traceability](docs/05-quality/traceability.md) |
| How will the product be released, bootstrapped, and restored? | [Release and recovery](docs/06-delivery-and-operations/release-and-recovery.md), [first-administrator bootstrap and initial credentials](docs/06-delivery-and-operations/admin-bootstrap.md) |
| How should coding agents verify and hand off work? | [AGENTS.md](AGENTS.md), [harness](docs/HARNESS.md), [QA command register](docs/QA_COMMANDS.md), [security check](docs/SECURITY_CHECK.md), [lessons](docs/AGENT_LESSONS.md) |

Standalone Mermaid sources live in [diagrams](diagrams/). Each document that uses a diagram explains it and includes a synchronized copy of the Mermaid code.

The full pinned [Next.js 16.4.0 offline reference](docs/reference/nextjs/16.4.0/README.md) is third-party documentation, separate from this KAY specification.
The [Python 3.14.3 offline reference and proposed code-quality guide](docs/reference/python/README.md) serve the same reference purpose for the future backend.
The pinned [FastAPI 0.143.1 offline reference](docs/reference/fastapi/0.143.1/README.md) contains the official English documentation source and examples for the proposed API framework.
The pinned [shadcn/ui offline reference](docs/reference/shadcn-ui/2026-10-14-954ce953/README.md) contains the official documentation source, component source, examples, and site assets.
The pinned [Bklit UI offline reference](docs/reference/bklit-ui/2026-10-14-b9302b14/REFERENCE.md) contains its chart documentation, component source, registry JSON, and chart previews.
The [Tailwind CSS 4.3.3 reference](docs/reference/tailwindcss/4.3.3/README.md) provides a complete official-page index and KAY-specific notes. The upstream website text is not mirrored because its source is not open-licensed.
The [Iconsax library reference](docs/reference/iconsax/README.md) collects official navigation, installation/API notes, Next.js integration cautions, licensing, and KAY adoption checks. It is documentation only; the current Lucide choice and application dependencies are unchanged.

## Sources and open decisions

The [lifecycle guide](software_engineering_lifecycle.md) structures requirements, models, tests, and evidence. The [knowledge adoption map](docs/01-working-agreements/knowledge-adoption.md) records which `KV/Knowledge` and `KV/Agentic Coding` methods were adapted into KAY and which remain reference-only or out of scope. The vault notes are not KAY product rules or runtime dependencies. Khalid's later decisions supersede older wording in the brief.

The approved [local roadmap](docs/03-planning/local-roadmap.md) selects implementation defaults for H-01/H-02/H-03, Q-05/Q-07/Q-08 and the conservative Q-06 close behavior. The actual website, expanded partial-development policy, real-data retention and international flows remain later validations. Q-04's local bootstrap/authentication are implemented in SP-03 and staff administration/handoff in SP-04; actual administrator execution and real staff delivery remain human operations. O17 is part of C04. SP-05 adds Leads/contact identity, SP-06 ownership/history, SP-07 standalone inventory and SP-08 development hierarchy (technically accepted); SP-09 protected files/real antivirus and SP-10 searches/shortlists are technically accepted in their recorded scope; SP-11 deal creation/pipeline and SP-12 reservations/overlap are technically accepted at their recorded local boundaries; SP-13 outcomes/reopening and SP-14 working hours/visit scheduling are technically accepted locally; SP-15 tasks/internal reminders are technically accepted at their recorded local boundary; SP-16–SP-21 are technically accepted in their recorded local scope; SP-22 local technical acceptance passes in its recorded4-process configuration. See [decisions](decisions.md) and the [QA register](docs/QA_COMMANDS.md) for the exact boundary of evidence and product review.

SP-09 adds private contact documents and team-readable property/development
attachments, direct FastAPI transfers, immutable quarantine and real local ClamAV.
Start its Docker service and separate explicit-venv worker using the
[backend runbook](backend/README.md#protected-files-and-real-antivirus-sp-09).
Only authorized clean files can open; scanner failure stays quarantined. See
[SP-09 evidence](docs/03-planning/sprints/sp-09-evidence.md) for actual results and
the scoped technical acceptance and remaining risks, not full CRM or production completion.

SP-10 adds independent contact/Lead searches, typed required/preferred/unknown
criteria, exact original/annual MAD budgets and manual shortlists of real
standalone, physical-unit or entire-programme offerings. Open Contact → Recherches
or the Lead qualification section. Selection does not reserve inventory; explicit
deals and reservations are implemented in SP-11/12. Follow [SP-10 evidence](docs/03-planning/sprints/sp-10-evidence.md)
for current gate results and independently pending product/design review.
