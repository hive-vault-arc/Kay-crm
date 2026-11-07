# Selected prospect and affair directory filters

Date: 2026-10-28. Branch: `codex/redesign`.
[Coverage map](../03-planning/design-migration-coverage-2026-10-28.md) ·
[Contacts directory](contact-directory-local.md).

## Confirmed selected gaps

The frozen `src/directory-filters.js` supplies Agent and 'Non attribués' for
prospects; its date predicates use each row's creation date. The real Prospect
and Affair filters instead reused active-account assignment choices, omitted the
unassigned queue, and exposed only Affair modification dates. This source slice
connects those selected controls to real read predicates without changing write
eligibility, ownership, assignment, lifecycle or any stock workflow.

The existing selected rail/phone Sheet, compact result cards, desktop-only
Kanban, column preferences, ordinary soft controls and spacing remain. No new tab,
record layout, shell, component library, icon family or export capability is added.

## Current readable filter choices

The shared AgentPicker distinguishes three internal purposes:

- Assignment: existing `/api/v1/contacts/assignment-options`; existing active,
  eligible-account M/A behavior, default for business forms.
- Contact responsibility filter: existing scoped
  `/api/v1/contacts/responsible-options`, now also used by Affairs. Its IDs are
  Contact.primary_agent_id; it may include inactive responsibility.
- Enquiry assignment filter: new read-only
  `/api/v1/enquiries/assigned-options`. Its IDs come from readable enquiries'
  assigned_agent_id, which may differ from the contact's primary agent. It
  includes historical/inactive assignees already named in those readable rows.

Both filter option endpoints admit only q/page/page_size, escape search text,
count before stable numbered paging, return only the existing id/display_name
projection and current scoped total, and reject duplicate/unknown/copied filters.
They derive canonical unmerged contact IDs under current scope. Agents exclude
archived parents; their enquiry choices also require non-null assignment. M/A
retain readable archived parents/history. An inventory or unrelated staff record
never supplies a private contact grant. Assignment eligibility remains separate.

Agent directory filters are now available for their readable/collaborating scope;
contact-scoped inline lists keep the redundant agent control omitted. Existing
contacts/identity live topics already invalidate these endpoints: backend enquiry
and assignment tables publish in the contacts group. No new live topic is needed.

## Explicit unassigned read filter

Prospect list/export query `assigned_agent_id` now accepts a UUID or the exact
literal `unassigned`. The latter adds `Enquiry.assigned_agent_id IS NULL` after
current parent scope, archive and existing Agent non-null-assignment restriction,
and before status totals/pages. Thus an Agent's copied unassigned query has no
rows/counts; it cannot discover the managerial queue. Only M/A receive the
selected 'Non attribués' choice. Empty/null/all is not a second spelling for that
literal.

This sentinel is a read criterion, not a user identity. NewEnquiry and assignment
commands remain UUID-only; no creation, assignment, takeover or account state
changes. Contact lists and Contact exports reject it as an enquiry filter.
Applied list/board filters and M/A export review retain the literal; review states
'Prospects non attribués'. The existing durable worker, current identity, scoped
list service, CSV layout and private transfer flow remain authoritative. Omitted
old values and canonical export hashes are unchanged; an explicit queue criterion
is a distinct reviewed request. No actual export or worker was executed.

## Affair creation and modification periods

`GET /api/v1/deals` adds optional ISO dates `created_from` and `created_to`.
Existing `updated_from`/`updated_to`, sorting and all other query fields remain.
Both pairs validate independently and intersect if both are applied. Backend
Casablanca civil days become inclusive [start, next-day start) UTC predicates;
maximum end dates do not overflow. Scope/merge/archive predicates precede both
ranges, filtered total, stage counts and stable numbered pages. Neither range
borrows an enquiry timestamp or alters historical/command timestamps.

The selected date meaning is labelled 'Date de création' with 'Créée à partir
du'/'Créée jusqu’au', instead of carrying the prototype's ambiguous 'Reçu' label
onto an affair. Existing modification controls remain in a separate 'Dernière
modification' disclosure. The shared filter hook retains both applied ranges and
the current page on either invalid draft, reports the error, and resets both
ranges/page through the existing reset action. Boards receive the same applied
filter object; phone view remains compact cards. There is no Deal CSV export.

Legacy JSON page/summary shapes and ordinary UUID filters remain unchanged.
Older services can reject newly unsupported fields with an ordinary visible
request error; these additions do not silently replace an unrecognized filter
with all results or invent zero counts. No persistence capability is simulated.
The maximum inclusive enquiry received-to date is also now guarded against a
next-day overflow, preserving its existing date meaning and export predicates.

## Source verification and remaining gates

Connection-forbidden backend cases inspect actual compiled scoped reads/counts/
pages, option projections, strict in-process route guards and UUID-only writes.
Frontend cases exercise real schemas/facades, all three AgentPicker purposes,
queue/export propagation, both actual date controls and shared filter-hook draft/
page/reset behavior. Static app lint covers the four changed UI files.

Four isolated PostgreSQL cases are prepared for actual queue/count/page/export,
inactive different enquiry assignees/revocation, and Agent/M/A combined civil-day
ranges. Two new browser journeys cover desktop M/A queue filtering and phone
date draft recovery; they have not run. The previous Contacts browser fixture
bodies are corrected to include required phone labels/emails and now share a
factory validated against the real facade before sending any command. A pure
case validates all three prepared command variants; typechecking alone is not
claimed to validate their runtime bodies or make browser acceptance pass.

No migration, DB/service/account/configuration/real record access, actual app
HTTP/browser/CUA/CDP workaround, worker, import/export/transfer, main/push/merge or
deployment occurred. Migrations0036/0037 remain unapplied. Real SQL/native/device/
performance/CI/AFTER/product review remain pending. This slice does not complete
the full redesign or P0 per-field/control reconciliation.

[Checkpoint commands and source hashes](../03-planning/design-migration-evidence/dossier-directory-2026-10-28.json)
separate the current source checks from the prepared native/real SQL gates.
