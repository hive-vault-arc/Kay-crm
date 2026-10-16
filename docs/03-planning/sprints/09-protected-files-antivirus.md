# SP-09 — Protected files and antivirus

Status: technically_accepted; scoped local protected-files workflow verified  
Date: 2026-10-15  
Priority: 09 of 22 (execution order; every core sprint is required)  
Owner: implementing agent  
Technical acceptance: passed 2026-10-15; see the execution record  
Product acceptance authority: Khalid  
Product review: pending  
Dependency: [SP-08](08-development-hierarchy.md)  
Confirmed decisions: this sprint is part of the approved local CRM roadmap; shadcn/ui, Tailwind CSS and Bklit apply to relevant frontend work.  
Technical proposals: parser resource guardrails are documented for Khalid's review; implementation, locked packages and additive migrations are verified below.  

## Goal and traceability

Users upload and download permitted files through FastAPI while quarantine and real antivirus protect shared/private records.

- Requirements: C04, C14, C13.
- Business rules: BR-02, BR-06, BR-23.
- Screens/interactions: S05/contact documents, S11/project attachments, property detail attachments.
- Acceptance scenarios: File portions of AT-06, AT-26, AT-35; AT-23.
- API boundary: POST /files/permits, POST /documents, GET /documents/{id}, /archive; binary PUT/GET /transfers/{permit_id} directly to local FastAPI.
- Data boundary: document, document_version, file_permit, outbox_event, job and notification infrastructure needed for scan-state changes.
- Entry prerequisites: SP-08 accepted; Docker engine running for local ClamAV, signatures initialized, private local storage configured.

The listed acceptance coverage is limited to this sprint's implemented variants. Full named scenarios may span several sprints; [the index](README.md#acceptance-coverage) records completion ownership. AT-23 and the shared frontend gate apply whenever UI changes. Actual scoped results belong to the execution record; unrun future variants are not passing results.

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

- [File transfer diagram](../../../diagrams/files.mmd)
- [FastAPI file requests](../../reference/fastapi/0.143.1/docs/en/docs/tutorial/request-files.md)
- [ClamAV local Docker installation](https://docs.clamav.net/manual/Installing/Docker.html)
- [FastAPI testing](../../reference/fastapi/0.143.1/docs/en/docs/tutorial/testing.md)
- [SQLAlchemy synchronous ORM sessions](https://docs.sqlalchemy.org/en/21/orm/session_basics.html)

For exact installation/usage use the pinned local reference and the installed package's version-matched docs; use the linked official pages for topics missing locally. Follow the project's contracts when an upstream example uses a different session, pagination or storage pattern.

## Frontend tasks

- [x] Read antislop, design-system-ops and design-taste-frontend completely and follow the [mandatory UI skill workflow](../ui-skill-rules.md): system-first layout, explicit applicability, and antislop AFTER the completed UI work. Preserve KAY's stack/tokens; record design-taste exclusions for dashboard/table/admin/multi-step-form surfaces.
- [x] Implement shared upload/file-state controls for typed contact/development/property parents; protect owner evidence under contact documents.
- [x] Request a temporary session/resource permit through the facade, then transfer bytes directly to FastAPI; display progress, quarantine, clean/rejected and recoverable dependency errors.
- [x] Handle copied/expired/revoked/consumed permits and interrupted upload without implying scan success; require clean verdict for every preview/download.

## Backend tasks

- [x] Implement private filesystem storage interface and immutable object versions outside frontend public; validate real typed parents and current role/scope.
- [x] Enforce single-action/size/session-bound permits and 20 MB limit; validate extension, MIME and signature for JPEG/PNG/WebP/PDF/DOCX/XLSX and reject executable/macro or malformed containers.
- [x] Introduce durable PostgreSQL outbox/job claim, lease, retry/deduplication and scan consumer; workers use the same domain service and authorization contracts.
- [x] Start real local ClamAV with a pinned Docker image/signature cache; scan failures keep files quarantined and report safe errors. Never use fake scan success in the application.

Every Python command, tool, worker, migration and install must use backend/.venv explicitly as required by the local roadmap. Do not run backend code or pip globally.

## Database tasks

Development database: `kayrealestate`. The supplied PostgreSQL password is recorded once in the [private local database credentials note](../local-database-credentials.md), excluded by the root .gitignore. Read it when configuring the ignored backend/.env; verify role/host/port rather than guessing. Reuse that configuration, not a password copied into this sprint's evidence. Test, benchmark and recovery commands must use their separate verified targets and never reset/overwrite kayrealestate.

- [x] Migrate exactly-one-document-parent constraint, versions, permit hashes/consumption, job leases and outbox dedupe keys.
- [x] Coordinate object persistence/quarantine metadata without exposing an uncommitted or unscanned object; reconcile interrupted transfers and orphan cleanup safely.

## Testing tasks

- [x] Test clean and controlled antivirus-test payloads, malformed allowed containers, exact/over-20-MB sizes and scanner unavailability.
- [x] Run permit misuse, private-contact projection and permission-revocation cases in AT-26/35.
- [x] Use a real scanner and actual bytes in browser/API integration; interrupt transfer/worker, retry and verify unavailable-to-clean state transitions.

Define the focused E2E case before implementation, then test the real stack as it becomes available. Use synthetic fixtures and the isolated test database, including current-role/permission denial, invalid input, retries, interruptions and races that apply. Capture actual executable versions, commands, fixtures and results. Fix failures and rerun affected cases before progression.

## Acceptance criteria

- [x] Only authorized clean files can be downloaded or previewed, including shared inventory files.
- [x] No public storage URL or file path escapes the FastAPI authorization path; private owner/developer documents remain private.
- [x] Real scanning, interruption/retry and backend/E2E/Chrome checks pass with safe evidence.

## Technical exit criteria

- [x] Every applicable criterion above and the [shared technical gate](../local-roadmap.md#required-technical-exit-gate) passes with reproducible evidence.
- [x] Frontend lint/typecheck/build and applicable backend Ruff/mypy/pytest/PostgreSQL checks pass; new migrations are exercised in isolation.
- [x] Playwright uses the running implementation; a visible isolated Chrome session exercises this workflow and relevant roles.
- [x] Standard components/styling/charts follow shadcn/ui, Tailwind and Bklit; custom work is justified and applicable states/accessibility are verified.
- [x] Record the three required UI skills read, surface applicability, design-system-ops visual evidence and antislop AFTER audit results under the [UI skill rules](../ui-skill-rules.md). Pending numbered aesthetic findings need Khalid's selection before audit-only fixes; they do not excuse functional/accessibility failures or imply design approval.
- [x] Fixes preserve earlier accepted workflows, contracts and traceability. No required failed/skipped check is reported as passed.
- [x] Update real QA commands and documentation after verification; product review remains a separate field.

Chrome review performed: Uploaded synthetic clean and controlled-rejection files, observed quarantine/clean/rejected and scanner-outage/retry states, and verified forbidden private access, direct-byte integrity, interruption and authorized archive/read behavior.

## Verification evidence

The [SP-09 execution record](sp-09-evidence.md) retains the historical failed
Docker startup and corrected test attempts. All applicable local technical gates
now pass; the 23 compound checklist items are complete. This does not accept
future scenario variants, production readiness or Khalid's product/design review.

| Boundary | Current result | Required evidence during execution |
|---|---|---|
| Frontend lint/typecheck/build | pass, final application build CBCln6jwbn_knc5PpdqMY | Lint/typecheck/optimized build exit0; see execution record |
| Backend quality/unit/API | pass |192 tests/zero skipped/94%;110 formatted files/70 strict app modules |
| PostgreSQL/migration/concurrency | pass | Both34 tables/head0011, no drift; isolated migrations, real separate-connection races/rollback/fences; development never reset |
| Playwright E2E | pass,115/115/zero skipped,43.2m |23 cases on each of five projects; real bytes/scanner/private-shared/session-proof/archive/interruption and earlier regressions |
| Visible Chrome review | pass | Real Chrome155,15 captures, keyboard/touch/320–1440px/actual200%, no unexpected browser error |
| Optimized-build smoke | pass,23/23/zero skipped,5.7m | Installed Chrome against final built HTTPS frontend, actual isolated API/PostgreSQL/worker/ClamAV; not deployment/load/recovery |
| UI skills and AFTER audit | pass for implemented slice | Three complete reads; CRM exclusions; system geometry/contrast/pixels; AFTER009:0 HIGH/0 MEDIUM/0 LOW; independent reviewer ship/documenter no changes |
| Security/permission review | pass, scoped local boundary; known dev-tool advisories retained | Negative/race/revocation/quarantine/validation checks;253 browser JS scanned/0 facade-secret matches; runtime0/Python0, inherited9 HIGH dev-tool entries disclosed |
| Implementation docs/traceability | pass | Wire/data/architecture/components/screens/runbooks/security/QA/lessons updated; sprint/link/anchor/Mermaid/JSON validator passes |
| Isolation/cleanup/shutdown | pass |32 isolated record tables empty/bootstrap unset; development read-only inspection; project processes/ports0, ClamAV stopped/cache retained, shared PostgreSQL untouched |
| Product review | pending | Khalid's review/date/feedback, independently of technical progression |

Do not put passwords, one-time credential responses, tokens, full database URLs or private records into this evidence.

## Defects, limits, and handoff

- Historical Docker startup blocker resolved by the user's Docker-ready resumption.
  Real pinned ClamAV/signature cache was exercised; service is stopped after
  verification with its cache retained. No reset or unrelated-container change.
- Known limits: The storage adapter is local filesystem only; cloud Spaces provisioning is excluded. SP-15 extends this worker infrastructure for reminders.
- Scope exclusion: deployment/cloud provisioning and all unpromoted O01–O23 options.
- Implementation: complete vertical file slice and reviewed additive0010/0011,
  backend192 tests/94%, actual worker/scanner,115 five-project cases, headed file
  workflow and23 built-server checks. Privacy, guarded cleanup and documentation
  gates pass; no required failed/skipped case is presented as passing.
- Known risks:9 inherited HIGH development-only npm audit entries remain;
  runtime npm/Python locks have0 known findings. Conservative parser caps are
  proposals, not newly confirmed business rules; tested signatures are dated
  2026-10-11, not a guarantee of future freshness or malware-free content.
- Next safe action: Khalid's product/design review and review of the parser-cap
  proposals. SP-10 is technically unblocked but remains planned/not implemented.
- Execution record includes changed boundaries/migrations, exact checks/results,
  corrected failures, limitations and repeatable lessons.
- Progression: [SP-10](10-requirements-shortlists.md) after technical acceptance. Technical exit permits in-scope progression; do not claim Khalid approved a product review without his evidence.

