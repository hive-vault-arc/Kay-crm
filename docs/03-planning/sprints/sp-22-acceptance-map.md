# SP-22 cumulative local acceptance map

Execution date2026-10-16. Read [the live execution ledger](sp-22-execution.md)
for actual counts, failed attempts, corrected reruns and current gate status.
This is a mapping, not a blanket pass declaration. Product review remains Khalid's.

Backend references below are real modules under `backend/tests/`; browser
references are under `frontend/tests/e2e/` unless explicitly native. One complete
481-case backend invocation produced479 passes/two failures; both were corrected,
then23 affected/current recovery/cumulative checks passed. The new cumulative
case brings the current inventory to482 distinct cases, all observed passing
across those corrected runs. Do not describe this as one clean482-case run.
All130 original business browser variants plus4 focus variants pass across the
complete/corrected runs, with final native5/5, affected shell3/3, development
component1/1 and final-source restore1/1. Four bounded CLI unit cases bring the
current backend inventory to486, all observed passing across those runs. No
single clean486 backend/134 browser invocation is claimed. AT28 passes only in
the explicit4-process configuration; full results and retained failures in ledger.

| Scenario | Backend evidence | Browser/other evidence | Implemented local variant and limits |
|---|---|---|---|
| AT-01 | test_users.py, test_auth.py, test_bootstrap.py | users.spec.ts; auth.spec.ts | Named roles/password policy/login; local bootstrap separate; real staff handoff not simulated as delivered. |
| AT-02 | test_users.py, test_auth.py, test_files.py, test_recovery.py | users.spec.ts; auth.spec.ts; recovery.spec.ts | Current password/reset/revocation/expiry; copied or old permits fail. |
| AT-03 | test_contacts.py, test_contact_edges.py | leads.spec.ts | Required identity, E.164 phones/primaries, invalid and same-name distinct contacts. |
| AT-04 | test_ownership.py, test_ownership_edges.py, test_final_acceptance.py | leads.spec.ts; ownership.spec.ts | Reuse/private denial; confirmed same/cross-portfolio merge, race/rollback/replay and stable origins. |
| AT-05 | test_ownership.py, test_ownership_edges.py, test_deal_links.py | ownership.spec.ts | True collaborators/actors, primary transfer, former-current denial. |
| AT-06 | test_inventory.py, test_files.py, test_file_edges.py | inventory.spec.ts; files.spec.ts | Team inventory/clean images versus private owner documents; manager writes. |
| AT-07 | test_requirements.py | requirements.spec.ts | Independent required/preferred criteria, unknown versus zero and exact offering target. |
| AT-08 | test_requirements.py, test_inventory.py | requirements.spec.ts; inventory.spec.ts | Exact Decimal month/year MAD, original period and unsupported currency rejection. |
| AT-09 | test_reservations.py, test_reservation_http.py | reservations.spec.ts | Independent-connection single winner; sale/rental coexist; no automatic expiry; flagged competitors. |
| AT-10 | test_outcomes.py, test_outcome_edges.py, test_outcome_sql.py | outcomes.spec.ts | Sale withdraws unfinished rental/releases hold; rental keeps sale with occupancy. |
| AT-11 | test_outcomes.py, test_outcome_hierarchy.py | outcomes.spec.ts | Privileged external outcome changes stock, not KAY win/income. |
| AT-12 | test_deals.py, test_deal_edges.py, test_outcomes.py | deals.spec.ts; outcomes.spec.ts | Explicit creation, stage skip/proposal acceptance versus mandatory close facts. |
| AT-13 | test_outcomes.py, test_outcome_edges.py, test_report_edges.py | outcomes.spec.ts; finance.spec.ts | Reasoned reopening keeps originals, adjusts current KPIs and blocks intervening-stock conflict. |
| AT-14 | test_finance.py, test_finance_edges.py, test_finance_http.py | finance.spec.ts; outcomes.spec.ts | Optional commissions, fixed/percentage bases; server-side agent finance denial. |
| AT-15 | test_finance.py, test_finance_edges.py | finance.spec.ts | Exact partial collection/balance/excess rejection; retained correction actor/reason/replacement. |
| AT-16 | test_schedule.py, test_schedule_edges.py, test_schedule_http.py | schedule.spec.ts | Explained overlap distinct from hard errors; private free/busy; CRM-only availability. |
| AT-17 | test_work.py, test_work_edges.py, test_work_process_migration.py | work.spec.ts | 1d/1h/task due, deduplicated retry, real worker death/restart, reschedule/cancel invalidation. |
| AT-18 | test_reports.py, test_report_edges.py | reports.spec.ts | Current portfolio versus immutable close attribution and true contributor; private totals denied. |
| AT-19 | test_reports.py | reports.spec.ts | Exact 30/14-day warnings, no 29/13-day warning or automatic mutation. |
| AT-20 | test_imports.py, test_import_http_migration.py | imports.spec.ts | Strict contact CSV, row errors/skips, row/fallback active agent, role denial. |
| AT-21 | test_imports.py, test_import_http_migration.py | imports.spec.ts | All-or-nothing precommit crash, committed retry, concurrent phone claim and duplicate-in-file. |
| AT-22 | test_contacts.py, test_discovery.py, test_intake.py | leads.spec.ts; discovery.spec.ts; intake.spec.ts | Numbered scoped pages/sort/totals plus synthetic signed source same/new submission semantics. |
| AT-23 | Domain HTTP/negative tests and source provenance review | 77 compiled Chrome variants;19 each Edge/mobile Chromium/mobile WebKit through corrected runs; native5/5 plus final shell3/3/component1/1/current restore1/1 | Keyboard/touch/actual200%, state retention/focus/44px/contrast; real Android/iOS devices NOT RUN; broader V3 product/design review pending. |
| AT-24 | test_ownership.py, test_discovery.py, test_discovery_http_migration.py | ownership.spec.ts; discovery.spec.ts | Archive/restore retains current links/authors; 24-month security-only retention, no contact/transaction expiry. |
| AT-25 | test_recovery.py, affected test_foundation.py | recovery.spec.ts; native restoredJourney | Coherent real PG18/files restore, hashes/rights/version and measured synthetic laptop RPO/RTO; not full-volume DR. |
| AT-26 | test_foundation.py, test_auth.py, test_files.py, test_file_edges.py, test_recovery.py | auth.spec.ts; files.spec.ts; mobile-webkit-final selected cases | Facade/CSRF/cookies, private transfer20MiB/copy/consume/revoke, infected/unfinished denial. WebKit emulation is NOT actual Safari. |
| AT-27 | test_inventory.py, test_developments.py, test_development_edges.py | inventory.spec.ts; developments.spec.ts | D29 incomplete drafts versus priced/legal-owner availability; developer alone insufficient; multiple owners. |
| AT-28 | benchmarks.dataset, benchmarks.plans, benchmarks.run, benchmarks.locustfile | Actual HTTPS/session/CSRF Locust workload,4 API processes | PASS:100accounts/200kcontacts/20kphysical properties;100 concurrent,60.261s steady/6285 requests/0 errors; ordinary p95≤630.064ms/dashboard1314.907ms. Single-process attempts failed and remain recorded. |
| AT-29 | test_discovery.py, test_discovery_http_migration.py | discovery.spec.ts | Manager CSV formula/phone safety, attribution; current authority gates generation/delivery. |
| AT-30 | test_intake.py, test_intake_process.py | intake.spec.ts | Signature/body/time/replay/role negatives; durable202 and killed worker recovery without duplicate or owner leak. |
| AT-31 | test_inventory.py, test_developments.py, test_development_edges.py | inventory.spec.ts; developments.spec.ts | Four standalone categories/mixed hierarchy, same-project floor/type, duplicate/ref/reparent/archive/agent denial. |
| AT-32 | test_developments.py, test_development_edges.py | developments.spec.ts | Reused types do not overwrite independent physical facts; templates never offered/reserved. |
| AT-33 | test_reservations.py, test_reservation_http.py | reservations.spec.ts | Whole/unit same-kind overlap single winner/retry; exact offering targets, not structural nodes. |
| AT-34 | test_outcome_hierarchy.py, test_outcome_sql.py, test_outcome_edges.py | outcomes.spec.ts | Q06 safe partial-development block/review, opposite hold review, whole propagation and stock-aware reopening. |
| AT-35 | test_development_edges.py, test_files.py, test_discovery.py | developments.spec.ts; files.spec.ts; discovery.spec.ts | Safe shared hierarchy/clean project files never expose private developer identity/documents via IDs/search/counts/exports/errors. |
| AT-36 | test_developments.py, test_requirements.py, test_reports.py, test_report_edges.py | developments.spec.ts; requirements.spec.ts; reports.spec.ts | Hierarchy filters/navigation/direct children, exact target, separate physical/programme/offering totals, stale warnings, unchanged CSV. |
| AT-37 | test_bootstrap.py, test_auth.py, test_recovery.py | auth.spec.ts (normal/restricted login), recovery.spec.ts | TTY-only atomic one-admin/credential/marker/audit, repeat/race/input/interruption denial and recovered bootstrap block. |
| AT-38 | test_users.py, test_auth.py | users.spec.ts; auth.spec.ts | Once-only24h pending-handoff credential, administrator reauthentication/reset and restricted change/fresh login. In-person identity is human-only. |
| AT-39 | test_auth.py, test_contacts.py, test_deals.py, test_reports.py, test_final_acceptance.py | auth.spec.ts; leads.spec.ts; deals.spec.ts; reports.spec.ts; acceptance.spec.ts | Scope parity/roles/navigation, no automatic deal/contact duplicate, numbered columns/preferences, revoked/expired recovery and persisted restart. |
| AT-40 | test_schedule.py, test_schedule_edges.py, test_schedule_http.py, test_schedule_migration.py | schedule.spec.ts | Admin-only policy/defaultoffice, work/lunch/car cap race, explicit impact, no override, Casablanca/DST/hour boundaries. |
| AT-41 | test_developments.py, test_development_edges.py | developments.spec.ts | Nullable shared briefing may be added/cleared by M/A, no availability block or private owner/developer disclosure. |

## Cumulative contact-link review

The authoritative merge path is `app/contacts/merge.py`, not parallel per-module
merges. Its20 declared table policies cover contact alias, identity value copy,
role union, survivor-only collaborators, enquiries, assignment/history/audit,
current-authority idempotency, property/development owner/developer links,
private documents, independent requirements, deals/history, visits, tasks and
immutable import-row origins. The live PostgreSQL FK registry is checked before
merge; an unregistered contact-FK table fails closed as MERGE_LINKS_UNSUPPORTED.
Finance remains reached through its immutable deal/commission/receipt parents;
shortlists through requirements, visit participants and task history retain their
own identities. They do not become an alternative ownership bypass.

`test_final_acceptance.py` assembles inventory, requirement, deal, document,
visit and task together with imported and signed-intake/finance evidence. It
tests precommit rollback, exact-key retry/replay, current-parent reattachment,
retained origins, no automatic collaborator union and old/current agent denial.
Module merge tests additionally assert immutable author/event/target facts.
No production history guard, authorization or scanner constraint is disabled.

