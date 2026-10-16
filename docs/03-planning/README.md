# KAY backlog and local sprint method

Status: active local delivery plan; SP-01–SP-21 technically accepted; SP-22/product reviews pending
Date: 2026-10-16  
Confirmed decisions: 22 ordered sprint specifications for a complete local C01–C14 CRM, separate frontend/backend folders, mandatory backend venv, and progression after technical exit gates pass.  
Technical proposals: actual commands, dependency locks and environment evidence will be verified during execution.  
References: [ordered backlog](backlog.md), [sprint index](sprints/README.md), [local roadmap/runtime/defaults](local-roadmap.md), [sprint template](SPRINT_TEMPLATE.md), [scope](../../core-scope.md), [harness](../HARNESS.md), and [acceptance scenarios](../05-quality/acceptance-tests.md).  

Start with the [22-sprint index](sprints/README.md). The [backlog](backlog.md) is now ordered by the approved sequence. Each sprint contains direct documentation links, C/BR/S/AT identifiers, tasks by boundary, prerequisites, observable acceptance criteria, shared exit gates and a future evidence/defect/handoff record.

For UI work, follow the [mandatory skill rules](ui-skill-rules.md) and linked installed skills. For SP-02 through SP-22, use `kayrealestate` and the supplied password from the [private local database note](local-database-credentials.md), excluded by the root .gitignore; verify unsupplied connection fields and keep tests/benchmark/recovery isolated.

## Delivery model

SP-01 initializes frontend/; SP-02 initializes backend/ and integration with the existing PostgreSQL database. Feature sprints then build small complete workflows across frontend, API, database, permissions and tests. C13/C14 gates follow every applicable slice.

The user authorized the local implementation defaults in [the roadmap](local-roadmap.md#accepted-local-implementation-defaults). Preserve them while implementing; do not keep already-selected local choices artificially blocked by older proposed wording. Real-data/expanded commercial questions remain separately recorded in [decisions](../../decisions.md).

This sequence ends with a locally working, verified core. There is no deployment/cloud provisioning sprint. The existing release specification remains reference material; only its applicable local backup/restore procedures are used.

## Status, ownership and progression

Owner for each sprint: implementing agent. Product acceptance authority: Khalid. Every new sprint is initially planned, application verification not run, product review pending.

State flow: `planned → ready → in_progress → technically_accepted`. An actual missing prerequisite becomes `blocked` with evidence; a difficult test failure remains work to fix. Verify dependencies and environment before marking ready.

Technical acceptance requires the documented behavior and actual backend/PostgreSQL, Playwright and visible Chrome evidence, plus applicable quality/security/accessibility checks. Fix failures and regressions before continuing. Passing this gate permits the next in-scope sprint automatically; do not request repetitive approval for already-authorized local work.

Product review is independently `pending`, `approved` or `changes_requested`, with Khalid's real feedback/date. Technical results never invent human sign-off. No sprint duration or calendar dates are committed by this specification; record a chosen timebox later if needed.

## Backlog maintenance and evidence

One product backlog includes workflow items, observed defects and necessary technical work. Add DEF/TECH IDs as evidence emerges and keep the C/BR/API/data/AT links. A defect invalidating current or earlier accepted work blocks progression until fixed.

Define the focused E2E journey before implementation, run relevant Python/PostgreSQL checks, run the actual frontend E2E flow, then review it in visible isolated Chrome. All backend commands and subprocesses use backend/.venv explicitly. SP-01 truthfully marks backend tests not applicable.

Update [QA commands](../QA_COMMANDS.md) only from real manifests and successful runs. Record actor, fixture/build/migration/environment, command, actual result and safe evidence. The [sprint index](sprints/README.md#acceptance-coverage) maps all AT-01–AT-41 scenarios across stages and final SP-22.

Future feedback may reorder or refine unstarted work while preserving dependency/coverage evidence. Do not silently add unpromoted O01–O23 features or remove core workflows to force the earlier 19-page estimate.
