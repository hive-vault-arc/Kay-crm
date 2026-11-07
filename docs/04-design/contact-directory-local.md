# Selected Contacts directory reconciliation

Date: 2026-10-28. Branch: `codex/redesign`.
[Coverage matrix](../03-planning/design-migration-coverage-2026-10-28.md).

## Selected surface and preserved workflow

The frozen `src/pages.js` Contacts directory and `src/directory-filters.js`
contain responsibility, language, linked dossiers, country, contact role,
creation dates, archive and sort controls. The real directory previously exposed
only search/archive, despite country/language/name predicates already existing.
This source slice places those capabilities in the existing selected filter rail
and phone Sheet. It retains compact result cards, semantic controls, the existing
Contact overview/activity organization and linked dossiers below responsibility.
Import opens the existing Leads import workspace; export/history retain their
existing M/A-only actions and private durable job pipeline. No standalone Contact
creation workflow or extra tab is invented.

## Query and access contract

`GET /api/v1/contacts` adds optional `primary_agent_id` (UUID), `linked`
(`enquiries`, `deals`, `none`), `role` (the five canonical contact roles),
`created_from`, `created_to` and `sort=-created_at`. Existing q, country,
language, archive, name/updated sort and numbered pages remain. Date ranges are
validated; inclusive civil days resolve with backend `Africa/Casablanca` tzdata
as [start, next-day start), avoiding overflow on the maximum end date.

Canonical unmerged Contact scope and archive authority precede predicates,
count and stable pagination. Agent collaborator grants remain effective;
private unrelated contacts never participate. Creation dates refer to the
canonical contact, not an enquiry's received time. The selected reference's
contact label 'Réception récente' is therefore presented as 'Création récente'.
Contact-only filters are rejected on enquiries, including copied explicit null
export fields. Enquiry qualification/assignment/received filters are rejected
on Contacts. Duplicate and unknown transport parameters remain invalid.

`GET /api/v1/contacts/responsible-options` accepts only q/page/page_size and
returns the existing bounded agent-name page shape. Its choices come from
currently readable canonical contacts; agents exclude archived parents. M/A can
filter the responsibility of archived or disabled staff already visible through
those records. It does not list unrelated staff or grant assignment eligibility.
The existing M/A active-account `/contacts/assignment-options` is unchanged.

## Counts, compatibility and actual meaning

The facade alone sets `X-Kay-Contact-Directory: 1` on exact GET Contacts lists.
An opted-in result adds `directory_supported:true` and each selected page item
adds `dossier_counts:{enquiries,deals}`. The legacy response and ordinary Contact
summary/detail schemas stay unchanged. New strict schemas accept coherent legacy
or extended pages and reject mixed, missing, extra or negative counts. A legacy
service yields no invented zero-count columns and disables unsupported controls;
reset remains available. Request failures mask prior totals, records and exports.

Counts and linked filters follow the existing ContactDossiers default lists:
nonarchived enquiries excluding converted ones; agents also require non-null
enquiry assignment; nonarchived deals of every stage. A closed deal remains a
dossier. These are readable working dossiers, not all historical relationships.
The UI states 'Dossiers non archivés, prospects hors convertis'. This reconciles
the prototype's synthetic array totals with the CRM's actual default lists; it
does not delete converted/archive history or change record lifecycle policy.

The same correlated predicates serve linked filtering and counts. A single
page-bounded count query reasserts current parent scope; empty pages retain the
scoped total without reading unrelated dossier counts. There is no client-side
count over a partial page and no per-row HTTP request. Existing contact-topic
invalidation already covers enquiries, deals, identity and scope changes.

## Applied filters and private exports

Shared `useDirectoryFilters` retains draft/applied filters, debounced updates,
explicit Apply, date errors, reset and first-page reset on a valid change. The
language input offers canonical suggestions while admitting normalized historical
language values. Country uses the existing canonical metadata. Phone controls
reuse the icon search/filter Sheet and ordinary compact record disclosure.

M/A export review receives the complete applied filters, labels the new criteria
and strips page/page_size. `NewExport` uses the same kind validation; the durable
worker still reads `list_in_session` under current identity before every export.
CSV columns, protected storage, current-role checks, limits, transfer/permit,
revocation and worker flow are unchanged. `export_payload` excludes only the new
optional fields when omitted, preserving the exact pre-extension canonical body
and receipt hash. An explicit new filter changes the request identity. No export
job, worker or actual transfer was executed for this source slice.

## Verification boundary

Connection-forbidden units exercise compiled SQL, real list/option/export-request
functions with stub sessions, strict schemas/facades, exact TLS negotiation and
actual UI component projections. Prepared PostgreSQL cases cover count parity,
conversion/archive, revocation/options, civil dates/whole-result CSV and disabled
responsibility. Two prepared browser journeys cover desktop Agent and phone M/A
filters/counts. These integration/browser cases have not run.

No migration is required. Existing migrations0036/0037 remain unapplied. No real
DB, account, records, private configuration, app HTTP/browser, production,
main/merge/push or deployment operation occurred. The current app-access
restriction was preserved. Final real-stack/native/visual/touch/zoom/focus,
performance, CI, AFTER audit and owner acceptance remain pending.

[Actual commands and source hashes](../03-planning/design-migration-evidence/contact-directory-2026-10-28.json)
retain the source-check results separately from the prepared real SQL/native gates.
