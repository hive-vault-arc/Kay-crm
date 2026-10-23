# HTTP contracts for `/api/v1`

## Property category selection and facets (2026-10-18)

D39 extends only `GET /properties` with optional `categories`, a≤40-character
unique exact CSV of land/apartment/villa/house/commercial under D40. Omitted means all; explicit empty
means none. Legacy single `category` remains, but providing both is invalid.
Whitespace, unknown/duplicate/trailing values and repeated parameters fail422.
Other resource queries do not gain this field. Existing q/target/hierarchy/
offering/archive/sort/page bounds and current staff authority apply.

Response adds zero-inclusive `category_counts` and `unfiltered_total` for all
matching shared physical properties after those existing non-category filters,
before either category selection and before numbered pagination. Counts/items
share a repeatable-read snapshot. No private owner/contact expansion is added;
property facts remain shared, developer/unit totals remain distinct. The facade
requires complete canonical facets and preserves explicit empty selection.
[Implementation and actual evidence](../03-planning/projects-reference-refresh.md).

## Calendar selection and facets (2026-10-18)

D38 extends `GET /visits` with exact unique CSV `types`/`statuses`, explicit-empty
selection, pre-page filtering and scoped full-range counts. Busy intervals never
return those counts and reject all type/status filters. Existing current-session,
range, page bounds and authorization apply. The
[scheduling contract](visit-scheduling-local.md) defines exact vocabulary and
snapshot semantics; [evidence](../03-planning/calendar-reference-refresh.md)
separates this local extension from full-product acceptance.

## Lead/Deal activities (2026-10-18)

`GET/POST /enquiries/{id}/activities` and `GET/POST /deals/{id}/activities`
read/append explicit record-scoped immutable interactions. POST requires the
existing facade/session/origin/CSRF guards and UUID `Idempotency-Key`; accepts
only `kind` (note/call/message/email/meeting/visit/other), required trimmed
`body` (1–4000), optional integer `duration_minutes` (1–1440), optional
`direction` (inbound/outbound) and up to3 distinct trimmed `projects` text labels
(1–160 each). NUL is rejected. No actor, timestamp, record ID, transition or
external send/scheduling input is accepted. Returns `{id}`. Same body/key
replays after current authority checks; changed body is409. A fresh append to
an archived contact is409 CONTACT_ARCHIVED; unauthorized IDs remain404.

GET accepts only unique `page` (1–1000000), `page_size` (1–100, default25) and
optional `kind` (manual kinds above or `system`). POST accepts no query.
The numbered response adds `last_activity_at` and nullable `origin_enquiry_id`;
each item has `id`, `action`, `body`, `reason`, `occurred_at`, captured `actor`,
`duration_minutes`, `direction`, `projects`. Counts/latest refer to the selected
filter under one read snapshot. No-store, bounded facade responses and existing
current contact/Lead authority apply to every read, count and replay.

`GET /deals/{id}/origin-activities` uses only the Deal's explicit `enquiry_id`,
rechecking origin authority. It returns the original entries/IDs/authors/times,
not copies or all Leads for a contact. An authorized manual Deal without origin
returns an empty page with null origin. There is no origin write/edit/delete
route. Conversion's immutable linking event appears in both relevant histories;
manual Lead and Deal entries each have exactly one context. Contact-only legacy
notes are not inferred into either history. Existing version/outcome histories
and authorization remain unchanged.
[Implementation, proposals and evidence](../03-planning/lead-deal-activities.md).

## Current lead/deal qualification contract (2026-10-17)

The owner-requested [IMMO World alignment](../03-planning/leads-deals-immoworld-alignment.md)
supersedes earlier free-title/no-conversion request examples for these routes.
Authenticated `GET /contacts/metadata` returns the bounded calling-code,
country, language, campaign, budget and purchase-intent catalogue. Rating uses
the bounded cold/warm/hot contract and shared client labels.
Manual Lead creation requires budget and client languages; contact identity and
technical source/submission remain canonical. Lead PATCH may include versioned
canonical `contact_fields` with its qualification update.

`POST /enquiries/{id}/convert` accepts only `expected_version`, `project`,
`initial_budget` and `purchase_reasons`. The explicit project choice is exactly
one development, standalone property or external name. Conversion is atomic,
scoped, versioned and idempotent; it derives the display title and never accepts
a free `title` or creates a second client. `status=converted` exposes retained
converted Leads; the default prospect list excludes them.

`GET /enquiries` also returns `status_counts` for all nine writable states and
`converted`. Counts use the exact authorized, archived/active and filtered rowset
before numbered pagination, in the same read-only repeatable-read snapshot as
the page and total. Missing states return zero; default prospect queries have
zero converted rows. Contact-directory pages do not gain this field.
The Leads toolbar keeps marketing campaign Source separate from immutable
technical Provenance (including signed website intake).

Manual `POST /deals` chooses `contact_id` XOR `new_contact`, requires budget,
purchase reasons and one to three project interests, and refuses `enquiry_id`
or writable `title`. Deal PATCH supports the same qualification and optional
versioned canonical `contact_fields`. Existing stage, stock, proposal and
outcome commands remain separate. Full field bounds, filter vocabulary,
history snapshots, current-scope replay and error behavior are in the
[implemented deal contract](deal-pipeline-local.md).

The [implemented local catalogue](api-catalogue-local.md) was regenerated from
the actual OpenAPI3.1 schema on2026-10-17:125 paths/155 operations. SP-22's earlier
123 paths/153 operations are historical; this extension adds metadata and explicit
conversion. No bootstrap, generic proxy or public fault-control endpoint is
introduced. The catalogue records every method
and path plus the hand-maintained Zod client/facade boundary; this is not a
claim that generic OpenAPI dictionary responses generate complete DTOs.
No unauthenticated bootstrap or recovery endpoint is introduced.

SP-21 has no public backup/restore endpoint. During an owned maintenance pause,
ordinary API requests return 503 with no-store and Retry-After: 30; liveness
remains 200. Admission covers the full response stream. Restored sessions and
permits cannot be reused; fresh sign-in follows the unchanged current-scope
contracts. A missing/stale recovery-ready record fails closed.
[CLI and recovery contract](../06-delivery-and-operations/local-backup-recovery.md).

SP-20 implements signed source-authority intake and signed receipt status at
`POST /intake/website/{source_key}` and `POST /intake/website/{source_key}/receipt`.
[Exact local wire/security contract](website-intake-local.md): five-minute HMAC
window, 8,192-byte and persistent rate bounds, strict role-free input, durable
202, identical-byte replay and only receipt_id/state public output. No staff
session is impersonated. Read projections allow null staff author only for a
true source actor; manual source choices still exclude website.

SP-19's implemented scoped search, own-job CSV export/status, private single-use
delivery, inventory archive/restore and M/A audit shapes are defined in
[discovery contract](discovery-contract.md). Current authority precedes private
lookup/count/projection; export permits are not public URLs. Local backup is
recorded above; full-product acceptance remains SP-22.

Status: SP-02–SP-21 scoped boundaries implemented and verified; remaining routes proposed
Date: 2026-10-16  
Confirmed decisions: roles, record scope, development/unit hierarchy and both offering levels, three visit types and administrator-owned scheduling settings, numbered pagination, MAD, atomic import, revocable sessions, one connector, and direct file transfer.  
Technical proposals: JSON shapes, HTTP codes, page sizes, permit lifetime and retry keys; the approved local roadmap selects atomic lead creation and Q-07 touched-hour counting.  
References: [rules](../02-requirements/business-rules.md), [data model](data-model.md), [architecture](architecture.md), [permissions](../../permissions.md), and [tests](../05-quality/acceptance-tests.md).

## Common conventions

SP-18's implemented contact-only CSV, protected direct upload, row/agent preview,
snapshot-bound atomic approval and permanent batch retry contract are defined in
[local contact import](contact-import-local.md). No inventory import or export
is introduced. Current M/A authority precedes metadata and approved-result replay.

SP-17's implemented read-only dashboard, activity, exception and identically
scoped numbered drill-down contracts are in [local reporting](dashboard-local.md).
Strict period/scoped series/unit metadata and current authority apply to all.

SP-02 implements only `GET /api/v1/health/live` (public safe liveness) and
`GET /api/v1/health/ready` (server-facade authority and a real PostgreSQL round trip).
Successful bodies are `{"status":"live"}` or `{"status":"ready"}`. Missing/invalid
`X-Kay-Facade-Secret` on readiness returns 403; unavailable PostgreSQL returns
503 `DEPENDENCY_UNAVAILABLE`. Responses carry `X-Request-ID` and `Cache-Control:
no-store`; errors use the safe envelope below with French messages and no raw
exception/input/connection details. The SP-02 Next facade initially allowlisted only
these health GETs, generates request IDs, validates upstream status bodies and
rejects query parameters or other paths. It forwards no arbitrary browser headers.
The secret and local CA path stay server-only; local TLS uses explicit CA trust.
See [SP-02 evidence](../03-planning/sprints/sp-02-evidence.md). This does not implement
business authentication in SP-02. SP-03 adds the exact auth boundary below and
SP-04 adds the account-administration contract; SP-05 adds scoped contacts and
enquiries below. File permits and other business modules remain later work.

### SP-07 standalone inventory wire contract

All inventory routes reuse the current staff session/facade proof. All active
staff read shared facts. Under D34, all active staff may POST/PATCH property
facts; owner/offering/availability/lifecycle commands remain M/A-only. Every
mutation requires Origin/CSRF and UUID `Idempotency-Key`. Agency → current actor → property locks
serialize mutations, rechecking authority after waits. Receipt replay requires
current write authority; the 24-hour HMAC-bound receipt returns only
`{property_id,offering_id:null|uuid,version,event_id}`, never cached owner identity.

- `GET /properties`: `q` (reference/name/location), `category`, `offering_kind`,
  `state`, `sort=reference|-updated_at`, numbered `page`/`page_size` (default50,
  max100). Current offerings determine active filters; `state=withdrawn` searches
  retained campaigns. Stable ID tie-break, safe shared total. Private contact
  names/IDs/phones are not searchable inventory filters.
- `POST /properties`: `{reference,category,marketing_name:null|string,
  location:null|string,area_sqm:null|decimalString}`. Category is villa/house/
  apartment/land. Reference trimmed/uppercased and unique; other unknown draft
  facts stay null. `PATCH /properties/{id}` uses those fields plus
  `expected_version`; no hidden reparent/stock/author fields.
- `GET /properties/{id}`: shared facts/current sale and rental campaigns, plus
  `owners:[{marketing_display:null|string,contact:null|{id,name}}]`. A contact
  identity appears only under the caller's separately current Contacts scope
  (including the existing manager archive rule). No owner-link IDs, origin IDs,
  phones, notes or contact documents are returned. An explicit marketing display
  is never defaulted from the contact name.
- `PUT /properties/{id}/owners`: `{expected_version,owners:[{contact_id,
  marketing_display:null|string}]}` replaces the active legal-owner set, maximum
  100 distinct contacts as a technical bound. New links require active canonical
  contacts; removal archives links. Available campaigns cannot lose their last
  legal owner. Multiple owners are supported; no implicit contact access is granted.
- `GET /offerings`: numbered pages, `property_id`, `kind=sale|rental`, `state`,
  `target_level=property`. Returns current and withdrawn campaigns. Hierarchy/
  development targets and filters are deliberately not accepted until SP-08.
- `POST /offerings`: `{property_id,expected_property_version,kind,price_mad:null|
  decimalString,currency:"MAD",price_period:null|"month"|"year",conditions}`
  creates a draft. Sale period must be null; rental period is required even if
  its price is unknown. One current campaign of each kind is enforced in SQL.
- `PATCH /offerings/{id}`: price/currency/period/conditions plus
  `expected_property_version`, `expected_version`, `state` and nonempty `reason`.
  Draft can stay incomplete. Available must keep positive price/legal owner.
  Withdrawal makes the campaign noncurrent and terminal; replacement uses POST.
  Draft cannot bypass confirmation by PATCHing to available. No reserved/sold/
  rented state is accepted in this slice.
- `POST /properties/{id}/confirm-availability`: `{expected_version,offering_id,
  expected_offering_version,reason}` validates positive target price and at least
  one legal owner, sets/reconfirms available and records the true actor/instant.
- `GET /properties/{id}/history`: only numbered page parameters. Immutable events
  retain action, actor snapshot, aggregate/offering versions, state, original
  price/period/conditions and safe inventory reason. Contact merge reasons/names
  are not copied into this shared history. Existing merge previews include real
  legal-owner link counts and bind their state/property versions; merges preserve
  origin/creator/time, archive duplicate active links, retain survivor display,
  do not union staff access, and invalidate stale property edits.

Money/area inputs are positive decimal strings (up to16 integer/2 fractional
digits), or null when unknown; no floats/exponents/zero. Values use numeric(18,2).
Rental responses preserve original `price_mad`, `price_period`, `conditions` and
add exact `annual_equivalent_mad` (month×12, year unchanged); sale comparison is
null. Every property mutation advances its aggregate version; offering changes
also advance that campaign's version. Conflict requires an explicit new version
comparison; clients retain their drafts. Body bound128KiB accommodates the bounded
Unicode owner set; facade response bound2MiB accommodates100 full history events.
Duplicate/unknown query parameters and unknown body fields fail validation. Metadata-only audit and
business history commit atomically with receipt. File transfer remains SP-09.
See [execution evidence](../03-planning/sprints/sp-07-evidence.md) for actual gates.

### SP-08 development wire contract

SP-08 extends the existing inventory module/facade, sessions and strict JSON
schemas. All active staff read safe inventory and, under D34, create/edit shared
development facts, briefing and hierarchy/types. Other commands remain M/A-only, with current
session, Origin/CSRF, UUID Idempotency-Key and expected aggregate version.
Locks follow agency → current actor → development → physical property where
applicable. A development command receipt returns
`{development_id,offering_id:null|uuid,version,event_id}`; property results remain
compatible. Replays recheck current authority and return no cached contact data.

- `GET /developments`: numbered page/page_size (default50/max100), escaped `q`
  over reference/name/location, category, offering_kind, state and stable sort
  reference|-updated_at. Active summaries include separate `unit_count` and
  `available_unit_count` (each physical unit counted once), plus at most two
  current whole-development campaigns. Types and developments are not unit rows.
- `POST /developments` and `PATCH /developments/{id}`: reference80/name160,
  category=mixed|villa|house|apartment|land|commercial, nullable location500/briefing_text/
  developer_contact_id/developer_marketing_display160; PATCH adds expected_version.
  Omitted developer_contact_id on PATCH preserves the association; explicit null
  requests removal. An agent must have scope for any changed current/new developer.
  Receipt fingerprints distinguish omission from explicit null.
  Reference is normalized uppercase and unique in the development namespace.
  Proposed classification `mixed` is the local default; mixed unit categories
  remain allowed. Blank briefing normalizes to null; proposed bound10,000 Unicode
  characters, plain shared text rendered without HTML execution.
- `GET /developments/{id}` includes briefing and safe developer/owners links.
  Each link is `{marketing_display,contact:null|{id,name}}`; identity requires
  separately current Contacts scope. No raw developer ID, owner-link/origin IDs,
  phone, private note or contact document appears through inventory. Explicit
  marketing text is not automatically copied from a private contact.
- `GET/POST /developments/{id}/blocks`, `GET/POST /blocks/{id}/floors`,
  `GET/POST /developments/{id}/unit-types`, and PATCH blocks/{id}, floors/{id},
  unit-types/{id}. Reads are separate numbered pages. Block/floor commands take
  expected_version (development version), code40, label160, display_order≥0.
  Type commands take expected_version, matching development_id, code40, label160,
  physical category and nullable default_area_sqm/default_rooms (positive1–1000).
  Codes normalize uppercase and are unique in their parent scope. Levels are
  not stock; there is no offer/reservation route for them. Referenced type
  category changes return STOCK_REVIEW_REQUIRED; no endpoint silently reparents.
- Property create/edit additionally accepts nullable development_id/floor_id/
  unit_type_id/rooms. Apartment children need a same-development floor and type
  of matching category; standalone assets have all three links null. Other
  categories can attach directly. Explicit unit area/rooms never follow later
  template edits. Identity/hierarchy changes after any campaign reference fail
  with STOCK_REVIEW_REQUIRED (conservative local guard, not a stock migration).
- `GET /properties` adds development_id/block_id/floor_id/unit_type_id and
  target_level=standalone|unit for physical filtering. Child projections include
  safe development/block/floor/type breadcrumb labels; standalone responses
  remain compatible. No private contact-name search or unbounded tree is added.
- `GET /developments/{id}/inventory`: numbered physical-unit page, safe parent
  summary and q/block_id/floor_id/unit_type_id/category/offering_kind/state
  filters. Default state=available; explicit state=all includes drafts/no-offer
  units. Selected hierarchy paths filter real unit rows, not fictitious stock.
- `GET/PUT /developments/{id}/owners`: same explicit ≤100 legal-owner set and
  archive-preserving behavior as property owners. Available campaigns cannot
  lose their last legal owner. A developer or the parent/child relation does not
  automatically create a legal-owner link on another target.
- `POST /offerings` accepts exactly one property_id/development_id. Development
  campaigns require expected_development_version instead of
  expected_property_version; PATCH uses the corresponding parent version plus
  campaign expected_version. Price/period/state/withdrawal rules remain SP-07.
  GET offerings adds development_id and target_level=property|development.
- `POST /developments/{id}/confirm-availability`: same versioned offering/reason
  command as physical stock. Requires a known positive target price and legal
  owner; category=apartment also requires a real block/floor/apartment. Empty
  briefing remains valid. Whole campaigns change no unit campaign or history.
- `GET /developments/{id}/history` is numbered immutable true-actor history;
  legacy `property_version` names the event's aggregate version on either target.
  Typed development IDs also link audit/receipts. Developer/owner contact merge
  preserves owner origin/creator/time, survivor display and current scope,
  advances affected aggregates and binds real linked counts/versions in previews.
- Archive/restore development commands are versioned, reasoned and noncascading.
  Any physical child or current whole campaign blocks archive with
  STOCK_REVIEW_REQUIRED. There is no destructive hierarchy-delete API. Further
  lifecycle UI is implemented in SP-19; deals/reservations/overlap are implemented in SP-11/12,
  while outcomes remain SP-13.

Body bound128KiB, facade response2MiB, duplicate/unknown query/body rejection,
decimal strings and no-store remain unchanged. See [SP-08 execution](../03-planning/sprints/sp-08-evidence.md)
for actual verification and technical/product acceptance status.

### SP-03 implemented identity wire contract

All four auth routes require server-only `X-Kay-Facade-Secret`. `POST` also
requires the exact configured frontend Origin. Authenticated proof is forwarded
only from the protected cookie as `X-Kay-Session`, never a browser role/header.
Authenticated writes additionally require the session-bound `X-CSRF-Token`
obtained transiently through `GET /auth/me`. No HTTP bootstrap/sign-up exists.

- `POST /auth/login`: strict JSON `{email,password}`; normalized email, generic
  401 `INVALID_CREDENTIALS` for unknown/wrong/inactive/pending/expired credentials.
  Backend success returns `{session_token,expires_at}` only to the facade, which
  strips the token, sets `__Host-kay_session`, and returns `{signed_in:true}`.
- `GET /auth/me`: `{user:{id,display_name,email,role},must_change_password,
  expires_at,csrf_token}`. Current session, account, credential, role/version and
  temporary expiry/handoff are checked, not a cached authorization claim.
- `POST /auth/logout`: revokes the current session, audits, returns
  `{signed_out:true}`; facade clears the cookie after success. Missing/expired
  proof returns 401 `UNAUTHENTICATED` and clears the stale cookie.
- `POST /auth/change-password`: strict `{old_password,new_password}`; correct
  current password and 12-1,024-character new password different from the old
  one. Atomically replaces Argon2id hash, clears temporary state, increments
  credential version, revokes all own sessions and audits. Returns
  `{fresh_login_required:true}` and clears the cookie; no automatic re-login.

Private/auth responses are `no-store`. The cookie is host-only, Secure,
HttpOnly, SameSite=Lax, Path=/, maximum seven days. No browser token storage.
Restricted sessions can use only me/change-password/logout, with a fresh login
after change. Other full-session dependencies return 403
`PASSWORD_CHANGE_REQUIRED`; role denials use 403 `FORBIDDEN`.

Implementation proposals, not business-policy changes: auth JSON at most 8 KiB,
password input at most 1,024 characters; persistent atomic HMAC-keyed counters
allow five sign-in attempts per normalized identity per 15 minutes and 300/minute
globally through the local facade. The next attempt returns 429 `RATE_LIMITED`;
a successful sign-in clears its identity counter. Stale counters are cleaned
after a day. Limits apply equally to unknown identities. PostgreSQL failure is
503, never a false sign-in/logout/save or an invented expired session. Test-only
fixture IPC is outside both product servers and refuses the development database.

Use `Content-Type: application/json; charset=utf-8`, UUIDs as strings, RFC 3339 instants with explicit offsets, decimal amounts as strings, and `currency: "MAD"`. Unknown fields are `null` or omitted when optional, never converted to zero. Sensitive writes require an `Idempotency-Key` (client-chosen UUID, proposed 24-hour retention) and integer `expected_version` for existing objects. The same key, body, and actor return the original result; the same key with a different body returns `409 IDEMPOTENCY_CONFLICT`. A new business action gets a new key. Creates are retry-safe too. The server validates timestamps and amounts.

Local SP-03 uses a session-bound CSRF token available through same-origin auth/me and an X-CSRF-Token header plus Origin validation for authenticated writes; login also validates Origin. Keep tokens out of logs/browser persistence. Local SP-04 rejects disabling/demoting the last active administrator with a safe 409 LAST_ADMIN_REQUIRED conflict; it never erases historical actors.

Private lists are filtered before counting. `GET ?page=1&page_size=50&sort=-updated_at` returns `items`, `page`, `page_size`, `total`, `has_next`, and `has_previous`; the proposed maximum `page_size` is 100. `id` provides a stable secondary sort. The UI shows page numbers, Next, and Previous. A page beyond the end returns an empty list and the true scoped total; deep pages remain part of the benchmark. Errors use `{"error":{"code":"...","message":"...","field_errors":{},"request_id":"..."}}`. Codes stay in English; user-facing messages are localized in French in the product.

| HTTP | Code | Situation |
|---|---|---|
| 400/422 | `VALIDATION_ERROR`, `INVALID_PHONE`, `INVALID_MONEY`, `INVALID_STATE`, `INVALID_HIERARCHY` | Invalid syntax, field rule, or cross-development block/floor/type link. |
| 401 | `UNAUTHENTICATED`, `SESSION_EXPIRED` | Missing, revoked, or expired session. |
| 403 | `FORBIDDEN` | Role forbidden for an operation whose existence may be disclosed. |
| 404 | `NOT_FOUND` | Missing resource or private resource outside the caller's scope; no existence leak. |
| 409 | `PHONE_OWNED_ELSEWHERE`, `DUPLICATE_CONFIRMATION_REQUIRED`, `VERSION_CONFLICT`, `RESERVATION_CONFLICT`, `STOCK_REVIEW_REQUIRED`, `DEVELOPMENT_OVERLAP`, `PARTIAL_DEVELOPMENT_REVIEW_REQUIRED`, `IDEMPOTENCY_CONFLICT` | Controlled resolution; overlap conflicts identify only shared inventory references and authorized fields. `PHONE_OWNED_ELSEWHERE` returns only `responsible_agent.display_name`, with no contact ID or details. |
| 409/422 | `VISIT_SCHEDULE_NOT_CONFIGURED`, `VISIT_OUTSIDE_WORKING_HOURS`, `VISIT_LUNCH_BREAK`, `COMPANY_CAR_CAPACITY_FULL` | Off-site booking violates the current administrator-owned schedule; a conflict-confirmation reason cannot bypass it. Office booking does not use these gates. |
| 409/422 | `IMPORT_REPREVIEW_REQUIRED`, `INVALID_IMPORT_ROWS`, `OVER_COLLECTION` | Race or impossible approval; details visible only to the authorized importer. |
| 413/415 | `FILE_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE` | Transfer over 20 MB or rejected type. |
| 423 | `FILE_PENDING_SCAN`, `FILE_REJECTED` | Download unavailable before a clean scan verdict. |
| 429/503 | `RATE_LIMITED`, `DEPENDENCY_UNAVAILABLE` | Controlled retry; never falsely confirm a save. |

## SP-05 implemented contact and enquiry wire contract

All ten routes require facade authority and a current full staff session.
Origin/CSRF apply to POST/PATCH, including the read-like phone resolver; create
and edit commands also require a UUID `Idempotency-Key`. Contact JSON is bounded
at 32 KiB; existing auth/users limits remain 8 KiB. The facade validates explicit
success/error projections, accepts at most 512 KiB for these list responses and
does not become a generic proxy. Private reads/errors are no-store.

| Method and path | Strict input / output |
|---|---|
| GET `/contacts` | Numbered page of summaries: id, name, type, primary_agent `{id,display_name}`, primary_phone, nullable primary_email, version. |
| POST `/contacts` | Contact fields below, optional primary_agent_id; returns full contact. |
| GET/PATCH `/contacts/{id}` | Detail adds phones/emails/roles, source, nullable source_submission_id, created_by_user_id, created_at, updated_at. PATCH is full editable contact fields plus expected_version; no ownership/provenance fields. |
| POST `/contacts/resolve-phone` | `{phone}`; `{available:true}` or the safe duplicate/private 409 below. No writes or receipt. |
| GET `/contacts/assignment-options` | M/A-only paginated active final-password agents, `{id,display_name}` only; q/page/page_size. Needed for permitted ownership choice, not access to administrator `/users`. |
| GET `/enquiries` | Numbered page: id, contact summary, message_preview (160 characters), source, nullable source_submission_id/assigned_agent, received_at, updated_at, created_by_user_id, status, version. |
| POST `/enquiries` | Exactly one non-null contact_id XOR new_contact; message (0–4000), source, optional source_submission_id UUID and assigned_agent_id. Creates contact+enquiry atomically when new_contact is used; returns detail. |
| GET/PATCH `/enquiries/{id}` | Detail replaces message_preview with full message. PATCH accepts only expected_version, message, status; assignment/contact/source/received_at are immutable here. |

Contact fields: required trimmed name (1–160), type `person|organization`,
phones (1–10 `{number,label,is_primary}`), optional emails (0–10
`{email,label,is_primary}`), roles (distinct buyer/seller/owner/tenant/developer).
Label maximum 40; exactly one primary phone and one primary email if nonempty.
Maintained phonenumbers 9.0.41 validates +/00 international input and emits E.164;
no country guessing/extensions, repeated canonical values or zero/multiple
primaries. Emails are normalized. Unknown/forged fields are rejected, not dropped.

Local implementation proposals: source vocabulary manual/phone/email/in_person/
referral; status new/in_progress/closed (not deal stages). New contact provenance
is server-populated from the command/actor; website intake is not exposed here.
An agent owns a new contact and defaults enquiry assignment to self. M/A select
an active final-password staff agent as responsible; they may create an unassigned
enquiry for their queue. Agents cannot set another owner/assignee. Any assignee
must currently have contact scope. Dedicated assignment/collaboration is SP-06.

Contact access is M/A or current primary/collaborator; archived/private IDs are
404. Agents do not see the unassigned manager queue even on their own contact.
Scope precedes literal name/phone/email search, filters, count, stable sort and
page. Both count/page/projections use one read-only REPEATABLE READ snapshot.
Query allowlist: q (≤160), page 1–1,000,000, page_size 1–100 (default50), sort
`-updated_at|-received_at|name`; enquiry filters status/source/assigned_agent_id
(the UI offers this picker to M/A)/received_from/received_to/contact_id. An agent's
explicit assignment filter never broadens contact scope. Dates use Africa/Casablanca;
reversed ranges, repeated/unknown parameters and inapplicable filters fail 422.

Safe conflicts: accessible `DUPLICATE_CONFIRMATION_REQUIRED` includes only
`contacts:[{id,name}]` and requires explicit reuse in the next command.
`PHONE_OWNED_ELSEWHERE` includes only `responsible_agent:{display_name}` beyond
the safe envelope, never contact/user ID, name, phone, email or matched number.
All proposed phones are checked; any private conflict takes priority over an
accessible match. `VERSION_CONFLICT` includes the current authorized projection;
the UI keeps the draft and requires explicit load-current or replace-current.
Missing/private IDs stay indistinguishable.

Receipts are actor/route/key scoped, HMAC-bound to normalized input, expire at
24h and store explicit private projections (no auth secrets). Same action/body
replays its result only after current resource scope is rechecked; changed input
returns IDEMPOTENCY_CONFLICT. Source/submission uniqueness independently prevents
duplicate enquiries. Agency → acting user → resource locks recheck current
identity after waiting; effect, audit and receipt are one transaction. Local
serialization is a correctness trade-off, not load acceptance. No merge, archive,
assignment/history, website connector or deal endpoint is added in SP-05.
See [execution evidence](../03-planning/sprints/sp-05-evidence.md).

## SP-06 implemented ownership/history wire contract

Implementation exists; verification and acceptance are tracked in
[SP-06 evidence](../03-planning/sprints/sp-06-evidence.md), not inferred from this contract.
All routes retain current PostgreSQL identity, facade authority, no-store, exact
Origin and CSRF for mutations. IDs outside current scope return indistinguishable
404s. M/A alone changes ownership/collaboration or archive/restore. An agent may
merge only when both exact active contacts are currently writable in S.

`POST /contacts/{id}/preview` accepts a strict intent: `operation`, positive
`expected_version`, nonempty `reason` (1–1000 characters), and only that
operation's fields. `assign` requires `primary_agent_id`, with optional
`retain_previous` (false by default). `collaborators` requires the complete
distinct `collaborator_ids` list (at most100; active final-password agents,
excluding the primary). `merge` requires an explicit different `survivor_id`
and `survivor_expected_version`. `archive` and `restore` accept no target fields.
The source is the URL contact. Preview has no business effect or retry receipt.

Preview returns `preview_token` and `impact`: both authorized contact identities,
explicit `primary_agent_after` (also when the new primary was already a collaborator),
enquiry count, assignments to clear, resulting phone/email counts, lost/gained
agent access, retained collaborators and implemented link modules. The token is
an HMAC of intent plus current identities, eligibility and enquiry IDs/versions;
it is not an authorization grant. Confirmation rechecks the whole impact under
the same agency/contact/phone locks, so a newly linked enquiry invalidates it.

`POST /contacts/{id}/assign`, `PUT /contacts/{id}/collaborators`, and POST
`/archive`, `/restore`, `/merge` accept the corresponding intent plus
`preview_token`. Each requires a UUID `Idempotency-Key`. Return:
`contact_id`, `version`, `event_id`, `operation`. An unknown outcome can retry
the identical body/key; a different body is409 IDEMPOTENCY_CONFLICT. Every replay
rechecks current role and final survivor scope, including old aliases.
OWNERSHIP_VERSION_CONFLICT/IMPACT_CHANGED are409 without private projections;
the UI preserves the reason, explicitly refreshes versions and requests a new
preview. No silent overwrite or automatic merge of stale changes.

Transfer preserves only explicitly retained grants; invalid enquiry assignments
become NULL (manager queue), with incremented enquiry versions and immutable
previous/new/actor history in the same transaction. `POST /enquiries/{id}/assign`
is M/A-only, accepting `expected_version`, nullable `assigned_agent_id` and
`reason`; a non-null assignment must have current contact scope. It returns the
same small command result. An unassigned enquiry is not an agent read.

`POST /contacts/{id}/notes` accepts `kind` (`note`, `call`, `email`, `meeting`,
`other`) and nonempty `body` up to4000 characters, with a UUID retry key. Actor
and time are server-owned. Logging does not send an email or schedule a visit.
No edit/delete history route exists. `GET /contacts/{id}/timeline` and
`/assignment-events` accept only numbered `page`/`page_size` (1–100), returning
the common page envelope. Entries carry typed original-contact/enquiry links,
actor ID/name snapshot, time, action/reason, plus body/related merge contact or
previous/new user snapshots respectively. Canonical history includes merged
ancestors without rewriting their contact IDs or actors.

GET contact detail adds current `collaborators`; contact summaries add nullable
`archived_at`; enquiries add immutable `origin_contact_id`. M/A may read archived
contacts and their enquiry/history links and filter lists by `archive=active`
(default), `archived` or `all`; agents are denied non-active filters and archived
IDs. Normal writes/notes require an active exact contact. Restore preserves IDs,
links and reserved phones, with no automatic expiry. A merged source is an
archived alias, not a second active identity: old read URLs resolve only after
survivor authorization. Restore does not silently unmerge it.

Merge keeps survivor name/type/source/creator/owner/collaboration and primary
values; unions roles and coordinates (at most10 phones/emails), preserves source
values/actors/origins, and reparents current enquiry links with stable enquiry
IDs. Source collaborators are revoked, never unioned. Identity limit or an
unsupported future contact-link module fails closed before mutation. Future
deals/requirements/tasks/visits/documents must extend the same merge path and
cumulative SP-22 regression; no such module is claimed implemented here.

## Route catalogue

### SP-04 implemented account wire contract

Every users route requires facade authority, a current full administrator session,
and exact Origin plus session-bound CSRF for mutations. Restricted sessions,
managers and agents cannot read or administer accounts. D37 replaces the earlier
generated-password/handoff/disable commands; existing staff are not bulk-reset.

- `GET /users?page=1&page_size=50`: safe `items`, numbered page metadata and total.
  Maximum 100; fixed `-updated_at,id` ordering. Backend also accepts the explicit
  `sort=-updated_at`; the current UI facade accepts only page/page_size. Count and
  page come from one PostgreSQL statement/snapshot. `GET /users/{id}` returns the
  same safe account shape: id, display_name, email, role, state, version,
  must_change_password, temporary_expires_at and handoff_confirmed_at. Neither
  returns a hash or temporary plaintext. Deleted accounts are excluded from count
  and page, and their detail returns404. Handoff metadata remains nullable legacy
  compatibility data, not an activation requirement.
- `POST /users`: strict `{display_name,email,role,temporary_password}`. Admin
  chooses12–1024 nonblank characters; only Argon2id persists. Active immediately,
 24-hour initial expiry, mandatory own-password change. Success is only `{user}`.
- `PATCH /users/{id}`: strict named fields plus integer `expected_version`.
  No generic state/credential patch. All saves invalidate target sessions, even
  a name/email edit, because the user version changes. Self-save needs fresh login.
- `POST /users/{id}/confirm-handoff` and `/disable` are removed (404).
- `POST /users/{id}/reset-password`: `{expected_version,admin_password,temporary_password}`. Another
  user only; correct current administrator password required. Replaces the hash,
  revokes target sessions, increments versions and enables immediate restricted
  login using the chosen password. Only `{user}` is returned. Nondeleted legacy
  disabled/pending accounts can explicitly reset; deleted targets return404.
  Self-reset returns409
  USE_OWN_PASSWORD_CHANGE; use the existing own-password screen.
- `DELETE /users/{id}`: `{expected_version}`; marks disabled/deleted_at, revokes
  sessions and hides the account from staff administration. Returns `{user}`.
  Retains identity, unique email and authored CRM FKs; no physical purge/restore.

Every mutation requires a UUID `Idempotency-Key`. Receipts are actor-scoped,
retain an HMAC request fingerprint and non-secret result, and are cleaned after
24 hours on successful commands. A changed body/route with the same key returns
409 IDEMPOTENCY_CONFLICT. Non-secret results replay without another change.
New create/reset/delete commands replay safe metadata without repeating changes.
Passwords participate only in the keyed HMAC fingerprint, never stored results.
Historical secret-issued receipts still return409 ONE_TIME_RESULT_UNAVAILABLE.
Current actor authority is rechecked before replay.

Safe conflicts: VERSION_CONFLICT (stale version), EMAIL_IN_USE, INVALID_STATE,
TEMPORARY_EXPIRED and LAST_ADMIN_REQUIRED. The latter protects the last active
administrator with a final, non-expiring password, not an expiring temporary
administrator. ADMIN_PASSWORD_INVALID is 403, with no target change. Five reset
attempts per acting administrator per 15 minutes share the existing persistent
HMAC-keyed limiter/global bound. These lock/limit/replay choices are verified
implementation proposals, not new product roles or delivery channels.

Commands lock agency first, actor/target users in UUID order, re-read authorization
after waiting, then commit account/credential/session/audit/receipt together.
Invalid, interrupted or losing writes do not partially change access. Request
bodies stay bounded at 8 KiB; upstream response bound is 256 KiB for a maximum
100-row account page. The browser holds entered passwords only in transient
form memory, masks initially and offers deliberate reveal (hidden on field blur).
Success/dismissal clears secret state; unchanged uncertain attempts retain their
key for safe retry. No automatic copy, persistent storage,
public URL, export or external delivery is added. See [SP-04 evidence](../03-planning/sprints/sp-04-evidence.md).

`A` = administrator, `M` = manager, `S` = primary agent or collaborator for the relevant contact, and `R` = any authenticated team member for shared inventory. For any action on a contact, `S` requires a current database check of that contact. A development or property read never includes its developer's or owner's private contact details.

| C | Route and operation | Authority and effect |
|---|---|---|
| C14 | `GET /health/live`, `GET /health/ready` | Local SP-02 foundation: safe status only; readiness checks the real database and returns 503 when unavailable. Never expose connection strings, file paths or secrets. |
| C01 | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/change-password` | Active account; sign-in through facade; own password change requires old password. A temporary-password session is restricted to `/auth/me`, `/auth/change-password`, and logout until the change succeeds, then must sign in again. |
| C01 | `GET /users`, `GET /users/{id}` | A only; numbered pages and safe account/role/state fields. No credential hash or temporary plaintext is returned. |
| C01 | `POST /users`, `PATCH /users/{id}`, `POST /users/{id}/reset-password`, `DELETE /users/{id}` | A; create/reset accept an admin-chosen initial password, return safe user metadata and enable immediate restricted login. Own-password change/fresh login required. Reset also requires `admin_password`. Delete revokes/hides access and retains attribution; no handoff/disable route. |
| C02 | `GET/POST /contacts`, `GET/PATCH /contacts/{id}`, `POST /contacts/{id}/archive`, `POST /contacts/{id}/restore` | M/A or S; archive/restore M/A; name and phone required. |
| C02 | `POST /contacts/resolve-phone`, `POST /contacts/{id}/merge`, `POST /contacts/{id}/assign`, `PUT /contacts/{id}/collaborators` | Explained resolution within scope; assignment and collaboration M/A; cross-portfolio merge M/A. |
| C02 | `GET/POST /enquiries`, `GET/PATCH /enquiries/{id}`, `POST /enquiries/{id}/assign` | These are the UI Leads operations. M/A or S; unassigned queue M/A; assignment M/A and assignee must have current contact scope. A contact transfer clears/reassigns invalid enquiry assignments. A new lead links or creates a contact under the same phone/scope rules; no separate `lead` table. |
| C03 | `GET/POST /requirements`, `GET/PATCH /requirements/{id}`, `POST /requirements/{id}/shortlist`, `DELETE /requirements/{id}/shortlist/{offering_id}` | M/A or S for contact; inventory read under R. |
| C04 | `GET /developments`, `GET /developments/{id}`, `GET /developments/{id}/inventory`, `GET /properties`, `GET /properties/{id}`, `GET /offerings` | R; shared project/physical inventory facts and allowed attachments. Development inventory groups blocks/floors/types/units and separates physical-unit counts from whole-development offerings. |
| C04 | `POST /developments`, `PATCH /developments/{id}` | R under D34 for shared facts/briefing. Developer changes require current contact scope for agents; omitted `developer_contact_id` on PATCH preserves the existing association, explicit null requests removal. Hidden links cannot be removed/replaced by an unrelated agent. |
| C04 | `POST /developments/{id}/archive`, `POST /developments/{id}/restore`, `POST /developments/{id}/confirm-availability`, `POST /developments/{id}/external-outcome`, `PUT /developments/{id}/owners` | M/A; whole-development actions check child commitments and version. Developer/owner contact links never expand private contact scope. |
| C04 | `GET/POST /developments/{id}/blocks`, `GET/POST /blocks/{id}/floors`, `GET/POST /developments/{id}/unit-types`, `PATCH /blocks/{id}`, `PATCH /floors/{id}`, `PATCH /unit-types/{id}` | R under D34; prevent moving a referenced level/type to another development and validate category/floor consistency. |
| C04 | `POST /properties`, `PATCH /properties/{id}` | R under D34; standalone or physical unit facts only, versioned and subject to unchanged hierarchy/committed-stock guards. |
| C04 | `POST /properties/{id}/archive`, `POST /properties/{id}/restore`, `POST /properties/{id}/confirm-availability`, `POST /properties/{id}/external-outcome`, `PUT /properties/{id}/owners`, `POST /offerings`, `PATCH /offerings/{id}` | M/A; offering target is exactly one `property_id` or `development_id`; stock confirmation requires version and reason. Local H-01/H-02 require positive known price/legal owner; later real-data validation remains separate. |
| C05 | `GET /contacts/{id}/timeline`, `POST /contacts/{id}/notes`, `GET /contacts/{id}/assignment-events` | M/A or S; current scope filtering, immutable true actor. |
| C06 | `GET/POST /tasks`, `GET/PATCH /tasks/{id}`, `POST /tasks/{id}/complete`, `POST /tasks/{id}/cancel`, `GET /notifications` | M/A or S according to contact and task; inaccessible private details omitted from notifications. |
| C07 | `GET/POST /visits`, `GET/PATCH /visits/{id}`, `POST /visits/{id}/confirm`, `POST /visits/{id}/reschedule`, `POST /visits/{id}/complete`, `POST /visits/{id}/cancel`, `GET /calendar/free-busy`, `GET /calendar/availability` | M/A or S; three visit types. Ordinary conflict confirmation requires a reason; colleague free/busy excludes private metadata. Off-site working-time and company-car capacity are hard server checks. |
| C07 | `GET /visit-schedule/policy`, `POST /visit-schedule/policy/preview`, `PUT /visit-schedule/policy` | GET returns safe work windows, lunch breaks and company-car capacity to active staff; preview and PUT are administrator-only. PUT is versioned and audited. A changed policy reports affected existing future visits but never silently cancels them. |
| C08 | `GET/POST /deals`, `GET/PATCH /deals/{id}`, `POST /deals/{id}/transition`, `POST /deals/{id}/reserve`, `POST /deals/{id}/close`, `POST /deals/{id}/reopen` | M/A or S; explicit transitions, stock locks, history events. |
| C08 | `POST /deals/{id}/release-reservation` | M/A or S; reviewed deal/offering/target/parent versions, reason and idempotency key; release only this deal's active hold under stock locks, append actor/history, and never close the deal automatically. See [SP-12 local contract](reservations-local.md). |
| C08 | `GET /deals/{id}/stock-review`, `GET /deals/{id}/outcomes` | Current contact scope; safe reviewed stock facts and numbered immutable private outcome/reopening history. See [SP-13 local contract](outcomes-local.md). |
| C04 | `GET /properties/{id}/stock-review`, `GET /developments/{id}/stock-review`, corresponding `POST .../external-outcome` | M/A only; exact offering identity, complete reviewed stock versions/fingerprint, date and safe shared explanation. No KAY win, commission or income. See [SP-13 local contract](outcomes-local.md). |
| C08 | `GET/POST /deals/{id}/customer-offers`, `PATCH /customer-offers/{id}` | M/A or S; accepting an offer does not automatically close. |
| C09 | `GET/POST /deals/{id}/commissions`, `POST /commissions/{id}/recognize`, `POST /commissions/{id}/receipts`, `POST /commissions/{id}/correct` | M/A only; optional module, rejects over-collection and preserves originals. |
| C10 | `GET /reports/dashboard`, `GET /reports/exceptions`, `GET /reports/activities` | M/A team-wide; S aggregates within own scope, drill-down under the same filter. |
| C11 | `GET /search`, `GET /exports`, `POST /exports`, `POST /imports`, `GET /imports/{id}`, `POST /imports/{id}/preview`, `POST /imports/{id}/approve` | Search for S/M/A within scope; import and export M/A only; atomic approval. |
| C12 | `POST /intake/website/{source_key}` | Authenticated website-form server; no staff session required; acknowledge only after durable receipt. |
| C14 | `POST /files/permits`, `GET /documents/{id}`, `POST /documents`, `POST /documents/{id}/archive`, `GET /audit/events` | Permit follows parent scope; audit restricted to M/A; binary `PUT /transfers/{permit_id}` and `GET /transfers/{permit_id}` go directly to FastAPI. |

Command `POST` routes accept documented JSON bodies, not a general `PATCH` that could change roles, commissions, or stock states. `GET /enquiries` backs the Leads list with scoped `q`, `status`, `source`, `assigned_agent_id` where authorized, received-date filters, stable sort, and numbered pages; `GET /deals` uses similarly scoped `q`, `stage`, `assigned_agent_id`, offering-kind and updated-date filters. A configurable UI column set never changes field authorization. `GET /properties` accepts `category`, `development_id`, `block_id`, `floor_id`, `unit_type_id`, `offering_kind`, and availability filters; `GET /offerings` accepts `target_level=property|development`. `GET /developments/{id}/inventory` returns block/floor/type summaries and a numbered unit page, not an unbounded tree. Filters and paginated totals distinguish a whole project from its physical units. `GET /search` can return separate `development` and `property` result kinds; a unit-type match navigates to its real units, not a fictitious stock item. Search routes exclude private records before aggregation. For a colleague, `GET /calendar/free-busy` returns only start/end pairs and busy status; a manager obtains full details through ordinary visit routes. Opaque IDs do not replace authorization.

First-administrator bootstrap remains server-local with no HTTP route. `POST /users` requires completed bootstrap and a current full administrator. Under D37, creation/reset accept a chosen initial password and return no-store user metadata only. New accounts are active without handoff; expired initial passwords and legacy pending/disabled/deleted accounts cannot sign in. A valid initial credential creates a restricted session. Own-password change clears the flag, revokes sessions and requires fresh login; temporary expiry is checked on every restricted request. Existing staff credentials/sessions are not bulk-changed. See the [runbook](../06-delivery-and-operations/admin-bootstrap.md).

An offering's target (`property_id` versus `development_id`) is immutable once referenced by a deal or reservation. `PATCH /offerings/{id}` cannot turn a unit offer into a whole-development offer. Reparenting a committed unit or archiving a development with active child commitments returns `409 STOCK_REVIEW_REQUIRED`; history and child records never disappear through a parent command.

## Lead, project briefing, and visit-schedule additions

The [screen map](screen-map.md) calls an `enquiry` a lead. Atomic `POST /enquiries`
requires exactly one non-null `contact_id` or `new_contact`, a positive/reference
budget and known client languages. A new contact includes name/phones and may
include residence, nationality, emails and permitted primary-agent selection.
Technical source/submission provenance remains distinct from marketing campaign
source and rating. The command creates contact plus enquiry in one transaction.
An accessible duplicate phone requires explicit contact reuse; an inaccessible
phone returns only the approved responsible-agent disclosure. Retry preserves
identity and a failed transaction leaves no partial contact or enquiry. Signed
website receipt processing remains separate and does not invent qualification.
Lead conversion uses `POST /enquiries/{id}/convert`, not manual deal creation
with a copied enquiry ID. Both lists scope search, filters, counts and pages.

Synthetic human Lead example (replace contact facts through the real form):

<!-- qualification-example:NewEnquiry -->
```json
{"new_contact":{"name":"Client synthétique","phones":[{"number":"+212600000001","is_primary":true}],"country":"MA","nationality":"FR","languages":["french","darija"],"roles":["buyer"]},"initial_budget":"500000","campaign_source":"instagram_ads","rating":"warm","source":"phone","message":"Recherche synthétique"}
```

Conversion requires the current Lead version and an accessible project (synthetic
ID below), together with budget and buying intent. It has no writable title:

<!-- qualification-example:ConvertLead -->
```json
{"expected_version":1,"project":{"development_id":"dddddddd-dddd-4ddd-8ddd-dddddddddddd"},"initial_budget":"1000000","purchase_reasons":["residence"]}
```

`GET /developments/{id}` includes nullable `briefing_text` as shared, non-secret project information; `POST /developments` and `PATCH /developments/{id}` accept it from all active staff under D34. `null` or an empty value is valid and does not prevent availability. A safe developer/owner marketing display may be included, but protected contact IDs, phones, files and private notes are never expanded merely because the development is readable/editable by all staff.

`visit.type` accepts exactly `company_car`, `without_company_car`, or `office`. The backend stores UTC instants and evaluates work windows in `Africa/Casablanca`. Both off-site types must fit working periods without lunch overlap; office is exempt. Only company-car visits consume the agency-wide cap, initially 2. Under accepted local Q-07, count each clock-hour interval intersected by `[start_at,end_at)`; an exact end boundary excludes the next hour, and repeated DST hours are distinct offset/UTC intervals. Active scheduled/confirmed bookings count; cancelled/completed visits and drafts do not hold future capacity. Create/confirm/reschedule recheck policy and capacity in one transaction. Availability is a preview, not a booking; ordinary conflict reasons never override work-time/capacity errors.

`GET /visit-schedule/policy` returns the current version, local work windows, lunch breaks and company-car capacity without private visit data. Administrator-only preview validates a proposed policy and reports affected future visits without persisting it. PUT requires expected_version, the reviewed preview_hash and an idempotency key, validates windows/positive capacity, rechecks impact under the lock and appends audit. Existing visits remain recorded. No actual working-day/hour schedule is invented: unconfigured off-site bookings fail, while office visits remain possible. Calendar availability exposes safe capacity/policy version only. The concrete strict fields, route actions, limits, authoritative Casablanca resolver and merge/retry behavior are specified in [the SP-14 local contract](visit-scheduling-local.md); verification is recorded in [the execution ledger](../03-planning/sprints/sp-14-execution.md).

Policy preview body (synthetic Monday-only example, **not** KAY's default working schedule):

```json
{"expected_version":1,"company_car_capacity_per_hour":2,"working_windows":[{"weekday":1,"start_local":"09:00","end_local":"18:00"}],"lunch_breaks":[{"weekday":1,"start_local":"13:00","end_local":"14:00"}]}
```

The response includes `time_zone:"Africa/Casablanca"`; clients cannot change it. `weekday` is ISO 1=Monday through 7=Sunday. PUT uses that proposal plus the returned `preview_hash`; a stale version returns `VERSION_CONFLICT`, and a changed future-visit set returns `SCHEDULE_REPREVIEW_REQUIRED`. Both require review again. `POST /visits` and reschedule bodies include the visit type plus offset-aware start/end instants; the server, not the browser, makes the final work-window and capacity decision.

## Representative examples

Creating a reusable apartment type and a physical unit in a development (C04). The type may be reused on another floor, but neither its template area nor its name is an offering or reservation:

```json
{"development_id":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","code":"T2-80","category":"apartment","label":"T2 / 80 m²","default_area_sqm":"80.00"}
```

```json
{"reference":"ATLAS-B1-F02-07","category":"apartment","development_id":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","floor_id":"ffffffff-ffff-4fff-8fff-ffffffffffff","unit_type_id":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","area_sqm":"80.00"}
```

The first body targets `POST /developments/{id}/unit-types` (the `development_id` must match the path); the second targets `POST /properties`. A standalone land parcel instead has `category:"land"` and null development/floor/type fields. The API rejects an apartment unit whose floor or type belongs to a different development with `INVALID_HIERARCHY`. All active staff can create/edit these records under D34; offering/availability commands remain M/A-only.

Creating a whole-development sale offering uses `POST /offerings` and its own price; a unit sale/rental offering instead uses `property_id` and `development_id:null`:

```json
{"development_id":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","property_id":null,"kind":"sale","price_mad":"25000000.00","price_period":null,"state":"draft"}
```

Before `POST /deals/{id}/reserve` or `/close`, the API locks the development and relevant unit offerings, rechecks versions and active commitments, and returns `DEVELOPMENT_OVERLAP` for a same-kind overlapping reservation. An already sold/leased child unit makes an entire-development close return `PARTIAL_DEVELOPMENT_REVIEW_REQUIRED` until Q-06 is resolved. A conflict response never includes protected developer/owner data.

Creating a manual deal (C08): the current responsible agent is derived from the
contact. The exact stock offering may remain unknown, but a project interest,
budget and buying intent are required. The server derives its display title;
an enquiry cannot bypass the dedicated conversion command.

<!-- qualification-example:NewDeal -->
```json
{"contact_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","projects":[{"external_name":"Projet synthétique"}],"initial_budget":"1000000","purchase_reasons":["residence"],"campaign_source":"facebook","rating":"warm","requirement_id":null,"offering_id":null,"expected_offering_version":null,"stage":"new","next_action":"Rappeler jeudi"}
```

Closing (C08) requires `Idempotency-Key` and `expected_version`:

```json
{"expected_version":7,"outcome":"won","agreed_amount_mad":"1250000.00","completed_on":"2026-10-14","explanation":"Agreement confirmed by both parties"}
```

Private phone conflict (C02), limited response. The actual `message` and `field_errors` text must be localized into French for the product:

```json
{"error":{"code":"PHONE_OWNED_ELSEWHERE","message":"This number belongs to another agent. Request access or a transfer.","field_errors":{"phone":"Already known"},"request_id":"req-example"},"responsible_agent":{"display_name":"Agent B"}}
```

Paginated list response:

```json
{"items":[],"page":2,"page_size":50,"total":73,"has_next":false,"has_previous":true}
```

Commission receipt (C09):

```json
{"expected_version":3,"amount_mad":"2500.00","received_on":"2026-10-14","evidence_document_id":null,"reason":"Partial payment"}
```

A `409 VERSION_CONFLICT` returns the current version and only fields the caller may see. The interface keeps unsaved input in memory while the user compares, reloads, and decides. Concurrent changes are never merged silently.

## SP-11 local deal wire contract

[The implemented deal contract](deal-pipeline-local.md) defines strict fields,
bounds, authority, retries, versions and future-command exclusions. The general
catalogue above includes future commands; only that local subset is implemented.

## SP-10 requirements and manual shortlist wire contract

Implemented locally; current acceptance evidence belongs to
[SP-10 execution](../03-planning/sprints/sp-10-evidence.md), not this contract.
Routes use current revocable staff sessions, explicit facade authority, no-store
and Origin/CSRF on writes. Requirements inherit current linked-contact scope;
private counts/IDs/criteria/feedback are never projected through shared inventory.
Archived contacts are readable by M/A only and cannot be modified. Merged alias
reads authorize the final survivor; searches remain independent after a merge.

- `GET /requirements`: required `contact_id`, numbered `page`/`page_size`
  (default50, max100), stable created_at/id ordering, scoped total and the existing
  has_next/has_previous flags. Summaries include criteria and shortlist_count.
- `POST /requirements`: contact_id, title, intent=sale|rental, currency=MAD,
  nullable decimal-string budget_min_mad/budget_max_mad, budget_period=null for
  sale or month|year for rental, criteria. Returns only id/version.
- `GET /requirements/{id}`: current scope; summary plus up to100 shortlist entries
  containing the actual offering, safe target projection, nullable feedback,
  immutable creator/time and latest editor/time. No arbitrary parent expansion.
- `PATCH /requirements/{id}`: the same editable fields without contact_id, plus
  expected_version. A populated shortlist must be removed before intent changes.
- `POST /requirements/{id}/shortlist`: expected_version, offering_id,
  expected_offering_version, feedback=null|string (facade requires it explicitly).
  Add or update that exact entry; reject mismatched intent, unknown/template IDs,
  stale requirement or offering versions. Selection never reserves stock.
- `DELETE /requirements/{id}/shortlist/{offering_id}`: strict JSON body
  expected_version. Removes only this search's link; inventory is unchanged.

All writes require UUID Idempotency-Key and agency-first current-actor rechecks.
24-hour HMAC-bound receipts retain result identity/version, not private snapshots;
replay reauthorizes the search's current contact. Successful writes advance the
requirement version, retain true actors and atomically append contact timeline/
audit. Stale versions require an explicit comparison, not silent client merging.
Bodies are bounded32KiB; responses2MiB. Unknown/duplicate query/body fields fail.

Criteria proposal: at most one each of category, location, area_sqm, rooms,
parking and elevator (6 total), with importance=required|preferred and a typed
nullable value. Unknown is JSON null, never0/false. Area is a positive decimal
string; rooms a strict positive integer≤1000; parking/elevator a boolean or null;
category is a physical category, location nonempty text≤500. Budgets use positive
numeric(18,2) values or null with ordered bounds. Unsupported currency, nonfinite,
float, exponent, zero and malformed numeric inputs fail. UI decimal commas are
normalized to a point without binary money conversion. Rental responses add
annual_budget_min_mad/annual_budget_max_mad (month×12 or year unchanged), retaining
original budget and period. Technical limits are proposals for product review.

`GET /offerings` now adds safe q/category, block_id/floor_id/unit_type_id,
target_level=standalone|unit (retaining property|development), min_area_sqm,
min_rooms and min_comparison_mad/max_comparison_mad. Comparison is exact PostgreSQL
numeric: rental annual equivalent, sale original price. Comparison bounds allow
18 integer digits for derived annual amounts and must be ordered; original money
remains16 integer/2 fractional digits. A development_id selects its whole offer
and physical units, with target_level narrowing the selection. Existing entries
retain original offering IDs when campaigns are withdrawn/replaced; new reads
show that campaign's current state/original terms, never substitute a replacement.
Floor/type filters select actual units, not template stock. Unknown price/area/
rooms cannot satisfy a numeric bound. No automatic ranking or preference scoring.

Each selected offering has a safe target object: id, level=standalone|unit|
development, reference, label, location, category, area_sqm, rooms,
development_reference, block_code, floor_code, unit_type_code, archived. It has
no owner/developer contact identity. Offerings still retain original price_mad,
price_period, conditions and exact annual_equivalent_mad. A type is descriptive
context only; offering FKs can target only a property or whole development.

## CSV import and website form

The proposed UTF-8 template uses exact headers `name,primary_phone,other_phones,primary_email,other_emails,roles,agent_email,notes`. It uses commas between fields, `|` between multiple values, and CSV quotes around values containing commas. Maintained `libphonenumber` metadata normalizes valid international calling codes; `+` format is recommended to avoid ambiguity. `agent_email` must identify an active agent or be empty when an explicit fallback agent is chosen at approval. A row containing an existing phone is entirely `skipped_existing`. An `invalid` row blocks approval, as do duplicate new phone numbers within the file. `preview` returns row counts, errors by row number, and the file hash. `approve` supplies `preview_hash`, optional `fallback_agent_id`, and a retry key; revalidation, insertion, and the result commit as one transaction. If another user claims a phone between preview and execution, the whole transaction rolls back with `IMPORT_REPREVIEW_REQUIRED`. The CSV limit is 20 MB; 50,000 rows per batch is a proposal to measure.

The real connector still needs configuration. Proposed body: `{"submission_id":"site-123","submitted_at":"2026-10-14T09:00:00+01:00","name":"Test contact","phone":"+212600000000","email":null,"message":"Visit requested","property_reference":null,"source":"kay_website"}`. Source and submission ID are unique together. The website server signs/authenticates calls using a rotating secret outside the browser, a timestamp, and a replay window. A `202` response follows durable recording of the receipt and outbox event; an identical retry returns the same receipt. A known phone reuses its contact without overwriting it, then adds an enquiry. A public browser receives neither contact-existence information nor an agent name. A known private phone is routed internally to its current agent or the manager queue without duplicating the contact.

For local SP-20 the simulator is the configured source and a five-minute replay window is the selected technical default. Use X-Kay-Timestamp (Unix seconds) and X-Kay-Signature (hex HMAC-SHA256 digest) over timestamp text plus a dot and the exact raw request-body bytes. Check the source-specific secret, timestamp and signature in constant time before durable receipt; a changed body for an already-recorded source/submission ID is a conflict, while an identical retry returns the existing receipt. Keep the signing secret server-side in ignored configuration. Actual website URL/authority mapping remains Q-01 and is not needed for the local signed-contract test.
## SP-09 protected-file wire contract

Implementation boundary: contact, development and property attachments only.
Deal documents wait for the real SP-11 aggregate; there is no untyped or invented
deal parent. See [execution evidence](../03-planning/sprints/sp-09-evidence.md)
for actual verification and independent product-review status.

All metadata calls use the existing authenticated, no-store, same-origin facade.
Writes require current session/role/scope, CSRF/Origin and strict bodies; create,
archive and retry-scan also require `Idempotency-Key`. Reads never expose storage
keys, paths, hashes, other-parent identities or scanner diagnostics.

| Method/path under `/api/v1` | Request and result |
|---|---|
| `POST /documents` | `{parent_kind, parent_id, filename, mime_type, size_bytes, purpose?}`; purpose defaults to `attachment`. New property photos require `purpose=photo`, `.webp` and `image/webp`; other property image attachments are rejected. Exactly one existing typed parent; returns document metadata, no bytes |
| `GET /documents` | `parent_kind`, `parent_id`, optional `purpose=photo\|attachment`, numbered `page`/`page_size`; default50, maximum100; excludes archived documents. Property photo filtering includes existing JPEG/PNG/WebP attachments without rewriting their bytes |
| `GET /documents/{id}` | Rechecks current parent scope, including on receipt replay |
| `POST /documents/{id}/archive` | `{expected_version}`; retains versions/history, blocks future grants/transfers |
| `POST /documents/{id}/retry-scan` | `{expected_version}`; only pending scans, refuses a live worker lease; retry is explicit and idempotent |
| `POST /files/permits` | `{action: upload\|download, document_id, expected_version, version_id?}`; download requires a particular clean version; upload appends a new immutable version |
| `PUT /transfers/{permit_id}` | Bytes directly to FastAPI, never through Next; matching MIME/size, no content encoding; returns only `pending_scan` and version ID after publication |
| `GET /transfers/{permit_id}` | Direct authorized clean bytes, attachment disposition, sandbox CSP, no-store; integrity checked before streaming and current scope/session checked per chunk |

Document output: `id`, `filename`, `mime_type`, `purpose`, `size_bytes`, optimistic `version`,
`archived`, and `versions`. Each version exposes only `id`, `state`, safe
`scan_error`, and `created_at`. The projection is bounded to the newest49 plus
the most recent older clean version when needed (at most50); historical versions
remain immutable in storage. States are `awaiting_upload`, `pending_scan`, `clean`
and `rejected`. A dependency failure never becomes a clean verdict.

Property photos are limited to 10 active image documents per physical property,
whether standalone or a programme unit. The server counts legacy image
attachments too, under the existing serialized create transaction, so concurrent
requests cannot exceed the limit. A pending upload or rejected scan still uses
one slot until archived. The UI accepts JPEG/PNG/WebP source images up to 20 MiB,
re-encodes to WebP at quality0.82 with a 2560-pixel maximum side before sending
any bytes, and publishes only WebP through the existing private transfer. The
server validates actual WebP structure; scanning still gates all reads. Source
metadata/EXIF are not copied by canvas re-encoding. Existing stored JPEG/PNG
files are preserved and remain readable, not silently recompressed.

Permit output: `permit_id`, transient `token`, `expires_at`, `version_id`,
`document_version`, and exact configured FastAPI `transfer_url`. Two-minute,
single-action grants are limited to30 per issuing session per minute. Only
SHA-256 token/session-proof hashes persist. Direct calls require exact frontend
Origin, `X-File-Permit` and `X-File-Session` (the issuing session's transient CSRF
proof). The client obtains its own proof from `/auth/me`; the permit response does
not disclose it. Copied permit alone or another session's proof is insufficient.
No cross-site cookie dependency or browser exposure of the protected session.
Permit consumption is atomic and committed before transfer; interruption requires
a fresh grant/version, not token reuse. Current authority is checked again before
upload publication. URL validation rejects a different origin/path/query/fragment.

The exact limit is20,971,520 bytes. Extensions and declared MIME must agree with
actual JPEG/PNG/WebP, PDF, DOCX or XLSX structure. Filename length is1–180;
path/control characters, macros, active/embedded content, malformed/encrypted
containers and excessive expansion/decoding are rejected server-side. French UI
errors distinguish invalid/consumed/expired permits, conflicts, interrupted
transfer, size/type errors and recoverable scanner/storage dependency failures.
Private contact denials use404 to avoid revealing filenames or existence;
unauthorized shared-inventory writes use403. Standard safe error envelopes apply.

Technical proposal, verified locally rather than a new confirmed business rule:
parser resource defenses cap images at25 million pixels/frame and100 frames;
PDFs at1,000 pages/3,000 page-tree nodes/10,000 walked objects and40MiB decoded
streams; Office at2,000 entries/40MiB total expanded/20MiB per entry and200:1
expansion for large entries. Encrypted files, active PDF actions/embedded content,
Office macros/embeddings and external relationships are conservatively denied.
These defenses can reject otherwise structurally valid complex files. They are
recorded for Khalid's product/security review, not silently promoted into C04/C14
business decisions. Any later relaxation needs fresh validation/security tests;
do not bypass quarantine or change the confirmed20MiB/format/authorization rules.

## Generated Lead and Deal documents

The twelve owner-supplied working models, strict facade routes, current-scope
prefill and private immutable history are specified in
[generated documents](generated-documents.md). They remain drafts and do not
replace legal or accounting review.

## SP-15 task and inbox boundary

The implemented strict contract is [tasks and internal reminders](tasks-reminders-local.md).
Task routes use the same revocable session/CSRF/Origin/no-store facade, UUID
idempotency keys and expected_version. GET /tasks supports numbered pages and
scoped today/overdue/upcoming/terminal filters; POST /tasks creates, GET/PATCH
/tasks/{id} reads/edits, GET /tasks/{id}/history pages true-actor history, and
POST /tasks/{id}/complete or /cancel explicitly terminates it. A contact is
required; optional deal context must belong to that contact. Assignment grants
no record permission.

GET /notifications applies current recipient/typed-parent/schedule scope before
counts and pages; state=all|unread|read. POST /notifications/{id}/read accepts {}
and idempotently retains read_at. GET /visits/follow-up pages accessible unresolved
ended visits. GET /work/context supplies backend now/today/Africa/Casablanca.
There is no public clock override or external messaging endpoint.
[Execution and current gate status](../03-planning/sprints/sp-15-execution.md).

## Live invalidation and browser notification boundary

The [realtime contract](realtime.md) defines POST /realtime/tickets, direct
WSS /realtime/ws, GET/POST /realtime/push and the administrator-only aggregate
GET /realtime/status, under /api/v1. Existing facade/session/Origin/CSRF rules
remain authoritative. Tickets authenticate the first frame, never the URL;
messages contain only topic invalidations/heartbeats, not business commands or
records. The browser facade relays only tickets/push, not operator diagnostics.

## SP-16 commission boundary

Strict optional commission commands and numbered reads are implemented in
[the concrete finance contract](commissions-local.md). GET/POST
/deals/{id}/commissions, GET /commissions/{id} and its /revisions and /receipts,
and POST /recognize, /receipts and /correct use current manager/administrator
authority, the existing facade/session/CSRF/no-store boundary, expected versions
and actor/body/route-bound24h retry receipts. Decimal strings are mandatory;
base/rate remain exact and the final MAD result alone uses ROUND_HALF_UP2.
Recognition is distinct from collection; normal closing remains commission-free.
[SP-16 execution](../03-planning/sprints/sp-16-execution.md) records actual gates.

Synthetic POST /deals/{id}/commissions percentage example (expected, not yet
recognized or collected):

```json
{
  "kind": "percentage",
  "base_mad": "10.05",
  "rate_percent": "10",
  "amount_mad": null,
  "due_on": null,
  "expected_deal_version": 1
}
```

The retained revision has amount_mad="1.01" and
calculation_policy="MAD_FINAL_ROUND_HALF_UP_2": exact10.05×10/100=1.005,
then final ROUND_HALF_UP once. Collected is0.00; recognized balance remains
null until the separate recognition command. Neither the rate nor base is
rounded to two decimals, and no JSON binary-float money is accepted.
