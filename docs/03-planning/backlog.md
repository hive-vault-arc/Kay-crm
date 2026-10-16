# KAY ordered local product backlog

Status: BL-01–BL-21 technically accepted; BL-22 unstarted; product reviews pending
Date: 2026-10-16  
Confirmed decisions: complete local C01–C14 CRM in 22 ordered sprint specifications; priority equals execution sequence.  
Owner: implementing agent; product acceptance authority: Khalid.  
References: [sprint index](sprints/README.md), [local roadmap/defaults/gates](local-roadmap.md), [scope](../../core-scope.md), [business rules](../02-requirements/business-rules.md), [traceability](../05-quality/traceability.md), and [planning method](README.md).  

One ordered backlog contains workflows, defects and necessary technical work. It does not split frontend and backend into competing delivery backlogs. SP-01 and SP-02 establish the separate application folders; every later feature slice combines relevant frontend/API/database/permission/tests.

BL-01 through BL-05 passed their applicable local technical gates on2026-10-14; BL-06 passed on2026-10-15 UTC. Product reviews remain pending. BL-06 [evidence](sprints/sp-06-evidence.md) records ownership/collaboration/history,archive/restore and authorized merge with preserved true actors. BL-07 through BL-16 have since passed their scoped local technical gates; the linked sprint index/records are authoritative. BL-17 through BL-22 remain planned and unstarted. BL-04/05/06 low-priority AFTER findings await Khalid's selection, not an inferred design approval. Priority is the approved sequence, not a calendar commitment; later feedback may reprioritize work with an explicit change.

## Ordered capability items

| Rank / item | Outcome and sprint | Requirements | State / acceptance |
|---|---|---|---|
| 01 / BL-01 | [Initialize the frontend](sprints/01-frontend-initialization.md) — A reproducible French Next.js shell runs locally and has executable frontend/browser checks. | C13, C14 | technically_accepted; product pending; [evidence](sprints/sp-01-evidence.md) |
| 02 / BL-02 | [Initialize the backend and local integration](sprints/02-backend-local-integration.md) — The frontend talks to a real local FastAPI/PostgreSQL stack with isolated tests and reproducible Python tooling. | C13, C14 | technically_accepted; product pending; [evidence](sprints/sp-02-evidence.md) |
| 03 / BL-03 | [First administrator and login](sprints/03-bootstrap-login.md) — One local administrator can bootstrap the installation and sign in through the real authenticated frontend. | C01, C13, C14 | technically_accepted; product pending; [evidence](sprints/sp-03-evidence.md) |
| 04 / BL-04 | [User administration and temporary credentials](sprints/04-user-administration.md) — An administrator manages named staff while temporary credentials and current permissions remain enforced. | C01, C13, C14 | technically_accepted; product pending; [evidence](sprints/sp-04-evidence.md) |
| 05 / BL-05 | [Leads and contact identity](sprints/05-leads-contact-identity.md) — Authorized staff create and find enquiries without duplicating or disclosing private contact identities. | C02, C11, C13, C14 | technically_accepted; product pending; [evidence](sprints/sp-05-evidence.md) |
| 06 / BL-06 | [Ownership, collaboration, and contact history](sprints/06-ownership-contact-history.md) — Assignments and collaboration change current access while contact history retains its true authors. | C02, C05, C14, C13 | technically_accepted; product pending; [evidence](sprints/sp-06-evidence.md) |
| 07 / BL-07 | [Standalone property inventory](sprints/07-standalone-inventory.md) — Managers maintain physical assets and offerings that every agent can read through safe inventory views. | C04, C11, C13, C14 | technically_accepted; product pending; see sprint execution |
| 08 / BL-08 | [Developments, hierarchy, and project briefing](sprints/08-development-hierarchy.md) — Staff navigate real development units while managers maintain hierarchy and an optional safe project briefing. | C04, C11, C13, C14 | technically_accepted; product pending; see sprint execution |
| 09 / BL-09 | [Protected files and antivirus](sprints/09-protected-files-antivirus.md) — Users upload and download permitted files through FastAPI while quarantine and real antivirus protect shared/private records. | C04, C14, C13 | technically_accepted; product pending; see sprint execution |
| 10 / BL-10 | [Requirements and shortlists](sprints/10-requirements-shortlists.md) — An agent records independent searches and shortlists exact offering targets using accurate MAD comparisons. | C03, C04, C13 | technically_accepted; product pending; see sprint execution |
| 11 / BL-11 | [Deal creation and pipeline](sprints/11-deal-pipeline.md) — Users deliberately create contact-scoped deals and progress through the fixed pipeline with auditable offers and actions. | C08, C02, C13, C14 | technically_accepted; product pending; see sprint execution |
| 12 / BL-12 | [Reservations and overlap checks](sprints/12-reservations-overlap.md) — Contact-scoped reservations are reliable under retries and project/unit competition. | C04, C08, C13, C14 | technically_accepted; product pending; see sprint execution |
| 13 / BL-13 | [Outcomes, inventory effects, and reopening](sprints/13-outcomes-reopening.md) — Closing and reopening deals maintain accurate inventory, original outcomes and manager-review boundaries. | C04, C08, C09, C13, C14 | technically_accepted; product pending; see sprint execution |
| 14 / BL-14 | [Working-time settings and visit calendar](sprints/14-visit-calendar-working-times.md) — An administrator configures work times and staff book three visit types under enforceable schedule and capacity rules. | C01, C07, C13, C14 | technically_accepted; product pending; see sprint execution |
| 15 / BL-15 | [Tasks, reminders, and internal notifications](sprints/15-tasks-reminders-notifications.md) — Staff manage current/overdue work and receive durable internal reminders that survive retries and worker restarts. | C06, C07, C10, C13, C14 | technically_accepted; product pending; see sprint execution |
| 16 / BL-16 | [Optional commissions and collections](sprints/16-commissions-collections.md) — Managers recognize, collect and correct optional commissions with exact balances and preserved originals. | C09, C08, C13, C14 | technically_accepted; product pending; see sprint execution |
| 17 / BL-17 | [Dashboard, KPIs, and exception lists](sprints/17-dashboard-kpis.md) — The dashboard reports real authorized CRM outcomes with correct attribution and useful Bklit charts. | C10, C13, C14 | technically_accepted; product pending; see sprint execution |
| 18 / BL-18 | [Atomic contact import](sprints/18-atomic-contact-import.md) — Managers preview and correct a contact CSV, then commit every eligible new row atomically. | C11, C02, C13, C14 | technically_accepted; product pending; see sprint execution |
| 19 / BL-19 | [Search, exports, archiving, and audit](sprints/19-search-export-archive-audit.md) — Search and record lifecycle workflows remain scope-correct through counts, exports, archiving and audit. | C11, C14, C02, C04, C13 | technically_accepted; product pending; see sprint execution |
| 20 / BL-20 | [Local website-form intake](sprints/20-local-website-intake.md) — A local signed form server submits enquiries reliably without contact disclosure or duplicate delivery effects. | C12, C02, C11, C14, C13 | technically_accepted; product pending; see sprint execution |
| 21 / BL-21 | [Local backup and recovery](sprints/21-local-backup-recovery.md) — An isolated restore proves that database, files and authorization history can be recovered coherently on this laptop. | C14, C13 | technically_accepted; [execution](sprints/sp-21-execution.md); product pending |
| 22 / BL-22 | [Complete local acceptance and performance](sprints/22-local-final-acceptance.md) — The complete C01–C14 CRM is reproducible and usable locally with measured performance and full evidence. | C01–C14 | planned; technical not run; product pending |

## Requirement completeness

| Core requirement | Primary delivery sprints |
|---|---|
| C01 Identity and accounts | SP-03, SP-04; administrator scheduling authority SP-14 |
| C02 Contacts and incoming enquiries | SP-05, SP-06, SP-18, SP-20 |
| C03 Requirements and shortlists | SP-10 |
| C04 Physical inventory and developments | SP-07, SP-08, SP-09, SP-12, SP-13 |
| C05 Authored timeline and transfers | SP-06; later module actions reuse it |
| C06 Tasks, reminders, internal notifications | SP-15 |
| C07 Visits and scheduling policy | SP-14, SP-15 |
| C08 Deals, reservations and outcomes | SP-11, SP-12, SP-13 |
| C09 Optional commissions/collections | SP-16 |
| C10 Attributed KPIs and exceptions | SP-17 |
| C11 Search/pagination/import/export | SP-05/SP-11 list foundations, SP-18, SP-19 |
| C12 Website-form connector | SP-20 using the local signed simulator |
| C13 French responsive interface/accessibility | Every frontend sprint, final SP-22 |
| C14 Authorization/history/files/recovery | Every affected sprint, SP-09, SP-19, SP-21, SP-22 |

The [sprint index acceptance matrix](sprints/README.md#acceptance-coverage) links all AT-01–AT-41 cases to their owning sprints. Feature-specific negative/race/retry cases are inside the owning sprint, not left entirely for SP-22.

## Defects and necessary technical work

SP-01/02 corrections and reruns are recorded in their execution records and agent lessons. No unresolved foundation functional defect remains; inherited npm development-tool advisories and device/real-use limits remain explicit. Future defects use `DEF-001` onward and necessary technical items `TECH-001` onward, with owner, observed cause/evidence, linked C/BR/AT, priority, affected sprint and exit criterion. A defect breaking the current sprint or a previously accepted workflow must be fixed before progression.

Initial required technical work is already included in the numbered backlog: reproducible packages/venv and test isolation (SP-01/02), identity/audit constraints (SP-03/04), scanner/outbox foundation (SP-09), durable notifications (SP-15), local recovery (SP-21), and full-volume measured acceptance (SP-22). Do not add an unrelated framework, broker, cloud service or future feature merely as technical preparation.

## Readiness and execution

Use `planned → ready → in_progress → technically_accepted`; mark an actual unmet prerequisite `blocked` with its evidence. Product review uses a separate `pending / approved / changes_requested` field. A technical gate passes only with actual checks and results.

Khalid supplied the development database name `kayrealestate` and its password in the [private local credentials note](local-database-credentials.md), excluded by the root .gitignore. SP-02 must verify the remaining role/host/port, inspect the existing database and configure independent test targets before migrations; never guess credentials or reset development data. SP-01 can be prepared independently and must preserve the exclusion. The user-approved local defaults now make H-01/H-02/H-03, Q-05/Q-07/Q-08 and the safe Q-06 behavior actionable; later real-data/expanded commercial validation is kept separately in [decisions](../../decisions.md).

All UI-related work also follows the [mandatory three-skill rules](ui-skill-rules.md), including per-surface applicability and the user's antislop AFTER timing. Each sprint records that evidence separately from technical tests and Khalid's product review.

No deployment/cloud sprint is included. All future catalogue items except the already-promoted O17 remain outside scope.
