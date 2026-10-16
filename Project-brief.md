# KEPVY: product brief for KAY

Status: reconciled brief, specification not implemented  
Date: 2026-10-14  
Confirmed decisions: KEPVY is the product, KAY is the customer, and C01–C14 is the core for one team in Morocco with a French interface.  
Technical proposals: see [architecture](docs/04-design/architecture.md) and [decisions](decisions.md).  
References: [lifecycle guide](software_engineering_lifecycle.md), `KV/Knowledge/Design` and `KV/Knowledge/Engineering` notes, [scope](core-scope.md), and [business rules](docs/02-requirements/business-rules.md).

## Purpose and boundary

KEPVY brings KAY's real-estate CRM work together: receive an enquiry, identify the contact, qualify their requirements, inspect properties and developments, arrange visits, follow a deal, and review results. The product reports activity recorded in its own system; it does not claim to know about unrecorded external calls, calendars, or payments. One contact may have several enquiries and deals. A villa, house, apartment, or land parcel may be a standalone physical property or an individual unit in a development; each physical asset may be offered separately for sale and rent. An entire development may also have sale and rental offerings, subject to overlap checks against its units.

The first release serves one KAY team, without an agency hierarchy or multi-customer platform. It uses MAD, displays times in `Africa/Casablanca`, and uses English technical identifiers. Staff roles are administrators, managers, and agents. Everyone can read inventory and its attachments; access to private contact work follows the primary agent and collaborators. Managers have full business access, and administrators additionally manage accounts. See [permissions](permissions.md) for the exact rules.

## Planned core

| ID | Expected capability |
|---|---|
| C01 | One-time server-local first-administrator bootstrap, later manually managed named accounts, initial credential handoff, sign-in, revocable sessions, and roles. |
| C02 | Contacts, incoming enquiries, international phone numbers, controlled duplicates, primary agents, and collaborators. |
| C03 | Purchase/rental requirements, criteria, manual shortlists, and rent comparisons. |
| C04 | Standalone properties and developments with optional blocks/floors, reusable unit types, physical units, sale/rental offerings at unit or whole-development level, availability, owners, optional project briefing, and documents. |
| C05 | Attributed timeline and handover without rewriting history. |
| C06 | Tasks, reminders, and internal notifications. |
| C07 | Company-car, no-company-car, and anytime office visits; CRM free/busy calendar; administrator-configured off-site working days/hours and lunch breaks, with an agency-wide adjustable company-car hourly limit initially set to two. |
| C08 | Deals, customer offers, pipeline, reservations, closing, and reopening. |
| C09 | Optional operational commission and collection tracking. |
| C10 | Dashboard, attributed KPIs, and exception lists. |
| C11 | Search, pagination, atomic contact CSV import, and controlled exports. |
| C12 | Contract for a form on an existing website, with the actual site still to be identified. |
| C13 | Responsive web use on desktop and phone, following the [named screen map](docs/04-design/screen-map.md); local placements are selected and the actual count follows implemented routes. |
| C14 | Audit, permissions, backups, recovery, and acceptance evidence. |

The [scope](core-scope.md) gives the criteria for each C item; the [BR rules](docs/02-requirements/business-rules.md) resolve boundary cases. The [tests](docs/05-quality/acceptance-tests.md) still need to run. [Traceability](docs/05-quality/traceability.md) connects all three.

## Future catalogue outside the core: O01–O23

Each option except O17 requires an explicit scope change, permissions, data model, provider review, and tests. O17 is retained as a catalogue ID for history but has been promoted into C04 by KAY's 2026-10-14 decision; it is no longer a future-only option. Worldwide phone-number support and monthly/yearly rent comparisons already belong to the core, even though more advanced international and rental options appear below.

| ID | Idea retained for future review |
|---|---|
| O01 | AI matching between requirements and properties, visibility into unmet demand, and human review of suggestions. |
| O02 | Official WhatsApp conversations within the CRM, subject to available APIs and consent. |
| O03 | Social lead forms and supported messaging channels, with provenance and deduplication. |
| O04 | External email and calendar connections with explicit access, synchronization, and revocation. |
| O05 | Business telephony, routing, and call history, subject to a provider. |
| O06 | Recording, transcription, and call summaries when permitted, with retention rules. |
| O07 | Identified activity on the agency's own website, with suitable purpose and permissions. |
| O08 | Client reminders, approved sequences, and broader business automation. |
| O09 | AI conversation analysis and proposed CRM updates that a person must confirm. |
| O10 | AI drafts of replies, listings, and handover summaries, reviewed before distribution. |
| O11 | AI-assisted CSV/Excel import or migration with verified mapping and dry runs. |
| O12 | Bud, an in-app voice assistant bounded by permissions and action confirmation. |
| O13 | Daily manager briefs and coaching assistance based on accessible data. |
| O14 | Advanced reporting, attribution, and allocation beyond the initial KPIs. |
| O15 | Buyer and property-owner portals, with external identities and fine-grained sharing. |
| O16 | Cross-agency collaboration and co-broking with contractual data boundaries. |
| O17 | **Promoted into C04:** developments, optional blocks/floors, reusable unit types, and physical units. Retained here only for catalogue continuity. |
| O18 | Advanced rental management: contracts, renewals, recurring payments, and incidents. |
| O19 | Additional languages and international coordination beyond worldwide phone entry. |
| O20 | Evidence-based property price comparisons with data provenance. |
| O21 | Approved listing publication and withdrawal on external platforms. |
| O22 | Native apps and offline work with synchronization and conflict handling. |
| O23 | Other tools, integrations, and automations under explicit contracts and permissions. |

Communication and AI options would depend on providers, access rights, and sometimes a personal-data review. This catalogue does not authorize any provider connection. It implies no price, financing, commercial schedule, or intellectual-property rights in another product.

## Core handoff criteria

A demonstration must take an enquiry through a deal and its justified stock effects, then prove permissions, errors, import, KPIs, and recovery. Accounts are manual, without email verification or MFA. A commission may be absent. Contact records do not expire automatically; KAY still needs to decide transaction retention. Performance and recovery targets must be measured against the defined scenarios and volumes. This brief alone does not guarantee them. See [release and recovery](docs/06-delivery-and-operations/release-and-recovery.md).
