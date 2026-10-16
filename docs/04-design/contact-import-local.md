# SP-18 local atomic contact import

Status: implemented and technically verified local contract; fresh finish review
ship/documentation complete; Khalid's product acceptance pending.
Date:2026-10-15. C11/C02/C13/C14; BR-03/04/20; AT-20/21/23.
Business authority: decisions/permissions/workflows. Concrete bounds, wire shapes
and scheduling below are technical proposals verified for this local slice,
not new commercial or real-data retention decisions.

## CSV and row meaning

UTF-8 (optional BOM), comma separator, standard CSV quoting, exact ordered header:
`name,primary_phone,other_phones,primary_email,other_emails,roles,agent_email,notes`.
`|` separates multiple phones/emails/roles. International phones reuse the
existing libphonenumber validator and E.164 identity. One primary phone required;
if emails exist, primary_email required. Existing contact name/type/email/role
bounds apply (type defaults person); notes maximum4000. Roles are buyer/seller/
owner/tenant/developer. Values trim surrounding whitespace. Duplicate values
inside one contact remain invalid. Bad encoding/header/shape/quoting rejects
the file; content/assignment errors appear per logical CSV record, numbered2
after the header, independently of newlines inside quoted fields.

20 MiB (20,971,520 bytes) and50,000 records are enforced. An empty/header-only
file fails. Any successfully normalized existing active phone, including an
additional phone and a phone on an archived contact, skips the entire row before
other row errors/assignment checks. It never edits, reuses, merges or reassigns
the known contact. Duplicate new phones across nonskipped rows block approval.
Contact read projections accept the immutable csv_import source, displayed as
“Import CSV”. Manual Lead/enquiry source choices remain unchanged; callers
cannot forge import provenance through ordinary creation bodies.
`agent_email` must resolve to a fully active agent with final credentials. Blank
requires an explicitly selected fallback, unless a per-row override is selected.
A supplied but invalid email does not silently fall back. No enquiries,
requirements, deals or inventory are imported.

## Protected transport and contracts

Ordinary routes are `/api/v1/imports`, using the existing facade/session/CSRF/
Origin/no-store boundary. M/A authority precedes private lookup, counts and
receipt replay; administrator inherits manager. Agents have no import metadata.

- POST `/imports`: UUID Idempotency-Key and `{filename,size_bytes}`. Same actor/
  key/metadata returns the batch; a changed body conflicts. No raw bytes here.
- POST `/imports/{id}/upload-permit`: `{}`. Two-minute hashed single-use upload
  token bound to current issuing session and transient CSRF proof. Exact HTTPS
  loopback transfer target is validated by the facade. Reissue after interruption
  rotates the private object key and invalidates the old transfer generation.
- PUT `/transfers/imports/{id}`: direct FastAPI bytes, exact text/csv, exact
  declared batch size, restricted Origin, X-File-Permit/X-File-Session, no cookies.
  Bounded streaming/90s, fsync and no-clobber publication. Publication rechecks
  current authority and generation/session; interrupted partial files are cleaned.
  This raw CSV has no download/preview/open route, public URL or executable
  document rendering. The existing scanned document flow remains unchanged.
- POST `/imports/{id}/preview`: `{fallback_agent_id:null|uuid,
  row_agents?:[{row_number,agent_id:null|uuid}]}`. Up to100 unique assignment
  edits per request, accumulated in the batch. Null clears a row override.
  Shared active-agent validation applies. A fresh snapshot/version/hash and safe
  append-only preview counts are stored. No contacts yet. Uploaded file size/
  digest are checked privately before CSV parsing.
- GET `/imports/{id}`: summary plus rows with logical number, safe error codes,
  values, effective agent and original created-contact ID, stable numbered
  page/page_size (default50/max100). Each displayed cell caps4096 with explicit
  values_truncated; the full protected source remains retained. No secret permit
  fields or private storage keys returned. Current role checked before pages.
- POST `/imports/{id}/approve`: UUID Idempotency-Key and
  `{preview_hash,fallback_agent_id:null|uuid}`. Fallback must match the preview;
  changed content/assignment/phone/agent state invalidates it. Same committed
  batch/key/body returns the original permanent batch result, not a new receipt
  subject to the ordinary24-hour cleanup. Other keys/bodies conflict.

Summary contains id/filename/size/state/version/file_hash/preview_hash/fallback,
counts/result/created_at. Counts distinguish eligible, invalid, skipped_existing,
committed. Durable result has batch_id, committed/skipped counts, approved_at and
approved_by_user_id. No public clock, role override or arbitrary database query.
Preview/approval use60s facade and70s client bounds only for imports; ordinary
shared client/facade default timeouts are unchanged. A timed-out result is unknown
until current batch read/retry, never falsely declared rolled back.

## Atomicity, history and storage

Migration0019 adds import_batch/import_row/import_preview, indexes/constraints and
retained immutable evidence guards; extends the existing audit-action allowlist.
It preserves0018 contacts, phones, sessions and financial facts. Production/
development and nonempty-evidence downgrades refuse. Raw objects use the existing
environment-separated private UUID filesystem adapter, never original filenames.
Reconciliation retains referenced published import objects; only expired orphan
generations are eligible under existing bounded cleanup. No real-data retention
policy is invented; production retention approval remains separate.

Agency→current actor→batch lock order is compatible with existing contact/user/
merge commands. Sorted1024 phone-lock buckets bound advisory-lock memory for
50,000 rows; bucket collisions only serialize more work. Global normalized-phone
uniqueness remains final protection against direct concurrent SQL claimants.
Recheck all row phones/agents and preview hash; insert eligible contacts in500-row
flush chunks but ONE transaction. Contacts, initial primary assignment, true-actor
timeline/notes, audit, row IDs and final result commit together. A failure after
one chunk still rolls everything back. The batch deferred consistency guard runs
once at transition, not once per row; immutable row guards reject later inserts/
edits against committed evidence, avoiding quadratic commit scans.

New concurrent claims trigger IMPORT_REPREVIEW_REQUIRED and no batch contacts;
after rollback the batch is marked repreview_required under current authority.
Regenerating preview may now skip the claimed row. Invalid rows return422 and
block approval. Generic interruption is not evidence of rollback; retry the same
batch/key or read its durable state. Original import contact/agent links remain
immutable provenance across authorized contact merge; the shared merge policy
explicitly registers import_row as historical, rather than reparents originals.

## Existing French UI

S03 M/A import action opens `/leads?view=import`; optional `batch=UUID` restores
that same protected batch/report. No sidebar addition or private data in browser
storage. Standard shadcn controls and Tailwind roles, flat numbered row groups,
progress and named format details reuse the incumbent KAY world. Assignment
changes require a new preview before approval/page change. A new corrected-file
upload creates a new batch; original batch evidence remains. Same-batch
cancellation/retry completion refreshes the authoritative preview; the batch ID
alone does not invalidate a mounted review query. Final confirmation shows
whole-batch counts/effects. Unknown response preserves approval key/body;
retry/current result cannot create duplicates. Denial removes private report data.
No chart, new theme/token/font/dependency/custom CSS/shipping raster.

## Verification boundary

[SP-18 execution](../03-planning/sprints/sp-18-execution.md) records real focused
commands, corrected attempts, timings, browser/artifact/security/migration and
cleanup results. This contract is not itself evidence of a passing gate. Real
CSV data, inventory import, export, external messaging, production, full CRM/load
and backup/recovery are outside this sprint.
