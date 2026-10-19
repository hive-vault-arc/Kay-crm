# KEPVY: core business workflows

Individual Lead/Deal removal now means archive: the owner agent (or M/A) confirms
the action, the record leaves active directories, and its notes/history remain
readable under current scope. It can be restored from its directory archive for
30 elapsed days, provided ownership and parent authority still hold. Beyond
that, restoration is denied but linked business/financial history is retained.
This does not change the separate, non-expiring contact archive workflow.

Status: target workflows, not demonstrated  
Date: 2026-10-14  
Confirmed decisions: actors, stages, and outcomes follow the [business rules](docs/02-requirements/business-rules.md).  
Technical proposals: interface states and transactions described in the [API](docs/04-design/api-contracts.md).  
References: [scope](core-scope.md), [permissions](permissions.md), [tests](docs/05-quality/acceptance-tests.md), and [decisions](decisions.md).

## W01: set up the team (C01)

After migrations, the intended first administrator uses the guarded interactive bootstrap and their own final password; no public bootstrap/signup exists. Under D37, the administrator creates later named accounts with an initial password they choose and privately distribute. The account is active immediately, without an activation button. Its first session is restricted to own profile/password change/logout; a different own password and fresh sign-in are required before CRM access. Initial passwords expire after24 hours. Reset requires the administrator's current password plus a chosen replacement, revokes target sessions and repeats restricted setup without handoff confirmation. Existing staff are not bulk-reset. Delete hides an account and revokes access while retaining authored CRM history. Normal sessions last at most seven days. See the [current runbook](docs/06-delivery-and-operations/admin-bootstrap.md).

## W02: receive and assign an enquiry (C02, C12)

SP-20 demonstrates the synthetic signed local flow: submit once, retain the
opaque durable receipt, refresh status without resubmitting, then sign in as
currently authorized staff to see the received Lead. After an uncertain
acknowledgement retry the identical submission, not a fresh request. Known phones
do not overwrite identity/ownership; only a new phone uses the configured active
agent. Exhausted/revoked work retains its receipt for explicit local-operator
repair/retry. No deal is automatically created.
[Implementation/runbook](docs/04-design/website-intake-local.md).

A manual enquiry (shown as a **Lead** in the interface) or a submission from the authenticated website form arrives with its source and submission ID. The normalized phone links to an existing contact or creates one if the number is new and the action is authorized. An agent who encounters another agent's private contact sees the primary agent's name and requests access or transfer. A manager handles unassigned enquiries. A second enquiry from the same contact remains distinct; retrying the same form submission does not duplicate it.

The owner's 2026-10-17 IMMO World alignment replaces the earlier separate,
free-title deal form from a Lead. Staff explicitly convert an accessible Lead by
reviewing its version and supplying a project (catalogue or external), budget
and buying intent. The operation reuses the canonical client, inherits source
and qualification, records both histories, and marks that Lead converted in one
transaction. No separately typed deal title, duplicated client or automatic
inventory reservation is involved. Converted Leads leave the default prospect
list and remain available through the converted filter and linked deal.

Manual creation from Affaires remains a separate qualified workflow, for an
existing scoped client or a new client committed atomically. It requires client
languages, budget, buying intent and one to three project interests; it does not
convert or silently link an enquiry. Lead/deal editing can update canonical
client facts and qualification atomically with both reviewed versions. Existing
stock, proposal, outcome and permission commands retain their separate effects.
[Current contract](docs/04-design/deal-pipeline-local.md),
[verification and open acceptance](docs/03-planning/leads-deals-immoworld-alignment.md).

## W03: qualify and shortlist (C03)

The agent records the requirement, including unknown, required, and preferred criteria, a MAD budget, and its period. They filter whole-development or physical-unit offerings and build a shortlist against the exact offering, not a unit type. A separate search becomes a second requirement. Rent comparisons retain the original price and period and use an exact twelve-month equivalent.

## W04: manage inventory (C04)

D34 (Khalid, 2026-10-16) extends the create/edit parts of this workflow to all
active agents: shared development facts/briefing, blocks/floors/reusable types,
standalone properties and physical units. Agents can select only accessible
developer contacts; an unchanged hidden developer link is preserved. Manager-only
legal-owner/file/campaign/availability/external-outcome/archive/restore actions
and all stock constraints remain. This supersedes the original read-only-agent
sentence in the historical workflow description below.

A manager either creates a standalone villa, house, apartment, or land parcel, or creates a development with a protected developer contact and individual physical units. An apartment unit in a development is placed on a floor in a block; other categories may omit those levels. The manager defines reusable unit types within the development (for example T2/80 m²) and assigns a type to multiple actual units on different floors. A type has no stock or reservation; each unit does. A mixed-category development is allowed. The manager may add an optional shared project briefing; it contains no private developer/owner contact facts. The manager links owners to physical units, adds shared inventory attachments, and confirms price and availability under the accepted local H-01/H-02 price/owner defaults. Private owner/developer evidence stays on protected contact records. The whole development and each unit may have independent sale and rental offerings, but overlap conflicts are checked before reservation or closing. Availability not reconfirmed for 30 days appears on an exception list. An agent may read inventory and report a correction but cannot edit inventory directly.

## W05: organize a visit (C06, C07)

The agent records one of `company_car`, `without_company_car`, or `office`, plus the contact, duration, participants, and location. Both off-site types are checked against the current agency working days/hours and lunch breaks; office visits can be booked at any time. Company-car visits additionally use the agency-wide hourly capacity, initially two and adjustable by an administrator. A full-capacity or out-of-hours slot is rejected, not bypassed by an overlap reason. The agent sees their own details and only free/busy intervals for colleagues. An ordinary appointment overlap opens a warning; proceeding requires a reason while all hard scheduling rules still hold. Internal reminders at one day and one hour before follow the current appointment. Rescheduling and cancellation keep the appointment identity and invalidate old reminders; overdue unresolved visits appear in a follow-up list. Accepted local Q-07 counts every clock-hour interval touched by [start,end), excluding the exact end boundary and distinguishing DST offsets.

## W06: collaborate or hand over (C02, C05)

A manager adds a collaborator or transfers a contact's primary agent after previewing active enquiries, deals, visits, and tasks. The action records the former and new assignees and the true actor. Historical actions remain attributed to their authors; a collaborator does not become the primary agent. Any enquiry assignment that would point to an agent losing contact access is cleared or reassigned in the same transaction for manager review; it does not preserve a hidden access path. The former agent's access is recalculated after commit.

## W07: close and reopen a deal (C08, C04)

A deal moves through stages that may be skipped. Customer price proposals remain separate from the property's or whole development's offering. Closing as won requires the agreed amount, date, and explanation, and checks the reservation, availability, and any project/unit overlap in one transaction. A sale withdraws an active rental offering on the sold target; a rental may leave its sale offering active with occupancy shown. A whole-development disposition checks child commitments; it cannot silently sell or lease a unit already committed separately. A unit sale flags a whole-development sale offering for review. Competing deals are flagged, not closed automatically. The primary agent or a collaborator may reopen with a reason; the system checks current stock and routes conflicts to manager review without erasing history or financial facts. The partial-development commercial treatment remains Q-06.

## W08: track an optional commission (C09)

A manager may record a fixed or percentage commission, recognize the earned amount, set its due date, and record partial receipts. The deal can finish normally without a commission. A receipt above the remaining balance is rejected. A correction keeps the original amount and evidence, along with its reason and replacement. Reopening a deal triggers review, not deletion.

## W09: manage work (C06, C10)

An agent works through today's and overdue tasks within their scope. A manager reviews team outcomes, activity, and exceptions: portfolio by current primary agent, outcomes by agent at close, and actions by true actor. The 30/14-day alerts do not change state. Totals distinguish developments, blocks/floors, reusable types, physical units/standalone properties, whole-development offerings, unit offerings, contacts, enquiries, won deals, and actual collections; a whole-development offering never inflates the physical-unit count.

## W10: import and export (C11)

A manager imports a fixed-template CSV, sees existing phone numbers that will be skipped, and corrects every invalid row. Approval rechecks permissions and numbers; it creates all new rows in one transaction or creates none. A retry returns the original batch result. Export respects permissions and neutralizes spreadsheet formulas in CSV cells.

## W11: configure visit scheduling (C01, C07)

An administrator opens Settings → Working Hours, enters the active weekdays and local working windows, lunch breaks, and the agency-wide company-car visits-per-hour limit (initially two). No particular workday or clock-time schedule is assumed before this configuration. The backend validates the windows and version, previews future visits that the proposed change would place outside policy, then saves the settings and actor in the database. Existing visits remain recorded and are flagged for review rather than silently moved or cancelled. Manager and agent attempts to edit the policy are denied. The Visit Calendar reads the current policy for previews, while every off-site create, confirm, and reschedule is rechecked transactionally; office visits remain bookable at any time. Accepted local Q-07 counts each clock-hour interval intersected by [start,end); its boundary/DST cases are part of SP-14.

In every workflow, an error, denial, or conflict remains visible; the interface does not claim a failed change was saved. The [AT scenarios](docs/05-quality/acceptance-tests.md) cover forbidden, interrupted, and recovered variants.

## Local SP-15 work and follow-up

From a permitted contact or deal, staff create a titled, owned, dated task,
edit it while open, then explicitly complete/cancel it with optional outcome.
A failed response preserves the draft and retry identity. A concurrent change
requires comparison with the current version, never silent overwrite. Terminal
history and true actors persist across contact merge/transfer.

The dashboard shows backend-Casablanca today/overdue work, scoped internal
notifications and ended visits still needing an outcome. Marking a notification
read does not change its parent. Opening follow-up resolves that same visit
through the existing explicit lifecycle. J-1/H-1 and task due work use the durable
worker; reschedule/terminal changes invalidate obsolete reminders. No external
message is sent. [Contract](docs/04-design/tasks-reminders-local.md),
[execution and current gate status](docs/03-planning/sprints/sp-15-execution.md).
