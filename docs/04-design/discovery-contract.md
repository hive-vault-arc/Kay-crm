# SP-19 search, controlled exports, lifecycle and audit

Implementation contract2026-10-15; technical results live in
[execution](../03-planning/sprints/sp-19-execution.md), product review independent.
C11/C14/C02/C04/C13; BR-04/06/21/23; AT-22 search/pagination, AT-24/29.

## Search and numbered lists

GET /api/v1/search accepts q2..160, optional kind contact/enquiry/deal/
development/property/unit_type/document, page1..1,000,000, page_size1..100.
Escaped literal substring search; phones participate at3 digits minimum.
Current session and contact scope filter private parent IDs before counts or
labels. Active, unmerged contacts only; unassigned enquiries do not become agent
results. Deals/document names inherit the current readable parent, not inventory
owner links. Inventory is team-shared; archived assets/developments are excluded.
No raw file, phone-conflict detail, finance, note or protected contact expansion
is returned. Scope changes affect the next request; old names are cleared on
query change/failure. Result fields: kind,id,label,href; counts are scoped by
kind, total applies to selected kind. Stable lower(label),kind,id order and
numbered pages; deep empty pages retain the scoped total.

Unit-type hits navigate to the actual programme unit list with an applied
unit_type_id filter. A template never becomes inventory or a sale target.
Document-name hits navigate to their parent context, never a public byte URL.
Selected migration2026-10-27: the desktop header now uses the frozen anchored
preview (eight rows, complete authorized total,440px width/420px maximum height)
and a link to authenticated `/search`. The phone header keeps an icon-only Sheet
with the common labelled query/type form and full numbered result rows. The
full page supports strict q/kind/page parameters, fixed20-row pages and the same
current API. Unknown/duplicate/invalid URL parameters are rejected without
reflecting them into the form; identity is checked first. Only bare `/search`
joins the login-return allowlist, never its query string.

Desktop typing is a disposable search draft, with a300ms request debounce and no
read below two characters. Changing the query immediately removes old suggestions;
closing/navigation/breakpoint changes unmount the preview and abort its current
read. Current failure/denial replaces previous names. Shared shadcn Popover uses a
labelled nonmodal result dialog and ordinary links, with keyboard focus movement
and Escape return to the input, rather than a falsely declared listbox while
focus moves among links. This preserves the selected appearance and preview-to-all
workflow with accessible ordinary-link semantics. Native focus/touch remains a
separate verification gate. All result links disable prefetch and still pass
through the shared unsaved-navigation guard. Full-page query navigation explicitly
uses that guard; phone search remains disposable local UI state.

Full results reuse the selected app Tabs for scoped per-kind counts, shared soft
result rows and numbered pages; full/drawer lists have no fixed inner scroll height.
Reusable-type/document destinations remain the authoritative parent/unit-context
URLs. Live search refresh now also includes enquiry and file topics. No local
storage, staff-directory request, public file URL or extra result field is added.

Prepared-PDF discovery was a genuine gap in the UI checkpoint above. Its source
implementation now follows the versioned extension below; actual PostgreSQL/native
verification remains pending. [UI evidence](../03-planning/design-migration-evidence/search-ui-2026-10-27.json).

### Prepared PDF search extension, 2026-10-27

The server facade opts in with the bounded header `X-Kay-Search-Version: 2` only
on the exact GET search target. The backend then supports an eighth kind,
`generated_document`, and returns `search_version:2`. A prepared hit retains
kind/id/filename label/href and adds the current catalogue `template_title`;
its destination is `/leads/{uuid}?tab=documents` or `/deals/{uuid}?tab=documents`.
The browser never receives file bytes, storage keys, values snapshots, permits
or financial amounts through search. Matching covers literal escaped filename
or catalogue title, not PDF content or submitted field values.

The existing active canonical contact intersection precedes parent and template
filters, counts and stable numbered pages. Prepared parents must be active Leads
or Deals. Agent Lead parents also retain the existing non-null assignment rule.
Only known visible catalogue codes and an existing clean PDF version qualify.
EXISTS avoids duplicate counts across file versions. Uploaded and prepared rows
are separated in version2; a generated file is never counted in both kinds.

One catalogue-derived helper now governs generated context/history, generic file
metadata/direct authorization and search. Finance models10/11 remain M/A only;
unknown codes fail closed. This also corrects a source visibility gap in legacy
search: its generic Deal-document branch previously omitted the template rule.
The permission correction applies regardless of the search-version opt-in.

Without the header, the seven-kind response and original four-field hit shape
remain; permitted Deal PDFs keep their legacy document kind/parent URL and
filename-only matching. New Lead PDF discovery and title matching are opt-in.
Asking for generated_document without version2 is invalid. No role, scope, clock
or version override is accepted as a query parameter. The version is a transport
choice, never an access grant; current identity and parent scope still authorize
every request.

The new frontend requests version2, validates its marker/new fields/destinations,
and shows PDF préparés using the existing result rows and Tabs. It still accepts
legacy seven-kind responses for base queries; it never fabricates PDF capability
or results from an absent marker. Deploy the backend extension before the new
frontend when using the prepared-PDF filter. Existing0030 generated-document
schema is required; this slice adds no migration, stored value or byte rewrite.

Twenty connection-forbidden source/SQL/route/visibility cases and seven frontend
schema/facade/transport/presentation cases supplement existing suites.330 backend
units pass with692 database cases deselected;240 frontend units plus lint/typecheck/
build pass. Three real PostgreSQL cases are prepared, not run. No native/app-HTTP,
real SQL/scope-race/performance or product acceptance is claimed.
[Evidence](../03-planning/design-migration-evidence/prepared-search-2026-10-27.json).

## CSV request, worker and delivery

M/A only. POST /api/v1/exports requires current facade/session/Origin/CSRF and
UUID Idempotency-Key. Body kind contacts|enquiries (default enquiries), filters
reuse the contact list query contract. Export is the whole filtered set, not a
single page: page1/page_size50 only; contact exports reject enquiry-only filters.
Unchanged actor/key/body replays one result; changed body returns409.

export_job retains originating actor/session, immutable request hash/filters,
state queued|ready|failed|denied, opaque failure code, generated UUID/hash/size/
row count/timestamps, and hashed short-lived delivery proof. Unique actor/key,
private object key and typed outbox parent prevent duplicate publication.
No cascading evidence deletion. GET /exports and /exports/{id} expose only the
current M/A actor's own safe metadata, not filters/object keys or another
manager's requests. Wrong role is denied before object lookup.

The existing PostgreSQL outbox/job worker handles export.generate alongside
file/reminder jobs. Bounded SKIP LOCKED dispatch,90-second fenced lease,
interruption reclaim,5 attempts and bounded retry backoff. Stale workers cannot
publish. Snapshot generation pages100 rows and bounds output50,000 rows/20MiB,
failing explicitly without partial publication. No broker/dependency added.
Originating session/current M/A is checked at generation and again at
publication under the same agency lock used for role changes. Revocation
invalidates delivery; temporary storage failure retries. A generated but
unpublished object is an orphan, not downloadable evidence.

CSV is UTF-8 BOM, all fields quoted, fixed headers (see csv_export.py).
Contact identity, phones/emails/roles/responsible agent/source/timestamps and
optional enquiry status/source/agent/received timestamp only. No notes,
documents, prices or finance. Phone fields always use an apostrophe text prefix.
Formula-risk =,+,-,@ after leading whitespace/control/BOM is prefixed too;
tabs/newlines are inert text, never spreadsheet formulas. Consumers must treat
phone columns as text; the apostrophe is intentional safety, not part of the
canonical CRM phone. No CSV is stored in browser storage or public frontend files.

POST /exports/{id}/download-permit (empty body, current Origin/CSRF) issues a
two-minute single-use hashed permit bound to current issuing session/CSRF.
Direct FastAPI GET /transfers/exports/{id} requires exact frontend Origin,
X-File-Permit and X-File-Session; cookies/UUID alone grant no authority. Uniform
invalid-proof403, current owned M/A authorization and hash/size check precede
bytes; permit consumption and exports.downloaded audit commit atomically.
Response CSV uses fixed safe filename, nosniff and no-store; no public URLs.
Reference-aware reconciliation preserves published CSVs and removes old orphan
partial/unpublished objects. Server-generated CSV is not a user-uploaded
document and does not bypass or replace SP-09 antivirus rules.

French Leads/Contacts actions confirm the entire current applied filter, not
the page. Current counts may change before worker snapshot; UI says so.

2026-10-27 selected-design implementation: the confirmation Sheet freezes a
validated copy of those filters and the displayed count when opened. A checked
confirmation is required. Live list refreshes cannot replace its body; interrupted
same-body retries reuse their UUID key, including cancel/reopen before success.
The frontend mirrors existing whole-result pagination/contact-only restrictions
before relaying; PostgreSQL remains authoritative. The Sheet owner survives its
utilities Popover and returns focus to the surviving list-menu control. A pending
command blocks close and uses the existing managed marker for guarded links/
unload. Global Back/Forward draft handling remains separate migration work.

The own-job page retains the selected Date/Contenu/État/Fichier columns on desktop
and shared tonal cards on phone/in a Sheet, with numbered pages and complete server
totals. Only ready jobs expose download. Visible queued pages refresh every5s;
completion, denial, page changes and unmount release that polling. Download clicks
synchronously lock, obtain fresh current identity/CSRF/exact-job private permits,
and abort on unmount. Authority/state failures clear old jobs before refresh;
foreign-job permits and canceled/invalid/oversized CSV delivery produce no browser
download. No browser storage, public URL, worker/data-model or permission change.
These are source/controller boundaries; real worker/private-byte/native checks
remain pending in the [migration execution](../03-planning/design-prototype-migration-execution.md).
Mes exports is durable recovery/status/download; refresh never creates another
request. A lost acknowledgement retries the same key/body. The original request
remains discoverable even if the session ends. Delivery needs current authority.

## Recoverable lifecycle

Existing contact preview-token/version/reason archive/restore remains unchanged.
Development and property archive/restore require M/A, Origin/CSRF, UUID retry
key, expected_version and nonblank reason. Preserve IDs, owners, offerings,
documents, transaction/finance FK/history and true actors. No hard-delete API.
Active lists default archive=active; explicit archived/all and stable numbered
pages allow restoration. Property detail adds nullable archived_at.

Conservative approved stock boundary: any current campaign blocks physical
archiving; any physical child or current whole campaign blocks development
archiving. No stock release, reservation cancellation or Q-06 policy inference.
SQL deferred guards also prevent archived physical/current-campaign coexistence.
Target version/agency lock serializes races with commercial commands.
Archived details retain history but ordinary edits/documents are unavailable
until restoration; restoration does not invent availability or revive campaigns.
Shared inventory read does not grant access to an owner's private contact.

## Audit and security retention

GET /audit/events checks current M/A before reading; page1..1m/size1..100,
optional family, actor_id and inclusive Casablanca start_on/end_on dates.
Stable created_at DESC,id order, safe action/actor ID/current actor name/time
and typed target IDs; no credentials, private values or financial amounts.
Dashboard?view=audit is M/A contextual access. Settings remains admin-only.

Only explicit identity/login/logout/bootstrap/password and users create/edit/
disable/reset-password/confirm-handoff security actions older than24 calendar
months are eligible for deletion, with all business target FKs null. Leap-day
cutoff clamps to the previous year's valid February date; exact cutoff stays.
At most500 SKIP LOCKED rows per CLI invocation. No automatic contact expiry,
transaction/finance/business-audit purge or application purge endpoint.
backend/.venv/Scripts/python.exe -m app.cli.retention requires a TTY and exact
PURGE_SECURITY_AUDIT confirmation. Executing against real/development data is
irreversible and needs Khalid's explicit approval; implementation/testing is not
permission to execute it. Protected transaction retention policy remains pending.

## Measured indexes and migrations

0020_search_export_lifecycle adds export evidence, property archived_at, strict
outbox typing and retained/immutable export and archive guards. Populated0019
upgrade preserves contacts/phones/inventory/history; downgrade refuses export
or archived-property evidence and refuses development.
0021_discovery_indexes adds partial active user/contact grants and audit
created_at DESC,id indexes after a bounded isolated plan comparison.
Actual4,000 contacts/4,000 grants (40 for searched actor)/4,000 audit events:
scope3.578→2.707ms; audit1.163→0.099ms with chosen indexes used. Initial console
fixture count label said1,000; SQL generated4,000 and the label is corrected.
All probe rows/candidate DDL rolled back; no extension or broad benchmark claim.
Existing primary-agent, phone/email and typed-parent indexes are retained.
