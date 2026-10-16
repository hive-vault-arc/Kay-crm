# KAY local sprint specification template

Status: active template for approved local sprint specifications  
Date: 2026-10-14  
References: [sprint index](sprints/README.md), [ordered backlog](backlog.md), [local roadmap/gates](local-roadmap.md), [harness](../HARNESS.md), [QA commands](../QA_COMMANDS.md), and [acceptance tests](../05-quality/acceptance-tests.md).  

The 22 concrete files already use this structure. Use it for a recorded later split/revision; keep direct source links and observable behavior rather than copying generic tasks. Technical acceptance and Khalid's product review are separate.

Carry forward the [mandatory UI skill rules](ui-skill-rules.md) and the database name `kayrealestate` when applicable. Link the [private local credentials note](local-database-credentials.md) rather than copying its supplied password into a tracked sprint. Verify role/host/port and isolate test/benchmark/recovery databases.

```text
SP ID / name:
Date:
Priority / backlog item:
Status: planned / ready / in_progress / blocked / technically_accepted
Owner: implementing agent
Technical verification: not run / failed / passed
Product acceptance authority: Khalid
Product review: pending / approved / changes_requested
Dependencies and entry prerequisites:
Goal / demonstrable user outcome:
Confirmed decisions and local defaults:
Technical proposals / limits:

Traceability:
- C requirement IDs:
- BR rule IDs:
- S screen/support interaction IDs:
- API operations and authority:
- Tables/constraints/history:
- AT scenarios and exact variants this sprint completes:

Documentation to follow:
- Direct project scope/rule/workflow/permission/model/API links:
- Framework installation and usage topic links:
- Components/styling/charts/design references:
- Required antislop, design-system-ops and design-taste-frontend SKILL.md links:
- UI skill applicability and timing (antislop AFTER; excluded surfaces justified):
- Development database name and private ignored configuration reference:
- Harness/QA/security/acceptance sources:

Frontend tasks:
Backend tasks (every Python execution/install uses backend/.venv):
Database tasks (isolated tests; preserve existing unrelated data):
Testing tasks:
- Focused E2E scenario specified before coding:
- Python unit/API and real PostgreSQL cases:
- Role-denied, invalid, conflict, race, retry/interruption cases:
- Frontend quality/build:
- Playwright running-stack flow:
- Visible isolated real Chrome interaction:
- French states, desktop/mobile, keyboard/touch, zoom:
- Applicable security/migration/recovery cases:

Observable feature acceptance criteria:
Required shared technical exit criteria:
Chrome actor/viewport/interactions to review:
Scope limits / not-applicable checks:

Evidence:
- Command, working directory, executable/version:
- Environment, build/migration/dataset:
- Actual assertion/result/date:
- Safe evidence artifact or reproducible observation:
- UI skills read, applicability, system reuse and visual/state evidence:
- AFTER audit path/findings; actual selection/approval before audit-only fixes:
- Product review evidence independently:

Defect register (untested does not mean no defects):
Handoff:
- Changed application/docs/migrations:
- Passed/failed/not-run checks:
- Risks/actual blocking prerequisite:
- Lessons to save:
- Next authorized safe action and dependency gate:
```

All required checks remain not run until executed. Never include credentials or one-time secret responses in evidence. A passing technical gate permits local progression; actual product approval must come from Khalid.
