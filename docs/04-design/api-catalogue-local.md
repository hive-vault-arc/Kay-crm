# Executable local API catalogue (SP-22)

Generated from `create_app().openapi()` on2026-10-16, not a proposed route list.
OpenAPI3.1.0: **123 paths / 153 operations**. Schema SHA256:
`5dedb3ebe6348ddae246d0182d735856a9676841ab916de0ab5b596468805147`.
Reproduce from backend/ with `.venv/Scripts/python.exe -m benchmarks.catalog`;
the protected ignored result is `.local-data/acceptance/openapi.json`.
No public documentation/bootstrap/backup endpoint is exposed.

The [API contract](api-contracts.md) and module contracts describe semantics;
this inventory records the implemented transport surface. Current PostgreSQL
sessions and role/contact authority remain authoritative. Staff mutations use
facade authority, exact Origin, session-bound CSRF and command idempotency where
specified. Signed website intake is a different source-authenticated boundary.
Private transfer endpoints use scoped short-lived one-action permits, not public
URLs. Health liveness is public; readiness requires server-only facade authority.

The frontend does **not** use an OpenAPI-generated SDK. Its typed client is
`frontend/src/lib/api/client.ts` (Zod response validation), `command.ts`
(current-session CSRF) and per-feature `contracts.ts`/`facade.ts` modules for
contacts, users, inventory, files, requirements, deals, schedule, work, finance,
reports, imports and discovery. Auth contracts live under `lib/auth`.
Actual compiled browser journeys check these projections against this API;
OpenAPI's generic dictionary response annotations alone do not prove full DTO
equivalence. Do not replace the narrow facade with a catch-all proxy.

| Methods | Implemented path |
|---|---|
| GET | `/api/v1/audit/events` |
| POST | `/api/v1/auth/change-password` |
| POST | `/api/v1/auth/login` |
| POST | `/api/v1/auth/logout` |
| GET | `/api/v1/auth/me` |
| PATCH | `/api/v1/blocks/{bid}` |
| GET, POST | `/api/v1/blocks/{bid}/floors` |
| GET | `/api/v1/calendar/availability` |
| GET | `/api/v1/calendar/colleagues` |
| GET | `/api/v1/calendar/context` |
| GET | `/api/v1/calendar/free-busy` |
| GET | `/api/v1/calendar/local-time` |
| GET | `/api/v1/commissions/{cid}` |
| POST | `/api/v1/commissions/{cid}/correct` |
| GET, POST | `/api/v1/commissions/{cid}/receipts` |
| POST | `/api/v1/commissions/{cid}/recognize` |
| GET | `/api/v1/commissions/{cid}/revisions` |
| GET, POST | `/api/v1/contacts` |
| GET | `/api/v1/contacts/assignment-options` |
| POST | `/api/v1/contacts/resolve-phone` |
| GET, PATCH | `/api/v1/contacts/{target}` |
| POST | `/api/v1/contacts/{target}/archive` |
| POST | `/api/v1/contacts/{target}/assign` |
| GET | `/api/v1/contacts/{target}/assignment-events` |
| PUT | `/api/v1/contacts/{target}/collaborators` |
| POST | `/api/v1/contacts/{target}/merge` |
| POST | `/api/v1/contacts/{target}/notes` |
| POST | `/api/v1/contacts/{target}/preview` |
| POST | `/api/v1/contacts/{target}/restore` |
| GET | `/api/v1/contacts/{target}/timeline` |
| PATCH | `/api/v1/customer-offers/{oid}` |
| GET, POST | `/api/v1/deals` |
| GET, PATCH | `/api/v1/deals/{did}` |
| POST | `/api/v1/deals/{did}/close` |
| GET, POST | `/api/v1/deals/{did}/commissions` |
| GET, POST | `/api/v1/deals/{did}/customer-offers` |
| GET | `/api/v1/deals/{did}/history` |
| GET | `/api/v1/deals/{did}/outcomes` |
| POST | `/api/v1/deals/{did}/release-reservation` |
| POST | `/api/v1/deals/{did}/reopen` |
| POST | `/api/v1/deals/{did}/reserve` |
| GET | `/api/v1/deals/{did}/stock-review` |
| POST | `/api/v1/deals/{did}/transition` |
| GET, POST | `/api/v1/developments` |
| GET, PATCH | `/api/v1/developments/{did}` |
| POST | `/api/v1/developments/{did}/archive` |
| GET, POST | `/api/v1/developments/{did}/blocks` |
| POST | `/api/v1/developments/{did}/confirm-availability` |
| POST | `/api/v1/developments/{did}/external-outcome` |
| GET | `/api/v1/developments/{did}/history` |
| GET | `/api/v1/developments/{did}/inventory` |
| GET, PUT | `/api/v1/developments/{did}/owners` |
| POST | `/api/v1/developments/{did}/restore` |
| GET | `/api/v1/developments/{did}/stock-review` |
| GET, POST | `/api/v1/developments/{did}/unit-types` |
| GET, POST | `/api/v1/documents` |
| GET | `/api/v1/documents/{did}` |
| POST | `/api/v1/documents/{did}/archive` |
| POST | `/api/v1/documents/{did}/retry-scan` |
| GET, POST | `/api/v1/enquiries` |
| GET, PATCH | `/api/v1/enquiries/{target}` |
| POST | `/api/v1/enquiries/{target}/assign` |
| GET, POST | `/api/v1/exports` |
| GET | `/api/v1/exports/{eid}` |
| POST | `/api/v1/exports/{eid}/download-permit` |
| POST | `/api/v1/files/permits` |
| PATCH | `/api/v1/floors/{fid}` |
| GET | `/api/v1/health/live` |
| GET | `/api/v1/health/ready` |
| POST | `/api/v1/imports` |
| GET | `/api/v1/imports/{bid}` |
| POST | `/api/v1/imports/{bid}/approve` |
| POST | `/api/v1/imports/{bid}/preview` |
| POST | `/api/v1/imports/{bid}/upload-permit` |
| POST | `/api/v1/intake/website/{source_key}` |
| POST | `/api/v1/intake/website/{source_key}/receipt` |
| GET | `/api/v1/notifications` |
| POST | `/api/v1/notifications/{nid}/read` |
| GET, POST | `/api/v1/offerings` |
| PATCH | `/api/v1/offerings/{oid}` |
| GET, POST | `/api/v1/properties` |
| GET, PATCH | `/api/v1/properties/{pid}` |
| POST | `/api/v1/properties/{pid}/archive` |
| POST | `/api/v1/properties/{pid}/confirm-availability` |
| POST | `/api/v1/properties/{pid}/external-outcome` |
| GET | `/api/v1/properties/{pid}/history` |
| PUT | `/api/v1/properties/{pid}/owners` |
| POST | `/api/v1/properties/{pid}/restore` |
| GET | `/api/v1/properties/{pid}/stock-review` |
| GET | `/api/v1/reports/activities` |
| GET | `/api/v1/reports/dashboard` |
| GET | `/api/v1/reports/drill-down` |
| GET | `/api/v1/reports/exceptions` |
| GET, POST | `/api/v1/requirements` |
| GET, PATCH | `/api/v1/requirements/{rid}` |
| POST | `/api/v1/requirements/{rid}/shortlist` |
| DELETE | `/api/v1/requirements/{rid}/shortlist/{oid}` |
| GET | `/api/v1/search` |
| GET, POST | `/api/v1/tasks` |
| GET, PATCH | `/api/v1/tasks/{tid}` |
| POST | `/api/v1/tasks/{tid}/cancel` |
| POST | `/api/v1/tasks/{tid}/complete` |
| GET | `/api/v1/tasks/{tid}/history` |
| GET | `/api/v1/transfers/exports/{eid}` |
| PUT | `/api/v1/transfers/imports/{bid}` |
| GET, PUT | `/api/v1/transfers/{pid}` |
| PATCH | `/api/v1/unit-types/{tid}` |
| GET, POST | `/api/v1/users` |
| GET, PATCH | `/api/v1/users/{target}` |
| POST | `/api/v1/users/{target}/confirm-handoff` |
| POST | `/api/v1/users/{target}/disable` |
| POST | `/api/v1/users/{target}/reset-password` |
| GET, PUT | `/api/v1/visit-schedule/policy` |
| POST | `/api/v1/visit-schedule/policy/preview` |
| GET, POST | `/api/v1/visits` |
| GET | `/api/v1/visits/follow-up` |
| GET, PATCH | `/api/v1/visits/{vid}` |
| POST | `/api/v1/visits/{vid}/cancel` |
| POST | `/api/v1/visits/{vid}/complete` |
| POST | `/api/v1/visits/{vid}/confirm` |
| GET | `/api/v1/visits/{vid}/history` |
| POST | `/api/v1/visits/{vid}/reschedule` |
| GET | `/api/v1/work/context` |

No new transport/business contract is introduced by this inventory. No real
website, external messaging or production API access was exercised.

