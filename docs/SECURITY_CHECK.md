# KAY security check for changes

## DigitalOcean detection metadata (2026-10-16)

The owner requests a conventional full `requirements.txt` and publication to
main. Runtime package pins/hashes move without changes; the old lock filename
becomes a hash-enforcing compatibility include and no development packages are
added to runtime. Packaging guards check the full-list/alias/Python-pin boundary.
No Dockerfile, cloud credentials, resource creation, production configuration or
Windows/loopback/TLS/storage guard bypass is introduced. DigitalOcean detection
is distinct from deployment; current runtime blockers are [explicitly recorded](06-delivery-and-operations/digitalocean-detection.md).
The owner confirms this is not fully live and authorizes pushing the fixes.
Main's existing PR/check/admin protections remain mandatory and are not disabled.

## Direct Uvicorn startup and approved browser trust (2026-10-16)

The conventional `app.main:app` object reuses the existing application factory,
routers, middleware, validation and lifespan; no database is connected at import.
No API, authorization, schema, cookie or facade transport rule changes. The bare
Uvicorn command starts HTTP for its liveness smoke; the connected CRM command
explicitly enables the existing HTTPS certificate and keeps access logging off.
Actual HTTPS liveness/facade readiness200 and unauthenticated direct readiness403
pass, including real reload. No HTTP facade fallback or TLS bypass was added.

Khalid explicitly approved adding the existing project CA to his CurrentUser
trusted roots. The leaf was first verified against that exact CA; a fresh store
read and Windows default-chain verification confirm the installed authority.
Machine-wide roots were not changed. Ordinary Chrome and the in-app browser
hydrate the dev login without bypassing a security interstitial. Private keys and
configuration remain ignored and unprinted. A new account/checkout still needs
its own approval, not an automatic trust import. [Evidence and limits](06-delivery-and-operations/local-startup-execution.md#direct-uvicorn-and-approved-currentuser-trust).

## GitHub publication and CI boundary (2026-10-16)

Public publication excludes real configuration, credential note, keys, private
files/backups and generated evidence. Pattern-based full-history scans are
redacted, with narrow reviewed upstream-example exceptions. The initial staged
blob scan compares seven known private runtime values in memory and finds zero
matching files. Index guard13 ignore probes pass; isolated temporary-index tests
reject an ignored env file, an unknown archive and a symlink. Ten shadcn archives
independently match the pinned upstream Git blob IDs; all11 allowed reference
archives have explicit SHA256s. Licenses/notices remain; no new KAY license invented.

Hosted CI uses new loopback-only PostgreSQL18 targets with random masked
credentials, fresh HTTPS/facade keys and real ClamAV. Provisioning refuses
workstations/existing configuration/targets. No local secret or self-hosted runner
is used. Real byte readiness includes clean/rejected cases, not just PONG. Matrix
jobs do not share clusters; existing identity/lease/current-scope rules remain.
Workflow token is read-only, review approval disabled, actions SHA-pinned and
credential persistence off. Repo read-back confirms secret scanning/push protection,
Dependabot security updates and full-SHA action enforcement enabled, without paid
features. Main protection is applied/read back only after actual successful CI.

Khalid approved only existing dev-only GHSA-vfj7-8cjw-p6xm until2026-11-15T00:00Z.
All runtime/new/critical/expired advisory cases fail. Eight dependency-policy
tests cover positive/negative/expiry/cycle cases; six CI-bootstrap tests cover
workstation refusal and scanner-readiness control flow. This does not claim the
full npm audit is clean or certify deployment/real data. [Execution and limits](06-delivery-and-operations/github-ci-execution.md).

## Iconsax migration boundary (2026-10-16)

[Migration evidence](reference/iconsax/execution.md):279 baseline Python sources
and71 pre-existing chart/brand/public files retain SHA-256 hashes. All21 icon
consumers differ only by imports/identifiers; fields, labels, actions, roles and
permissions are unchanged. Selected integrity-verified official Free SVG paths
are static React code, no unsafe SVG HTML injection, IDs, scripts, external
references, runtime loader, CDN requests, premium key or new icon package.
Free proprietary notice is retained in source and public distribution; npm's
MIT metadata is not misrepresented as the SVG license. Final4-root/321-JS scan:
0 facade-secret/0 signing-key matches. Test identity/lease/root guards precede
synthetic cleanup;66 test record tables empty, development unchanged read-only.
Project service listeners0; shared PostgreSQL/unrelated resources preserved.

## Approved V3 UI-only boundary (2026-10-16)

All272 baseline backend Python sources (application, migrations and tests) retain
their hashes. No API contract, authorization, migration, secret or business rule
change is authorized by this redesign.17 original form sources retain all87
field-site signatures, excluding presentation classes/placeholders. Client role
visibility remains supplementary to authoritative backend checks. Read-only
status strips do not invent transitions; previews use the existing clean-image
metadata plus private permit/byte transfer and revoked transient blob URLs.
Decorative generated city/villa images are not real property evidence.

Synthetic isolated browser checks exercise session/CSRF, permissions, private
files, imports/exports, financial originals, retry/conflict and recovery. Shipping
source/public assets remain frozen during recovery because they are included in
its compatibility fingerprint; no guard was bypassed after the interrupted first
attempt. Current scan, report privacy and exact cleanup/port results belong in
the [V3 execution ledger](04-design/ui-reference/approved-v3/execution.md).
No production, real-client data, external messaging or deployment was used.

Final V3 closure:4 client roots/313 JS have0 configured facade-secret and
0 signing-key occurrences;20 report JSON/47 step arrays have0 detailed input
arrays. TestOID109061 guarded cleanup removes1 synthetic residual row/50 orphan
objects and leaves66 record tables empty/bootstrap unset. RecoveryOID109063 has
0 public tables/0 private objects; read-only developmentOID109060 stays empty
with default policy1/capacity2. All identities independently match the expected
cluster; development storage was excluded. Application services are stopped by
their supervisor; the task-started antivirus service is stopped separately with
its cache/volumes retained. Shared PostgreSQL is preserved.

SP-22 reviewed boundaries: [execution](03-planning/sprints/sp-22-execution.md),
[AT map](03-planning/sprints/sp-22-acceptance-map.md) and
[local procedure](06-delivery-and-operations/local-final-acceptance.md).
The cumulative real-PostgreSQL suite and corrected migration/recovery runs cover
current role/contact authorization, private permits/bytes, atomic imports,
finance originals, signed intake, independent-connection races and durable replay.
The populated0020 migration repair flushes existing deferred constraints before
ALTER TABLE; no data/history/security guard or model is weakened.

Benchmark tools resolve the live fixed benchmark identity independently of
development, reject nonempty seeding/aliases and use synthetic identities only.
Random credentials remain current-user DPAPI protected outside source/public
roots; HTTP sessions/CSRF/verified loopback TLS stay real. The load runner owns
only its exact API child tree/8200 and uses failure-inclusive, in-flight-reconciled
latencies; it cannot turn missing/short measurement into a pass. Fresh-install
checks inherit private configuration in memory, never echo/copy it to examples.
Final browser/load/privacy closure passes in the ledger. Chart totals reuse
complete scoped groups; exact collection sum/count share one statement and the
same repeatable snapshot. No permission cache or widening. Bounded1..4 normal
API processes retain current PostgreSQL sessions/CSRF and maintenance leases;
the passing load uses4, at most20 pooled query connections, unchanged SQL budget.
Final285 browser JS have0 configured-secret matches; report detailed arrays0.
Development is unchanged, guarded synthetic test/recovery cleanup and owned
process shutdown pass. No production,
real-data operation, public backup API, real-site connection or external send.

SP-21 reviewed boundary: [runbook](06-delivery-and-operations/local-backup-recovery.md)
and [actual evidence](03-planning/sprints/sp-21-execution.md). Operator-only venv
CLI, fixed PG18 binaries/no shell, private temporary passfiles, bounded redacted
errors; no public backup route or credential output. Current-user DPAPI chunks
bind point/name/index, manifest HMAC and payload SHA256 detect replacement;
protected DACL/fixed roots/reparse guards exclude public paths and .env/keys.
Live cluster/OID checks independently exclude development/test/benchmark aliases
before recovery-only DDL. Incompatible/corrupt points and changed current
authority reject before replacement. Missing/stale ready marker fails closed.

Maintenance drains complete API streams/worker cycles and table locks protect
the coherent snapshot. Crash leaves intent closed; active/unknown owners cannot
be resumed. Restore revokes all sessions/permits, fences old running jobs,
disables website sources, retains finance/committed imports/history and does not
promote unscanned bytes. Actual worker replay/old access/bootstrap/copied-ID
denials, controlled retention and real concurrent drain pass. No blind source-
authority merge/offline opening or total-source-loss claim. DPAPI profile/laptop
loss, real-data retention/key escrow and production opening require separate work.
Final privacy: 285 JS / 0 configured-secret matches, report detailed arrays0,
14 private/generated paths ignored and0 tracked. Synthetic cleanup only.

SP-20 reviewed boundaries: [signed intake contract](04-design/website-intake-local.md)
and [execution](03-planning/sprints/sp-20-execution.md). Configured source authority
is distinct from staff session/role; no public registration, owner injection,
existence disclosure or browser signing key. Strict HMAC/raw bytes/current source/
five-minute window, streamed body cap and persistent rate counter precede durable
receipt. Stable receipt/status expose exactly two safe fields. Current phone scope
and active routing are rechecked inside the shared agency lock; known data is not
overwritten. Atomic database-only worker claim/effects survive actual process
kill; bounded retries retain failed receipts for local explicit recovery.
SQL XOR/immutable provenance/deferred receipt/outbox guards preserve true source
and legacy staff actors. Separate127 host excludes localhost staff cookies;
strict Host/Origin/JSON and verified loopback TLS/no proxy/redirect preserve local
boundary. Populated test migration and additive dev migration preserve data.
Secret bundle/report/ignore checks are recorded in execution. No production,
real-data intake, external send, new dependency or antivirus bypass.

SP-19 boundary evidence: [contract](04-design/discovery-contract.md) and
[execution](03-planning/sprints/sp-19-execution.md). Current contact scope filters
search/count/document names before projection. M/A-only own-job CSV uses fixed
columns, Unicode/control/formula neutralization and forced phone text; current
originating session is rechecked during generation/publication and current
issuing session before single-use private delivery. Wrong Origin/binding/role,
revocation, interruption/retry/fencing/limit and archive/commercial races are
covered. No raw transfer/file URL or filter payload in metadata/public output.
Controlled24-month security-only purge preserves contacts/business/finance and
exact cutoff; development retention was not executed. Additive0020/21 upgrade
retains IDs/FKs/true actors/history. No new dependency, real-data export, external
send, production operation or antivirus bypass. Independent product review and
unapproved business/finance retention remain separate.

Status: active review gate; SP-01–SP-20 accepted evidence is scoped per sprint; full-product testing pending
Date: 2026-10-16  
Confirmed decisions: protected clients and owner files, revocable PostgreSQL sessions, backend-enforced permissions, private Spaces, audited finance/imports, and the retention constraints in the security specification.  
Technical proposal: apply the review and evidence checklist below to relevant tasks.  
References: [security and privacy contract](04-design/security-and-privacy.md), [permissions](../permissions.md), [API contracts](04-design/api-contracts.md), [data model](04-design/data-model.md), [agent harness](HARNESS.md), KV `Knowledge/Engineering/Security Best Practices.md` and `Agentic Coding/Templates/Security Check Template.md`.

Use this gate when a task touches authentication, authorization, any private record or file, import/export, finance, external form intake, worker/outbox side effects, migrations, logs, secrets, or deployment. A task may mark an item not applicable with a reason; it must not silently skip an applicable check.

## Review by boundary

| Boundary | Questions and negative cases |
|---|---|
| Identity and session | Is first-admin bootstrap local, one-time, transactionally guarded, and unavailable over HTTP or on a nonempty installation? Do temporary credentials expire, restrict access until change, and stay out of logs/output? Does every protected request verify the current, non-revoked session and active account? Do password reset, role change, and logout revoke affected sessions? Are CSRF, cookie settings, and cache controls preserved? |
| Role and object scope | Can Agent A access Agent B's private contact by changing an ID, URL, filter, export, or file permit? Do collaborators have only their documented access? Are manager and admin rights aligned with `permissions.md`? |
| Screen and schedule scope | Does an agent dashboard exclude unassigned work and agency-wide inventory totals even though shared Projects inventory remains readable? Can a hidden Settings link still be reached by URL/API? Are working-time and company-car-capacity writes administrator-only, versioned, and audited? Can concurrent bookings exceed the cap? Can project briefing text or configurable table columns expose protected contacts? |
| Inventory and deal invariants | Can concurrent requests create two active reservations on one offer or conflicting whole-development/unit reservations, reopen without stock review, or leave sale/rental effects inconsistent across project and child units? Can a whole-development close silently include a sold/leased child? Are state transitions audited with the true actor? |
| Commission and import | Can a non-manager recognize or receive commission, or collect beyond the balance? Does an interrupted/duplicate import remain atomic and retry-safe? Are previews and files protected as personal data? |
| Files | Is the Spaces bucket private? Are transfer permits short-lived, single-action, session/resource scoped, and rechecked? Can a quarantined, infected, or unscanned file be downloaded? Are private owner/developer documents kept out of shared development/property attachments and project rollups? |
| Website connector and workers | Is the connector authenticated and replay-safe? Do outbox consumers deduplicate effects, bound retries, and recheck permissions where the deferred action needs them? |
| Input, output, and logs | Are CSV/form/file inputs validated? Do errors avoid raw sensitive values? Are tokens, cookies, permits, passwords, phone numbers, documents, and private notes absent from logs, traces, screenshots, and analytics? |
| Operations and privacy | Are secrets external to source? Are migrations and backups compatible? Are retention and international-flow questions resolved before real-data launch? Does restore preserve revocation and authorization safety? |

KAY uses database-backed sessions, not the generic KV JWT pattern. Its chosen file flow streams through FastAPI with private Spaces, not a public bucket or permanent presigned URL. KAY's numbered pagination and one-team scope also override generic cursor and multi-tenant examples. Do not replace these project contracts while applying general security advice.

[SP-06 security record](03-planning/sprints/sp-06-evidence.md#security-boundary-record)
adds immediate transfer/collaborator revocation, current-scope replay, immutable
true-actor business history, archived/merged alias authorization and transactional
enquiry repair. Same-S and M/A cross-portfolio merge, private-target denial,
stale linked previews/both versions, separate-connection races and rollback are
covered. Populated active/disabled migration backfill retains real provenance;
unknown future contact-FK modules fail closed until the merge service is extended.
Final bundle/report/privacy/fixture evidence is recorded there; product review
and later file/finance/import/website/restore boundaries remain separate.

[SP-05 security record](03-planning/sprints/sp-05-evidence.md#security-boundary-record)
adds canonical-contact scope, private-first display-name-only phone conflict,
strict contact/enquiry projections, atomic audit/retry, independent uniqueness/
current-actor races, immutable provenance and migration isolation. Harness lease
prevents overlapping fixture cleanup. Final browser/report/artifact results are
recorded in that execution record, not inferred from the earlier identity gates.
Inventory/files/finance/import/website/worker/restore remain later boundaries.

## Evidence record for a task

[SP-08 security record](03-planning/sprints/sp-08-evidence.md#security-boundary-record)
covers development/unit/type target boundaries, same-project constraints,
target-level ownership/price, separately scoped developer/owner identities,
escaped optional briefing, strict facade/CSRF/body/query bounds, typed history/
receipts/audit and contact-merge provenance. Actual PostgreSQL race/revocation/
rollback and populated migration checks are recorded. Browser/privacy completion
and independent product review must be read from that execution record, not
inferred from this link. Later files/reservations/outcomes/finance/import/worker/
recovery/full-product boundaries remain separate.

[SP-07 security evidence](03-planning/sprints/sp-07-evidence.md#security-boundary-record)
covers M/A-only commands, shared facts versus separately scoped owner identities,
strict facade/session/CSRF, waiting role denial, independent campaign uniqueness,
version/retry/rollback, merge provenance and immutable availability/price history.
Reviewed0007/0008 and real PostgreSQL nonfinite-value/migration rollback probes are
included. Final cumulative browser/report/privacy acceptance belongs to that
record; no cloud/file/import/finance/outcome/full-product acceptance is inferred.

```text
Task and requirement IDs:
Security-sensitive boundaries:
Contracts read:
Files, routes, and data paths inspected:
Positive test or review:
Negative permission and cross-record tests:
Concurrency, retry, or interruption test:
Command and result, or reason not run:
Risk found and fix:
Remaining concern:
Security checked: yes / not applicable / blocked
```

Before release, this evidence joins the [acceptance tests](05-quality/acceptance-tests.md) and [release gate](06-delivery-and-operations/release-and-recovery.md). It does not replace professional legal/privacy review or a tested application.

SP-03's completed [security boundary record](03-planning/sprints/sp-03-evidence.md#security-boundary-record)
covers bootstrap, current session/role/credential, CSRF/Origin/facade, logs and
diagnostic privacy, real PostgreSQL atomicity/races and migration isolation.
Other record/file/finance/import/connector/restore boundaries are explicitly N/A
for this slice, not accepted by inference. The corrected synthetic diagnostic
capture and native Windows WebKit limitation are recorded, not hidden.

[SP-04 security evidence](03-planning/sprints/sp-04-evidence.md#security-boundary-record)
covers administrator-only user operations, temporary/handoff/expiry, reset proof,
revocation/attribution, last-admin/current-actor races, versioned non-secret retry,
actual rollback, strict transport and private diagnostics. 0003 migration isolation,
expanded production/dev bundle scan and final report-step inspection are recorded.
Records/files/finance/import/website/worker/restore boundaries are N/A for this
implementation, not accepted through an identity test. Actual staff delivery,
production privacy/least privilege and real Safari/devices remain separate.

[SP-09 security evidence](03-planning/sprints/sp-09-evidence.md#security-boundary-record)
records current-scope typed private/shared parents, direct session-bound hashed
permits with separate transient issuing-session proof, exact-origin CORS, strict
file validation/limits, immutable private objects and actual antivirus quarantine.
It covers single-use/revocation/race/rollback, worker fences/retries/dedupe,
publication failure/orphans, document merge provenance and migration isolation.
The local roadmap uses a confined filesystem adapter; it does not provision
cloud Spaces or public URLs. Real scanner/bytes and separate worker are required.
Final matrix/report/client/privacy and independent UI-review results must be read
from that record. Signature freshness, real-data policy, production ACLs,
deployment and measured recovery remain explicit later boundaries.

[SP-10 security record](03-planning/sprints/sp-10-evidence.md#security-boundary-record)
covers current linked-contact scope for independent searches/counts/shortlists,
safe shared offering targets without private owner identities, strict typed
criteria/money, exact normalization, versioned authorized retry, immutable origin
and history, SQL/FK/unique/intent guards and merge-preview impact. Real PostgreSQL
wait/revocation/race/rollback and committed-response interruption are exercised.
Final cumulative browser/privacy/isolation gates pass in that record; independent
UI review resolved its one functional finding, without human approval. Manual
selection grants no reservation, deal, finance, import,
production or full-product acceptance.

## SP-11 security boundary

[Execution evidence](03-planning/sprints/sp-11-evidence.md#security-boundary-record)
tracks scoped deals/proposals/history/counts, denied copied IDs, true current
identity after lock waits, version races, replay after revocation and atomic
rollback.0013 adds immutable typed origins/targets/actors and deferred history/
period/context guards. Ordinary writes cannot reserve/close or alter stock.
Merge preserves independent deals and authors while inheriting survivor scope;
private deal files reuse quarantine/real ClamAV/single-use transfer permits.
Strict server-only HTTPS facade, CSRF/Origin, no-store and bounded bodies/pages
remain authoritative. Final browser/client/report/privacy/isolation findings
must be read from the execution record, not inferred from this checklist.

## SP-14 security boundary

[Execution evidence](03-planning/sprints/sp-14-execution.md) tracks current linked
contact scope for visits/details/history/counts, administrator-only policy
changes, participant eligibility and safe colleague free/busy. Participation is
not a new detail permission. A copied private ID is404; scope is rechecked after
locks and before old receipts. Strict bounded facade bodies/queries, HTTPS,
Origin/CSRF/no-store and versioned hashed retry identities remain authoritative.
Policy and bookings share agency/user/policy lock order; hard scheduling/car
limits cannot be overridden by an ordinary overlap reason. Atomic events,
participants, audit and receipts survive interruption without duplicate booking.
Immutable origin/organizer/history survive transfer/merge. Migration guards and
retained-history/development downgrade refusal protect persisted facts. Safe
capacity totals/busy intervals expose no private title/contact/record identifier.
No external message, reminder worker, fleet assignment or production access.
Final full regression/privacy/isolation evidence is required separately; this
boundary description alone is not a passing security test.

## SP-13 security boundary

[Execution evidence](03-planning/sprints/sp-13-execution.md) tracks explicit
contact-scoped close/reopen, manager-only external stock, current authority on
retry and after stock waits, strict reviewed target/version/fingerprint bodies,
atomic history/outbox and shared-stock privacy. SQL guards protect terminal
stages, committed terms and append-only outcomes/effects/reversals; retained
history and development downgrades fail closed. Original actor/responsibility
snapshots are not rewritten by transfer, merge or reopen. Shared stock history
uses safe fixed KAY descriptions, never private outcome amounts or explanations.
No new finance, notification consumer, external messaging or production access
is introduced. Final browser/privacy/isolation results remain required in the
execution record; this checklist alone is not a passing test result.

## SP-15 security boundary

Task ownership cannot grant contact access. Authorize current session/contact
and optional same-contact deal before reads/writes/receipt replay; preserve
archive read-only behavior and immutable origin/actors across merge. Personal
inbox scope precedes counts/pages/unread totals, and obsolete/private items
cannot be marked read or opened through copied IDs.

Recheck current active-account/contact scope after acquiring the agency delivery
lock. Queue and notification rows contain typed IDs/kind/version, not cached
private text. SQL canonical keys, recipient/event uniqueness, immutable history
and monotonic read state complement fenced bounded claims and atomic command/
outbox commits. Status output is aggregate-only; fixed error codes do not log
private exceptions. No public clock override or external send is added.

[SP-15 evidence](03-planning/sprints/sp-15-execution.md) records actual negative,
race, retry, migration, browser and privacy checks. Test cleanup requires the
verified isolated target, advisory lease and synthetic-only account guard.

## SP-16 finance security boundary

Finance reads/counts/detail/history and every command require current M/A authority
before private lookup. Agent deal data contains no financial projection. After
agency/identity waits and before old-key replay, recheck active identity and
current contact/archive access. Positive strict decimal strings exclude float,
nonfinite/scientific and directly editable balance/state input. Commission locks,
versions and deferred SQL balance/chain constraints prevent over-collection;
append-only corrections retain actor/reason/original links. Commands, audit and
private retry result are atomic. Reopen review cannot erase or recalculate facts.
Optional proof binds a current clean same-deal/contact document version without
granting file transfer. Migration/fixture cleanup preserve target identity and
advisory-lease guards; no production/real records/secrets are introduced.
[SP-16 execution](03-planning/sprints/sp-16-execution.md) records actual focused
negative/race/retry/migration/browser evidence and retained untouched boundaries.

## SP-17 read-only reporting boundary

Current active identity and canonical contact scope precede all aggregates,
groups, pages and detail links. Agents see exact linked offerings, never expanded
agency-wide stock from shared Projects authority; finance is absent and direct
collections requests deny403. Portfolio uses current primary, outcomes immutable
primary-at-close, timeline true actor. READ ONLY REPEATABLE READ keeps one
response coherent through transfer; the next revoked read loses access. Current
alerts never write stock/outcomes. Strict facade query allowlists/duplicates,
bounded dates/pages, no-store and current session checks remain authoritative.

[SP-17 execution](03-planning/sprints/sp-17-execution.md) records actual scoped
positive/negative/invalid/transfer-snapshot/retry/browser evidence, zero client
secret matches, private report checks and guarded isolated cleanup. Synthetic
fixtures only; no new migration, credentials, production access or external send.

## SP-18 atomic CSV import boundary

Current M/A authority controls upload metadata, preview, row pages and permanent
result replay; agent denial precedes private lookup. Exact-origin direct uploads
use two-minute single-use hashed permits/session proof and bounded bytes. Private
UUID objects have no raw download/public/preview route; current authority and
generation are rechecked before publication. CSV text is strictly parsed, never
executed or rendered as an uploaded document; the antivirus document path stays
unchanged. Source/errors/notes never enter diagnostic logs or browser storage.

Agent/phone/hash revalidation and existing agency serialization precede ONE
approval transaction, including501-row multi-chunk rollback. Normalized phone
uniqueness rejects new competing claims; bounded sorted lock buckets avoid an
unbounded advisory-lock allocation. Permanent same-key/body batch result handles
post-commit response loss without duplicates. Imported original identities/agents,
true actor and notes survive authorized merge; ordinary APIs cannot forge CSV
provenance. SQL evidence guards, populated migration and retained-data downgrade
refusal are tested. [Actual evidence](03-planning/sprints/sp-18-execution.md)
separately records final browser, privacy, fixture and development isolation.
Real-data retention, export and production security review remain out of scope.

Final SP-18 client scan:4 roots/285 JS/0 configured-secret matches; private
report2 JSON/0 detailed step arrays,10 private/generated paths ignored/0 tracked.
Development OID109060 remains0 records after additive0019; isolated testOID109061
cleanup verifies exact private test root/exclusive lease and leaves63 record
tables0 rows/bootstrap unset. No real-data import, external send or production
access. Both verified schemas head0019/no drift. Synthetic fixture deletion
and expired/orphan reconciliation do not establish a real-data retention policy.

## Local runtime repairs (2026-10-16)

No facade/identity/secure-cookie/TLS checks were disabled. The Windows server loop
change does not filter exceptions or logs. Static filename compatibility accepts
the decoded `@` needed by a Next helper; fixed loopback upstream/static prefix,
traversal/host rejection and staff-API exclusion remain tested. No general proxy,
new WebSocket route or permanent CORS/origin widening was introduced. Development
simulator failure remains explicit; compiled mode passes its real signed workflow.

No Windows root-store mutation or administrator bootstrap occurred. Node probes
verify the known project CA; disposable headed browser TLS exceptions are not a
production policy. Final browser-build scan:4 roots/351 JS/zero configured secret
matches. Guarded test-only cleanup and a separate read-only development check are
recorded in [startup execution](06-delivery-and-operations/local-startup-execution.md).
