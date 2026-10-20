# Generated Lead and Deal documents

## Boundary

The twelve owner-supplied blank PDFs under
`docs/reference/real-estate-document-templates/` are working drafts, not approved
legal instruments. The CRM offers them from a dedicated Documents page on each
Lead and Deal. Users choose a model, review editable prefilled fields, and generate
a private PDF. The generated PDF begins with a branded preparation sheet
containing the submitted values and appends the unchanged blank owner model for
reference. Its original dotted fields are **not** filled; no electronic signature
or legal approval is implied. The warning remains visible in both UI and PDF.

Only models 10 (payment receipt draft) and 11 (commission invoice draft) are
manager/administrator-visible, including generic file reads and download permits.
Model 07 is a notary/adouls preparation document,
not a signable compromise or permission to take a deposit. Model 10 is not proof
of funds received; model 11 requires accounting verification. Model 09 does not
make CIN collection routine. Model 03 does not create property-management authority.

## API and authority

The authenticated Next facade forwards:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/generated-documents/context?parent_kind=enquiry\|deal&parent_id=UUID` | Current scoped prefill, available models and edit permission |
| GET | `/api/v1/generated-documents?parent_kind=enquiry\|deal&parent_id=UUID&page=N` | Immutable generated-PDF history, 20 per numbered page |
| POST | `/api/v1/generated-documents` | Generate one model with a UUID `Idempotency-Key` |

POST body: `{parent_kind, parent_id, template_code, values}`, where
`template_code` is 01–12 and `values` is a bounded string map of that model's
declared fields. Unknown fields, controls and excess lengths are rejected.
Current session and current Lead/Deal/contact scope are checked at read, command,
retry and download permit time. Archived records cannot generate new PDFs.
History remains readable to users with current scope. The backend is authoritative
for template visibility, including finance models.

Contact name, primary phone/email, agent name, budget, and linked Deal offering
facts are proposed as editable prefill. Missing data remains blank; submitted
values are rendered as entered, with no invented identity, financial or legal
facts. A new request creates a new immutable PDF; it never edits a past one.
Same-key same-body retries return the original document. The existing
session-bound, one-use file permit controls download.

## Physical storage and release

Migration `0030_generated_documents` adds nullable `document.enquiry_id` and
`document.template_code`, preserving existing rows. A generated document has
exactly one Lead or Deal parent, PDF MIME, immutable clean version, SHA-256 and
true-actor audit event. The existing private storage abstraction writes a local
UUID object in development or a private DigitalOcean Spaces object in hosted
environments. No public bucket URL or client-side storage is used. Server-rendered
PDF bytes are trusted output assembled from escaped text and bundled source PDFs;
they are not accepted as user-uploaded PDFs and do not enter the ClamAV upload
queue. Existing attachments still use their normal quarantine and scan path.
Deployment must include the bundled fonts/source PDFs, ReportLab dependency,
and migration 0030 before the new API is served.

## Verification

Synthetic tests cover all twelve renderers, escaping, current scope, finance
denial, immutable history, local byte integrity, same-key concurrency and storage
interruption. Browser checks must cover Lead and Deal context, editable prefill,
creation, retry, paged history and download, plus desktop/mobile/keyboard states.
