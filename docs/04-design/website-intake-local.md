# SP-20: local signed website intake

Technical contract, 2026-10-16. C12/C02/C11/C14/C13, BR03/04/21,
intake AT22/30 and affected AT23. Product review remains pending Khalid.
The actual website/technical owner remain Q01; no real site is connected.

## Authority and HTTP

The separate Python-venv simulator binds127.0.0.1:8001 over local HTTPS.
Its origin is **https://127.0.0.1:8001**, not localhost: staff host-only cookies
therefore do not accompany form requests. Strict Host and exact Origin/JSON
checks reject DNS rebinding/cross-origin submissions. It serves the existing
Next/shadcn/Tailwind form and allowlisted static assets through a loopback-only
read proxy; it does not proxy staff APIs, cookies, authorization or other URLs.
Upstream TLS verifies the private local CA; redirects and environment proxies
are disabled. The frontend must run onlocalhost:3000. Synthetic tests use
8102/8100/3100 and isolated PostgreSQL, independently of development.

The simulator signs raw JSON server-side. Only its ignored
backend/.local-data/website/{environment}.json holds the random signing secret.
No browser secret, staff role/owner control, public CRM signup, staff-session
impersonation, new queue or external service is introduced.

`POST /api/v1/intake/website/{source_key}` requires application/json,
X-Kay-Timestamp as Unix seconds and X-Kay-Signature as the hex HMAC-SHA256 of
timestamp text + dot + exact raw body bytes. Timestamp may differ by at most
300seconds. Source authority must be active and its configured key digest match.
Unknown/disabled/wrong-key/tampered/stale calls get one generic401. An8192-byte
stream/content-length cap precedes parsing. A persistent atomic global300/minute
intake budget also covers invalid requests; exceeding it returns429.

Strict body: submission_id(ASCII letters/digits/underscore/hyphen,1–100), aware
submitted_at, name(1–160), international phone, optional email, message(≤4000),
optional property_reference(≤100), optional source matching the configured key.
Combined message/reference must fit4000. Staff role/owner/agent fields are rejected.
Submitted time is source evidence, not authoritative CRM receive time.

202 follows commit of receipt and typed outbox, not merely validation. Response
is exactly receipt_id(opaque random UUID) and state(queued/processed/failed).
Same source/submission with identical raw bytes returns the same receipt at any
processing state; different bytes conflict409. Signing timestamps may refresh on
retries while payload bytes remain identical. A new submission ID is a distinct
enquiry, even on the same phone. Receipt UUID also namespaces the enquiry's
internal UUID submission identity, avoiding collisions between sources.

`POST /api/v1/intake/website/{source_key}/receipt` is signed identically with
body receipt_id only. Lookup also binds the current source. It returns only those
two public fields, never contact existence/IDs, staff identity, routing errors,
enquiry links or private payload. Receipt references are kept in page memory,
not browser storage or URLs. The form retains exact retry bytes after uncertain
acknowledgement; refreshing status never submits a second enquiry.

## Durable processing and privacy

Migration0022 adds website_source and website_receipt, typed website.process
outbox ownership, unique source/submission and processed-enquiry linkage.
Source authority has its own UUID and key digest/default route; it is neither
a staff account nor a staff session. Existing user authors remain unchanged.
New source-authored contact/phone/email/enquiry/timeline/audit rows have a source
FK and null staff-author FK, with SQL XOR and immutable provenance. Staff-created
records still require their real user actor. History labels identify the source;
automated events are not attributed to staff activity KPIs. Manager audit includes
source actors without inventing a user ID.

Worker routing takes the existing agency lock, shared with staff ownership,
identity, imports and canonical-phone commands. A new phone creates a contact
under the current configured active eligible default agent. Known phones reuse
their current canonical contact without changing name/email/ownership/archive
or other contact data; the currently eligible primary receives the enquiry,
otherwise assigned_agent_id is null for manager review. Archived contacts stay
archived and remain M/A-only through the archived list. Knowing a phone grants
no contact permission. No deal, inventory change or external notification occurs.

Database-only contact/enquiry/history/audit/receipt/job effects commit in ONE
short transaction under row locks. There is no external operation to fence;
SKIP LOCKED and the shared agency lock exclude concurrent processing, and a
killed connection rolls back the complete claim/effect. Durable receipt/outbox
remain for restart. Jobs retry with2^attempt seconds up to5 attempts and fixed
non-private error codes, then retain failed state. A disabled source invalidates
its queued job. SQL/deferred guards require the matching processed enquiry and
outbox; originals and terminal results are retained. Merge preserves receipt
linkage and source authorship while the enquiry follows current survivor scope.

## Local operation

From backend/, after ordinary bootstrap and an active non-temporary agent exist:

```powershell
.venv/Scripts/python.exe -m app.cli.website_source --agent-id <active-agent-UUID>
.venv/Scripts/python.exe -m app.cli.website_simulator
.venv/Scripts/python.exe -m app.cli.worker
```

Start the normal API/frontend separately. Open the127.0.0.1 simulator origin,
use synthetic data only and find Site web enquiries in authorized Leads.
No account/default agent is seeded into development by installation or tests.
Initial configuration is an explicit local-operator action, not a public form
choice. `--rotate` on website_source rotates the private key and updates its
durable digest; reconfiguration also restores the source after disable.

```powershell
.venv/Scripts/python.exe -m app.cli.website_control --disable
.venv/Scripts/python.exe -m app.cli.website_control --retry-receipt <failed-receipt-UUID>
.venv/Scripts/python.exe -m app.cli.worker --status
```

Repair/reconfigure routing or authority first, then retry the retained failed
receipt explicitly. Never create a new submission to recover an uncertain one.
Recovery keeps receipt/outbox/submission identities and previous attempts remain
observable in the retained job until explicit operator reset. These CLIs have
no HTTP route and do not create staff. Config/files are ignored and outside the
public root. Real-site authentication/rotation ownership, production ACLs,
retention and privacy notices require separate Q01/Q02/Q03 decisions.

Executable verification and limitations: [SP-20 execution](../03-planning/sprints/sp-20-execution.md).
