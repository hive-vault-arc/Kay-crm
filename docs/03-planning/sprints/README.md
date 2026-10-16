# KAY local sprint specifications

Status: SP-01–SP-22 locally technically accepted; product reviews pending
Date: 2026-10-16  
Owner: implementing agent  
Product acceptance authority: Khalid  
References: [local roadmap and shared gates](../local-roadmap.md), [ordered backlog](../backlog.md), [planning method](../README.md), [scope](../../../core-scope.md), [acceptance tests](../../05-quality/acceptance-tests.md), and [traceability](../../05-quality/traceability.md).  

The completed [SP-01](01-frontend-initialization.md) has an [execution record](sp-01-evidence.md). Each sprint file contains its direct source documentation, tasks, entry prerequisites, acceptance/exit criteria and implementation evidence when executed. The sequence is execution priority; the only exceptions to whole-workflow delivery are the two explicit setup sprints.

Every UI sprint must follow the [three required skill rules](../ui-skill-rules.md), including the user's antislop AFTER choice. SP-02 through SP-22 use the development database `kayrealestate` and reference the supplied password in the [private local credentials note](../local-database-credentials.md), excluded by the root .gitignore. Remaining connection fields must be verified; fixture resets/benchmark loads/restores use separate targets.

## Approved V3 UI work

For future UI implementation, rework or browser review in any sprint, read and open [Approved V3's nine screenshots, route map and unpictured-page rules](../../04-design/ui-reference/approved-v3/README.md) before editing. Its shared visual patterns apply to all existing pages, tabs, dialogs and states, not just nine images. Use shadcn/ui controls/tables, Tailwind CSS styling and Bklit UI charts; build the shared shell/components first, then work through a per-route checklist. Preserve real data, fields, authorization, API/database behavior, and all working actions. Do not copy mockup values/statuses as business requirements or add unrelated features.

Record the reference PNG or nearest family, affected screen IDs, actual screenshot comparison, responsive/accessibility checks, relevant Playwright flows and visible Chrome evidence. Existing lint/typecheck/build and privacy/isolation rules apply. No app tests ran during this asset/Markdown handoff. Previously accepted sprint tasks/results remain historical; do not mark V3 work done until it is actually implemented and verified, or silently change backend-only scope because this reference is linked. Khalid's approved visual direction is not retrospective acceptance of the running application.

SP-01 through SP-05 passed their scoped technical gates on2026-10-14; SP-06 and SP-07 passed on2026-10-15 UTC. Product reviews remain **pending**. [SP-06 evidence](sp-06-evidence.md) retains its ownership/history/merge results and optional AFTER006 finding. [SP-07 evidence](sp-07-evidence.md) adds standalone inventory/legal owners/two campaigns:150 backend,190 five-browser,43 unchanged headed cases plus the corrected inventory review,and31 built HTTPS checks; zero skipped. Mandatory skill applicability,15 refreshed inspected captures and AFTER007's zero new findings are recorded. [SP-08 evidence](sp-08-evidence.md) records163 backend tests (96% coverage),105 distinct affected five-target cases with corrected reruns retained,5 headed and21 optimized HTTPS checks; zero skipped in the final commands.16 inspected captures and AFTER008's optional LOW finding await independent product/design review. [SP-09 evidence](sp-09-evidence.md) records192 backend tests (94% coverage),115 five-target cases,1 headed Chrome workflow/15 inspected captures and23 optimized HTTPS checks; zero skipped. Real pinned ClamAV, direct private transfers, permission/quarantine/race/retry/privacy/isolation gates pass; AFTER009 has0 findings. [SP-10 evidence](sp-10-evidence.md) records223 backend/94% coverage,160 distinct five-target cases through corrected reruns (not one clean160 invocation),latest SP10 10/10,1 headed workflow/16 valid inspected captures and32 compiled HTTPS checks. Final commands have zero skipped; AFTER010 has0 new aesthetic findings, one functional review correction is resolved, and privacy/isolation/shutdown pass. The original WebKit scanner timeout and9 inherited HIGH development-tool findings remain disclosed. [SP-11 evidence](sp-11-evidence.md) adds263 backend tests/95% coverage,20 SP-11 five-target cases and25 final affected compiled checks on all five targets. All36 selected Chrome cases are verified through corrected reruns, not one clean36 invocation. Final headed Chrome/16 native captures, selected AFTER011 finding1, finish ship/documenter No changes and privacy/isolation/shutdown pass. [SP-12 evidence](sp-12-execution.md) adds persistent reservations/overlap: full284 plus focused23 cover286 backend cases;35 five-target deal/reservation checks,8 broader compiled Chrome and15 final affected compiled cases pass. Final headed Chrome/12 valid captures, AFTER012 zero findings, finish ship/documenter No changes and privacy/isolation/shutdown pass. [SP-13](sp-13-execution.md) records318 backend tests/94% coverage,50 five-target plus8 broader compiled cases, full/settled headed checks and16 valid native captures. AFTER013 zero findings, fresh UI reviewer ship/documenter No system changes and final privacy/isolation/shutdown pass. [SP-14](sp-14-execution.md) records 349 backend tests/94% coverage, clean 65 five-target checks, 14 broader compiled Chrome cases and one final headed workflow/23 inspected native captures. AFTER014 has zero new findings, fresh UI finish reviewer ship, factual component documentation and final privacy/isolation/shutdown pass. [SP-15](sp-15-execution.md) adds tasks/internal reminders:372 backend tests/94% coverage,95 distinct affected five-target variants through corrected reruns plus14 broader Chrome,2 final headed cases/23 refreshed captures, AFTER015 zero new findings and final privacy/isolation/shutdown pass. [SP-16](sp-16-execution.md) adds optional exact commissions/collections:46 focused backend,10 five-target cases plus final Chrome2/2 and headed1/1 pass; additive0018, retained corrections/reopen review, AFTER016, scored finish fix and documentation/privacy/isolation gates pass. [SP-17](sp-17-execution.md) adds scoped KPIs/Bklit chart-table pairs, attribution-safe drill-downs and nonmutating 30/14-day alerts:22 focused backend checks,10 five-target flows, final Chrome2/2 and headed1/1 pass. F1 period preservation is resolved; AFTER017 LOW1 remains unselected. Documentation/privacy/isolation/shutdown are recorded. [SP-18](sp-18-execution.md) adds M/A contact CSV preview/correction/agent mapping and durable atomic approval:61 focused backend, final compiled imports2/2 and headed1/1 pass;0019, AFTER018, fresh finish ship and privacy/isolation/shutdown are recorded. [SP-19](sp-19-execution.md) records scoped discovery/export/lifecycle/audit acceptance. [SP-20](sp-20-execution.md) adds signed local intake/durable receipt/private routing:19 focused backend checks, final compiled1/1 and native workflow/size-recovery pass;0022, AFTER020, fresh finish ship and factual documentation/privacy/isolation/shutdown recorded. SP-21 local recovery is technically accepted (see its execution ledger); SP-22 local technical acceptance passes in its recorded4-process configuration. Technical acceptance never implies Khalid's product/design approval; preserve earlier workflows and follow the shared exit gate.

## Ordered navigation

| Priority / ID | Sprint specification | Immediate dependency | Main requirements | Current state |
|---|---|---|---|---|
| 01 / SP-01 | [Initialize the frontend](01-frontend-initialization.md) | None | C13, C14 | technically_accepted; product pending; [evidence](sp-01-evidence.md) |
| 02 / SP-02 | [Initialize the backend and local integration](02-backend-local-integration.md) | SP-01 | C13, C14 | technically_accepted; product pending; [evidence](sp-02-evidence.md) |
| 03 / SP-03 | [First administrator and login](03-bootstrap-login.md) | SP-02 | C01, C13, C14 | technically_accepted; product pending; [evidence](sp-03-evidence.md) |
| 04 / SP-04 | [User administration and temporary credentials](04-user-administration.md) | SP-03 | C01, C13, C14 | technically_accepted; product pending; [evidence](sp-04-evidence.md) |
| 05 / SP-05 | [Leads and contact identity](05-leads-contact-identity.md) | SP-04 | C02, C11, C13, C14 | technically_accepted; product pending; [evidence](sp-05-evidence.md) |
| 06 / SP-06 | [Ownership, collaboration, and contact history](06-ownership-contact-history.md) | SP-05 | C02, C05, C14, C13 | technically_accepted; [evidence](sp-06-evidence.md); product pending |
| 07 / SP-07 | [Standalone property inventory](07-standalone-inventory.md) | SP-06 | C04, C11, C13, C14 | technically_accepted; [evidence](sp-07-evidence.md); product pending |
| 08 / SP-08 | [Developments, hierarchy, and project briefing](08-development-hierarchy.md) | SP-07 | C04, C11, C13, C14 | technically_accepted; [evidence](sp-08-evidence.md); product pending |
| 09 / SP-09 | [Protected files and antivirus](09-protected-files-antivirus.md) | SP-08 | C04, C14, C13 | technically_accepted; real scanner; [evidence](sp-09-evidence.md); product pending |
| 10 / SP-10 | [Requirements and shortlists](10-requirements-shortlists.md) | SP-09 | C03, C04, C13 | technical exit accepted; [evidence](sp-10-evidence.md); product review pending |
| 11 / SP-11 | [Deal creation and pipeline](11-deal-pipeline.md) | SP-10 | C08, C02, C13, C14 | technically_accepted; [evidence](sp-11-evidence.md); product review pending |
| 12 / SP-12 | [Reservations and overlap checks](12-reservations-overlap.md) | SP-11 | C04, C08, C13, C14 | technically_accepted; [evidence](sp-12-execution.md); product review pending |
| 13 / SP-13 | [Outcomes, inventory effects, and reopening](13-outcomes-reopening.md) | SP-12 | C04, C08, C09, C13, C14 | technically_accepted; [execution](sp-13-execution.md); product review pending |
| 14 / SP-14 | [Working-time settings and visit calendar](14-visit-calendar-working-times.md) | SP-13 | C01, C07, C13, C14 | technically_accepted; [execution](sp-14-execution.md); product review pending |
| 15 / SP-15 | [Tasks, reminders, and internal notifications](15-tasks-reminders-notifications.md) | SP-14 | C06, C07, C10, C13, C14 | technically_accepted; [execution](sp-15-execution.md); product pending |
| 16 / SP-16 | [Optional commissions and collections](16-commissions-collections.md) | SP-15 | C09, C08, C13, C14 | technically_accepted; [execution](sp-16-execution.md); product pending |
| 17 / SP-17 | [Dashboard, KPIs, and exception lists](17-dashboard-kpis.md) | SP-16 | C10, C13, C14 | technically_accepted; [execution](sp-17-execution.md); product pending |
| 18 / SP-18 | [Atomic contact import](18-atomic-contact-import.md) | SP-17 | C11, C02, C13, C14 | technically_accepted; [execution](sp-18-execution.md); product pending |
| 19 / SP-19 | [Search, exports, archiving, and audit](19-search-export-archive-audit.md) | SP-18 | C11, C14, C02, C04, C13 | technically_accepted; [execution](sp-19-execution.md); product pending |
| 20 / SP-20 | [Local website-form intake](20-local-website-intake.md) | SP-19 | C12, C02, C11, C14, C13 | technically_accepted; [execution](sp-20-execution.md); product pending |
| 21 / SP-21 | [Local backup and recovery](21-local-backup-recovery.md) | SP-20 | C14, C13 | technically_accepted; [execution](sp-21-execution.md); product pending |
| 22 / SP-22 | [Complete local acceptance and performance](22-local-final-acceptance.md) | SP-21 | C01–C14 | technically_accepted locally; product review pending |

## Acceptance coverage

The following mapping identifies first implementation/completion ownership, not passing results. Portions of a scenario may be built across several sprints. SP-22 reruns every applicable local AT-01–AT-41 variant; AT-23 also applies in every sprint that changes UI.

| Acceptance ID | Owning sprints | Variant / boundary |
|---|---|---|
| AT-01 | [SP-04](04-user-administration.md) | Subsequent account creation and password rules |
| AT-02 | [SP-03](03-bootstrap-login.md), [SP-04](04-user-administration.md), [SP-09](09-protected-files-antivirus.md), [SP-21](21-local-backup-recovery.md) | Session expiry/revocation, reset, permit and restore safety |
| AT-03 | [SP-05](05-leads-contact-identity.md) | Contact identity and primary international phone/email |
| AT-04 | [SP-05](05-leads-contact-identity.md), [SP-06](06-ownership-contact-history.md) | Accessible duplicates/private-phone denial then controlled authorized merge |
| AT-05 | [SP-06](06-ownership-contact-history.md) | Assignment, collaboration and true actors |
| AT-06 | [SP-07](07-standalone-inventory.md), [SP-09](09-protected-files-antivirus.md) | Shared inventory facts and protected file reads |
| AT-07 | [SP-10](10-requirements-shortlists.md) | Independent requirements/unknown criteria/shortlists |
| AT-08 | [SP-07](07-standalone-inventory.md), [SP-10](10-requirements-shortlists.md) | Exact monthly/yearly rental comparison |
| AT-09 | [SP-12](12-reservations-overlap.md) | Unique non-expiring offering reservation |
| AT-10 | [SP-13](13-outcomes-reopening.md) | Sale/rental stock effects |
| AT-11 | [SP-13](13-outcomes-reopening.md) | External outcomes without invented KAY win |
| AT-12 | [SP-11](11-deal-pipeline.md), [SP-13](13-outcomes-reopening.md) | Pipeline skipping then required close fields |
| AT-13 | [SP-13](13-outcomes-reopening.md), [SP-16](16-commissions-collections.md) | Reopen stock checks and later financial preservation |
| AT-14 | [SP-13](13-outcomes-reopening.md), [SP-16](16-commissions-collections.md) | No-commission close then optional finance permissions |
| AT-15 | [SP-16](16-commissions-collections.md) | Recognition, receipts, over-collection, corrections |
| AT-16 | [SP-14](14-visit-calendar-working-times.md), [SP-15](15-tasks-reminders-notifications.md) | Appointment warning/reason and free/busy |
| AT-17 | [SP-15](15-tasks-reminders-notifications.md) | Durable reminders and overdue work |
| AT-18 | [SP-06](06-ownership-contact-history.md), [SP-17](17-dashboard-kpis.md) | Authorship/assignment foundation then KPI attribution |
| AT-19 | [SP-17](17-dashboard-kpis.md) | 30/14-day alerts with no automatic outcome |
| AT-20 | [SP-18](18-atomic-contact-import.md) | CSV preview/correction/permission |
| AT-21 | [SP-18](18-atomic-contact-import.md) | Atomic import crash/retry/race |
| AT-22 | [SP-05](05-leads-contact-identity.md), [SP-19](19-search-export-archive-audit.md), [SP-20](20-local-website-intake.md) | Lists/pagination and signed intake retry |
| AT-23 | [SP-01](01-frontend-initialization.md), [SP-22](22-local-final-acceptance.md) | Every frontend sprint applies this gate; final complete rerun |
| AT-24 | [SP-06](06-ownership-contact-history.md), [SP-19](19-search-export-archive-audit.md) | Contact archive then remaining retention/lifecycle |
| AT-25 | [SP-21](21-local-backup-recovery.md) | Local coherent recovery and RPO/RTO |
| AT-26 | [SP-03](03-bootstrap-login.md), [SP-09](09-protected-files-antivirus.md), [SP-21](21-local-backup-recovery.md) | Cookie/CSRF plus file permits and restored access |
| AT-27 | [SP-07](07-standalone-inventory.md), [SP-08](08-development-hierarchy.md) | Accepted local H-01/H-02/H-03 availability defaults |
| AT-28 | [SP-22](22-local-final-acceptance.md) | Isolated full-volume Locust benchmark |
| AT-29 | [SP-19](19-search-export-archive-audit.md) | Controlled formula-safe export and revoked delivery |
| AT-30 | [SP-20](20-local-website-intake.md) | Signed intake and outbox recovery |
| AT-31 | [SP-07](07-standalone-inventory.md), [SP-08](08-development-hierarchy.md) | Standalone categories and mixed development hierarchy |
| AT-32 | [SP-08](08-development-hierarchy.md) | Reusable unit types with independent actual units |
| AT-33 | [SP-12](12-reservations-overlap.md) | Whole-development/unit reservation overlap |
| AT-34 | [SP-13](13-outcomes-reopening.md) | Partial commitment block, stock propagation and reopen |
| AT-35 | [SP-08](08-development-hierarchy.md), [SP-09](09-protected-files-antivirus.md) | Shared project facts then clean/private attachments |
| AT-36 | [SP-08](08-development-hierarchy.md), [SP-10](10-requirements-shortlists.md), [SP-17](17-dashboard-kpis.md), [SP-19](19-search-export-archive-audit.md) | Inventory navigation/shortlist/search/counts |
| AT-37 | [SP-03](03-bootstrap-login.md), [SP-21](21-local-backup-recovery.md) | One-time local bootstrap then restore/replay |
| AT-38 | [SP-04](04-user-administration.md) | Staff handoff and restricted temporary sessions |
| AT-39 | [SP-03](03-bootstrap-login.md), [SP-04](04-user-administration.md), [SP-05](05-leads-contact-identity.md), [SP-11](11-deal-pipeline.md), [SP-17](17-dashboard-kpis.md) | Login/settings/leads/deals then role-scoped metrics |
| AT-40 | [SP-14](14-visit-calendar-working-times.md) | Administrator work policy and company-car hourly cap |
| AT-41 | [SP-08](08-development-hierarchy.md) | Optional safe shared briefing |

## Local coverage and exclusions

The signed local website simulator is the C12 integration target; the actual website is a later configuration. Files use private local storage and real ClamAV. PostgreSQL tests, benchmark and restore use separate isolated databases. Local backup/recovery evidence is not a claim about production disaster recovery.

The named 17 screen families are retained with contextual contact/property/password-change support views as defined in the accepted local screen map. The route count is derived from actual functionality rather than fixed at 19. Deployment, cloud provisioning and unpromoted future catalogue items are outside these sprints.

Browser automation uses real Chrome/Edge desktop plus mobile Chromium/WebKit profiles. Actual iOS Safari/device checks, real staff in-person handoff, real-site integration and real-data policy validation are separately labeled when unavailable; never record them as passed by simulation.

