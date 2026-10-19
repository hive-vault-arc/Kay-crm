# Operational glossary

Status: specification; vocabulary is proposed except where decisions are explicit  
Date: 2026-10-14  
Confirmed decisions: KEPVY for KAY, C01–C14, one team, French product interface, MAD, and `Africa/Casablanca`.  
Technical proposals: the English object names, codes, and identifiers below.  
References: [brief](../../Project-brief.md), [rules](business-rules.md), [data model](../04-design/data-model.md), and [lifecycle guide](../../software_engineering_lifecycle.md).

| Product term | Identifier | Meaning and boundary |
|---|---|---|
| Contact / client | `contact` | Identity of a person or organization. A normalized phone belongs to one active contact, who may have several enquiries or deals. |
| Primary phone | `contact_phone.is_primary` | The number selected for display among several numbers. Exactly one primary phone per contact. An international prefix does not establish where a person lives. |
| Incoming enquiry | `enquiry` | A message or first contact, distinct from the contact identity and deal. A new enquiry may be linked to an existing contact. |
| Lead (UI label) | `enquiry` | The Leads screens present incoming enquiries linked to contacts. A lead is not a second contact identity or an automatic deal. |
| Requirement | `requirement` | A purchase or rental search with required, preferred, and unknown criteria. One contact may have several requirements. |
| Development / real-estate project | `development` | A marketable whole and grouping of physical units, not a software project. It may contain mixed property categories and may itself have sale/rental offerings. |
| Block / building | `block` | Optional subdivision of a development except where apartment units require a block; one development may have one or many. |
| Floor | `floor` | Level within a block. An apartment unit in a development belongs to a floor; other unit categories may be directly under a development. |
| Unit type | `unit_type` | Reusable development-scoped layout/classification template, such as T2/80 m². It can describe many physical units on different floors. It has no independent reservation or stock state. |
| Physical property / unit | `property` | One real asset: a standalone villa, house, apartment, land parcel or commercial premises, or one identifiable physical unit within a development. A unit type is not this asset. |
| Property category | `property.category` | `villa`, `house`, `apartment`, `land`, or `commercial` (local commercial); category does not decide whether the asset is standalone or part of a development, nor whether it is for sale or rent. |
| Property offering | `offering` | A `sale` or `rental` marketing offer targeting exactly one physical property or one whole development, with its own price, period, and state. Distinct from a customer's price proposal. |
| Customer offer | `customer_offer` | Price and conditions submitted within a deal. Acceptance and deal closing are separate events. |
| Opportunity / deal | `deal` | A contact's commercial case, possibly linked to a property and its offering. |
| Reservation | `reservation` | An active hold on an offering for a deal. At most one active reservation per `offering`. |
| Primary agent | `primary_agent_id` | The agent currently responsible for the contact's CRM portfolio. This is not the legal owner of a property. |
| Collaborator | `contact_collaborator` | An agent authorized to work on the contact's CRM records without becoming the primary agent. |
| Actor | `actor_user_id` | The user who actually performed an action, including when collaborating for another agent. |
| Owner / developer | `property_owner` / `development.developer_contact_id` | An owner is a contact linked to a physical property; a developer is a protected person/organization contact linked to a development. Neither link exposes private contact details or documents through shared inventory. |
| Handover / transfer | `assignment_event` | A timestamped change in primary agent or collaborators, including the previous and new scope. |
| Archiving | `archived_at` | Reversible removal from active lists while references and history are preserved. |
| Exact amount | `amount_mad` | A MAD decimal sent as a JSON string and stored as `numeric`, without binary floating-point arithmetic. |
| Business date | `date` | A calendar day displayed in `Africa/Casablanca`. Instants are stored in UTC; local time follows the time zone rules in force. |
| Visit type | `visit.type` | `company_car` and `without_company_car` are off-site visits subject to configured working times; `office` may be booked at any time. Only `company_car` uses the agency-wide hourly capacity. |
| Visit schedule policy | `visit_schedule_policy` | Database-backed administrator settings for local working days/hours, lunch breaks, and company-car capacity. These are hard booking rules, separate from a colleague free/busy warning. |
| Record version | `version` | Integer required for a change. A mismatch produces `VERSION_CONFLICT` for review. |
| Retry key | `Idempotency-Key` | Identifies a retry of the same command after interruption, rather than a new business intention. |
| Outbox | `outbox_event` | An event committed with a business transaction and later processed by a worker with retry and deduplication. |
| Transfer permit | `file_permit` | A short-lived, single-use token bound to a session, document, and upload or download action. |
| RPO / RTO | `RPO` / `RTO` | Target maximum data loss: one hour. Target time to restore service: four hours. Both require testing. |

`unknown` means information is absent; it is not zero, false, or proof that the requirement does not exist. `manager` has full team business access. `administrator` inherits it and can manage accounts. `agent` works on their own and collaborative contacts while reading all shared inventory.
