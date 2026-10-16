# SP-01 — Initialize the frontend

Status: technically_accepted; SP-01 frontend foundation implemented
Date: 2026-10-14  
Priority: 01 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: passed 2026-10-14; see sp-01-evidence.md
Product acceptance authority: Khalid  
Product review: pending  
Dependency: None (first setup sprint)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: the concrete implementation and package/migration details must be verified against these sources.  

## Goal and traceability

A reproducible French Next.js shell runs locally and has executable frontend/browser checks.

- Requirements: C13, C14.
- Business rules: BR-22.
- Screens/interactions: S01/S02 shell only; navigation structure for S03–S17.
- Acceptance scenarios: AT-23 (setup and shared UI states only; full feature coverage is deferred).
- API boundary: No backend business operation yet. Keep the typed API boundary ready for SP-02; do not fabricate successful CRM responses.
- Data boundary: Frontend source/manifests/lockfile, shared UI tokens and safe column preference metadata; no database tables.
- Entry prerequisites: Existing specification/reference files; Node/npm/Chrome installation verified at sprint start.

The listed acceptance coverage is limited to this sprint's implemented variants. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage) records completion ownership. AT-23 setup/shared-state variants passed with the evidence below; full AT-23 and business scenarios are not marked passed.

## Documentation to follow

Read the relevant clauses for the C/BR/AT identifiers above before editing. These are direct links, not a request to recreate the specification.

- [Local roadmap, runtime, defaults and required exit gates](../local-roadmap.md)
- [Agent instructions](../../../AGENTS.md)
- [C01–C14 scope](../../../core-scope.md)
- [Decision register](../../../decisions.md)
- [Business rules](../../02-requirements/business-rules.md)
- [Roles and permissions](../../../permissions.md)
- [Business workflows](../../../workflows.md)
- [Data model and constraints](../../04-design/data-model.md)
- [API contract](../../04-design/api-contracts.md)
- [Architecture](../../04-design/architecture.md)
- [Screen map](../../04-design/screen-map.md)
- [Approved V3 screenshots, route map and rules for unpictured pages](../../04-design/ui-reference/approved-v3/README.md)
- [Mandatory UI skill rules, timing and applicability](../ui-skill-rules.md)
- [antislop skill](<C:/Users/khali/.codex/skills/antislop/SKILL.md>)
- [design-system-ops skill](<C:/Users/khali/.codex/skills/design-system-ops/SKILL.md>)
- [design-taste-frontend skill](<C:/Users/khali/.codex/skills/design-taste-frontend/SKILL.md>)
- [Coding standards and reuse](../../01-working-agreements/coding-standards.md)
- [Repository structure](../../01-working-agreements/repository-structure.md)
- [Acceptance scenarios](../../05-quality/acceptance-tests.md)
- [Harness, evidence and handoff](../../HARNESS.md)
- [QA command register](../../QA_COMMANDS.md)
- [Security check](../../SECURITY_CHECK.md)

Framework/component topics for this sprint:

- [Next.js installation (pinned)](../../reference/nextjs/16.4.0/docs/01-app/01-getting-started/01-installation.md)
- [Next.js local HTTPS CLI](../../reference/nextjs/16.4.0/docs/01-app/03-api-reference/06-cli/next.md)
- [Next.js Playwright setup](../../reference/nextjs/16.4.0/docs/01-app/02-guides/testing/playwright.md)
- [Playwright installation](https://playwright.dev/docs/intro)
- [Playwright Chrome/Edge browser channels](https://playwright.dev/docs/browsers)
- [KAY shadcn/ui guide](../../04-design/ui-components.md)
- [KAY Tailwind guide](../../04-design/styling.md)
- [KAY design system](../../04-design/design-system.md)
- [KAY semantic tokens](../../../branding/kay-ui-tokens.json)
- [React Hook Form documentation](https://react-hook-form.com/get-started)
- [Zod validation](https://zod.dev/)
- [TanStack Table documentation](https://tanstack.com/table/latest/docs/introduction)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Create frontend/ with Next.js 16.4.0 App Router, TypeScript, src/, npm, ESLint and @/* alias; pin Tailwind 4.3.3 and actual compatible React versions in package-lock.json.
- [x] Establish one local Git repository at the project root if absent, preserving existing documentation/references and the root .gitignore's private local database credentials exclusion. Ignore environments, local data/certificates, credentials and generated test artifacts; avoid a separate nested frontend repository.
- [x] Initialize shadcn/ui Radix/New York and Lucide; add only primitives used by the shell, forms and table foundation. Declare React Hook Form, Zod and TanStack Table dependencies and their typed integration points.
- [x] Map the existing light semantic tokens into Tailwind/shadcn variables, use system sans-serif, set html lang=fr, and centralize MAD/date/phone display helpers.
- [x] Create local dev, lint, typecheck, build, test:e2e and headed test:chrome scripts. Install Playwright browsers; record versions and reconcile generated frontend agent instructions with root AGENTS.md.
- [x] Provide French initial shell and meaningful loading/empty/error states without claiming authentication or dashboard metrics are implemented.
- [x] The standalone SP-01 shell may run on localhost HTTP; SP-02 introduces shared local HTTPS before SP-03 handles credentials/cookies.

## Backend tasks

- [x] Not applicable: backend source and runtime begin in SP-02. No backend command was run.

Backend implementation/verification is explicitly not applicable to SP-01.

## Database tasks

- [x] Not applicable: no database command belongs to this frontend initialization. No database access occurred.

## Testing tasks

- [x] Lint/typecheck and local next build pass.
- [x] Playwright against the actual frontend server: French shell, sheet keyboard/focus, width matrix and error recovery; 30/30 cases passed.
- [x] Headed installed Chrome: desktop/mobile touch, actual 200% browser zoom, console/network review and safe screenshots; 7/7 passed. Built-server smoke: 4/4 passed.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] A fresh npm ci reproduces the locked frontend install and npm run dev opens the shell.
- [x] The app renders in real Chrome; keyboard/mobile navigation and long French labels remain usable.
- [x] All configured frontend checks pass and commands are verified; backend tests are not applicable. Full development dependency audit risk remains explicitly recorded, not marked clean.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build pass. Backend Ruff/mypy/pytest/PostgreSQL and migrations are explicitly N/A in SP-01.
- [x] Playwright uses the running implementation; visible isolated Chrome exercises the shell visitor. Staff roles are not implemented or claimed.
- [x] Standard components/styling follow shadcn/ui and Tailwind; Bklit is configured for later charts, with no chart in this slice. KAY compositions and narrow CSS exceptions are recorded.
- [x] Three skill reads, applicability, visual evidence and AFTER audit recorded under the [UI skill rules](../ui-skill-rules.md). Audit has zero numbered findings; no aesthetic selection or product approval is invented.
- [x] Technical defects were fixed and affected checks rerun. Earlier project specifications were preserved; no required failed/skipped check is reported as passed.
- [x] Real QA commands, traceability and handoff updated. Product review remains pending Khalid.

Chrome review completed: opened the frontend, exercised the sidebar/navigation sheet, changed viewport and actual browser zoom, and inspected French states and browser errors; evidence below.

## Verification evidence

Executed 2026-10-14. The [detailed execution record](sp-01-evidence.md) contains commands, versions, fixes, visual/skill evidence, scope and remaining risks.

| Boundary | Current result | Required evidence during execution |
|---|---|---|
| Frontend lint/typecheck/build | passed | `npm ci`, `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run build`; exit 0 and live shell observed. |
| Backend quality/unit/API | not applicable (backend begins SP-02) | No backend exists or command is claimed. |
| PostgreSQL/migration/concurrency | not applicable (no database task) | No database read/write or migration occurred. |
| Playwright E2E | passed | 30/30 on five browser targets; built-server smoke 4/4; AT-23 setup only. |
| Visible Chrome review | passed | 7/7; installed headed Chrome, 1440×900, 360×800 touch and real browser zoom 200%; safe artifacts recorded. |
| UI skills and AFTER audit | completed | Three reads/applicability and geometry evidence; [AFTER audit](../../../anti-slop/audit-001-2026-10-14.md), zero numbered findings; product review pending. |
| Security/permission review | scoped review complete | Private note/artifact exclusions, production fixture gate and zero runtime dependency findings; nine development-only advisory entries documented, not called clean. Auth/record permission tests N/A. |
| Implementation docs/traceability | updated | Root/frontend instructions, QA commands, SP-01 record, traceability, backlog/index, audit and repeatable lesson. |
| Product review | pending | Khalid's review/date/feedback, independently of technical progression |

Do not put passwords, one-time credential responses, tokens, full database URLs or private records into this evidence.

## Defects, limits, and handoff

- Resolved defects and rerun evidence are in [SP-01 evidence](sp-01-evidence.md). No unresolved functional/accessibility defect remains in the implemented shell. Development-tool advisory and high-DPI screenshot/device limits remain recorded.
- Known limits: Authentication, real data, API connectivity and usable CRM workflows begin in later sprints; the shell is the only claimed outcome.
- Scope exclusion: deployment/cloud provisioning and all unpromoted O01–O23 options.
- Handoff: `frontend/` source/lockfile/scripts, root Git/exclusions, shared foundations and executable browser checks are implemented. Product review is pending Khalid.
- Reproduce: follow `frontend/README.md` and `docs/QA_COMMANDS.md`; no credentials or database are needed for SP-01.
- Evidence and the navigation correction are saved in the execution record and `docs/AGENT_LESSONS.md`.
- Progression: [SP-02](02-backend-local-integration.md) after technical acceptance. Technical exit permits in-scope progression; do not claim Khalid approved a product review without his evidence.

