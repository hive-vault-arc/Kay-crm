# SP-11 implemented deal contract

Status: implementation present; actual acceptance belongs to
[SP-11 evidence](../03-planning/sprints/sp-11-evidence.md). This supplements the
future-facing API, model and architecture; it does not implement SP-12 onward.

2026-10-17 owner-requested IMMO World alignment replaces the earlier free-title/
no-conversion creation contract. The workflow below describes current source;
its new full-page workflow and local technical verification are complete in the
[alignment record](../03-planning/leads-deals-immoworld-alignment.md). Human product
acceptance and hosted deployment remain separate. Historical SP-11 verification
does not certify this replacement or a hosted deployment.

## Authority and wire contract

The current responsible agent is derived through `deal.contact_id`. Managers/
administrators read agency contacts (archived contacts read-only); agents need
current responsible/collaborator scope. Permission precedes search, totals,
counts, sort and numbered pages. A copied UUID, receipt or inventory ownership
link never expands access. Enquiry and requirement context must belong to the
current contact; agents cannot use unassigned manager-queue enquiries.

Implemented: GET/POST `/api/v1/deals`, GET/PATCH `/deals/{id}`, POST
`/deals/{id}/transition`, GET/POST `/deals/{id}/customer-offers`, PATCH
`/customer-offers/{id}`, GET `/deals/{id}/history`. Existing revocable PostgreSQL
session/facade authority applies. Commands require Origin, CSRF and UUID
Idempotency-Key. Next validates the exact route/method/query/body/response,
uses server-only verified HTTPS and no-store responses, not a generic proxy.

Manual create requires exactly one of accessible contact_id or new_contact.
New contacts reuse the canonical contact/profile/phone/ownership command inside
the same transaction, including scoped duplicate handling. Required qualification:
positive/reference-band initial_budget, one to eight distinct purchase_reasons,
and one to three distinct projects. A project chooses exactly one development_id,
standalone property_id or external_name (1–160 characters). Archived/missing
catalogue targets fail; units are selected through their development. Projects
express client interest, not a reservation or committed inventory target.

Shared create/edit fields include campaign_source (the20-channel catalogue),
rating=cold|warm|hot, nullable payment_method=cash|mortgage|installments|mixed|
bank_finance|developer_finance, nullable strict number_of_rooms0–50, notes≤4000,
nullable requirement_id, offering_id paired with expected_offering_version, and
next_action≤1000. Languages are required on the canonical contact. The server
derives the display title from client and first project; input title is refused.
Manual creation has no enquiry_id and does not alter a lead. Default stage=new;
other ordinary active initial stages remain permitted.

PATCH accepts these fields plus expected_version and optional contact_fields
(canonical profile plus its own expected_version). A profile edit and deal
qualification edit commit together or neither commits. No generic PATCH can
change contact identity, origin, enquiry, stage, ownership or stock. A stale
contact also yields DEAL_VERSION_CONFLICT without private profile disclosure.
Client/profile and project qualification snapshots are appended to each new
history revision; prior history and legacy facts are not invented or rewritten.

`POST /api/v1/enquiries/{id}/convert` is the only lead-conversion command. It
requires expected_version, exactly one project, initial_budget and distinct
purchase_reasons. It reuses the contact and current ownership, inherits source,
rating and notes, creates the qualified deal, marks the lead converted and
records both histories atomically. Converted leads leave the default prospect
list and remain available through status=converted. Conflicting active conversion,
stale/private/archived requests cannot create another deal. Retry reauthorizes
current lead/contact scope before returning its existing result.

Fixed codes: new,visit,negotiation,reserved,documents,won,lost,cancelled. Ordinary
SP-11 create/transition permits only new,visit,negotiation,documents. A transition
needs expected_version, a different permitted stage and nonempty reason. Skips
are allowed without stock/outcome effects. Reserved requires SP-12 and outcome
commands SP-13. Future sprints must deliberately replace the current supported-
stage database constraint. No generic PATCH can bypass it; future routes404.

Customer proposals: positive exact amount_mad string, MAD, price_period nullable
(sale:null, rental:month/year), conditions, expires_on date|null, status pending/
accepted/rejected/withdrawn. A linked offering/research requires period/intent
coherence, including retargeting existing proposals. Unknown context allows an
explicit period. Acceptance never closes/reserves or changes inventory. No
automatic expiry or single-accepted-proposal rule is invented. Edits require
both offer expected_version and expected_deal_version; each proposal mutation
increments deal revision, not stage. Decimal/BigInt annual comparisons retain
original amounts/periods.

Technical proposals: title160, next-action/reason1000, conditions4000 characters;
numeric(18,2) positive money,16 integer digits/2 decimals;32KiB command body,
2MiB facade response; page1–1,000,000/size1–100, list50/history-proposals20 defaults.
List filters: contact_id,q (literal escaped text160, including project names),
stage,assigned_agent_id (current contact responsible),offering_kind,campaign_source,
rating,country,language,development_id,property_id,updated_from/to (inclusive Casablanca
dates),archive active/archived/all,sort -updated_at/-created_at/title/contact_name.
All eight stage_counts describe exactly the authorized filtered set. Children
accept only page/page_size. Unknown/duplicate parameters fail422.
GET `/offerings?offering_id={id}&state=all` provides bounded safe prefill; other
inventory routes reject that filter.

Command response: id,version,customer_offer_id|null,offer_version|null. Errors:
DEAL_VERSION_CONFLICT409,OFFERING_VERSION_CONFLICT409,DEAL_STAGE_UNCHANGED422,
INVALID_DEAL_CONTEXT422,DEAL_OFFER_PERIOD_MISMATCH422,CONTACT_ARCHIVED409;
missing/out-of-scope404.24-hour actor/route/key receipts contain a request HMAC
and typed IDs/versions, never cached private bodies. Replay rechecks authority.

## Storage, transactions and inherited links

Reviewed additive0013_deal_pipeline adds deal,customer_offer,deal_stage_event,
deal_receipt and typed nullable deal FKs on document/audit/timeline. Actual
contact/requirement/offering/enquiry/actor FKs and deferred checks enforce matching
parents, intent/period and revision/event snapshots. Origin contact, enquiry,
creation actor/time, proposal parent, offering target and event snapshots are
immutable. Unique revision keys prevent silent SQL updates without history.

Commands retain agency→current-user locks, reload identity after waiting, check
versions, and atomically append snapshot/contact timeline/audit/receipt. Separate
real connections exercise version races/revocation; interruption rolls back all
effects. Agency serialization is a local consistency choice, not a measured
throughput claim (SP-22). Scoped reads use repeatable-read snapshots.

Transfer changes derived responsibility. Merge binds independent deals/deal
documents into its preview hash, rechecks versions, updates only current contact
and appends a true-actor merge revision. Origins, exact targets, proposals and
authors remain, and collaborators are not unioned. Deal files reuse SP-09:
typed parent, current private scope, quarantined direct FastAPI bytes, single-use
permits, real antivirus/fenced outbox worker. No public URL or new broker.
Downgrade refuses development or retained deal/audit/timeline history; synthetic
cleanup and migration probes are restricted to the guarded isolated database.

## Interface and traceability

S05/S06 share the single S07 form; contact Affaires and research/shortlist links
reuse it. Prefill is fetched and validated, never URL prices. S06 has filters,
scoped summaries, numbered pages and ID-only configurable columns. S08 exposes
the current contact/responsible, exact target, next action, fixed pipeline,
proposals, true-actor snapshot history and private FilePanel. Future commands are
plain explanations, not dead buttons. Drafts remain in memory on failure;
conflicts need explicit comparison/choice, never automatic overwrite.

Changing a linked research's purchase/rental intent is rejected with
`REQUIREMENT_INTENT_IN_USE` (409) only when an existing selected offering or
customer proposal would become incompatible (or SP-10's shortlist is present).
The draft remains visible; no research/deal/history/receipt change commits.
A linked deal without an offering or proposal does not itself freeze intent.
The database's deferred consistency guard remains authoritative.

KAY French shadcn/Tailwind tokens are retained, without charts/shipping rasters.
C08/C02/C13/C14,BR-05/06/12/29 and SP-11 variants AT-12/23/39 map to backend
test_deals/test_deal_edges/test_deal_links and frontend e2e/deals.spec.ts plus
review/deals.chrome.spec.ts. Closure/stock/calendar/finance and human product
approval remain independent future gates.
