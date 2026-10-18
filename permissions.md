# KEPVY: roles and permissions

D35 Lead/Deal qualification introduces no new role grant. Accessible Lead
conversion, manual deal creation and canonical profile edits use the current
contact responsible/collaborator scope and active identity. Assignment remains
manager-controlled. Missing, private or archived records cannot acquire a deal
or new scope through a project selection, receipt replay or copied identifier.
Snapshots remain private to the currently authorized parent. Existing manager
finance, shared inventory and exact stock/outcome/file permissions are retained.
[Current contract](docs/04-design/deal-pipeline-local.md),
[verification](docs/03-planning/leads-deals-immoworld-alignment.md).

SP-20 local implementation: a configured website source has no staff role or
session. Its signed intake/status responses contain only receipt identity/state.
A submitted phone never grants CRM access. Known contacts keep current primary/
collaborator scope; source/default agents receive no grant to an existing private
contact. Ineligible assignment routes internally to manager review. Local trusted
operator CLIs configure/revoke/recover the source; no public role/owner selector.
[Contract](docs/04-design/website-intake-local.md), [evidence](docs/03-planning/sprints/sp-20-execution.md).

Status: confirmed business rules; implementation still to be verified  
Date: 2026-10-14  
Confirmed decisions: managers have full business access and administrators inherit it; agents work on contacts they own or collaborate on; everyone reads development/unit inventory and its shared attachments; financial actions and bulk import/export belong to managers/administrators.  
Technical proposals: capability checks and typed-parent authorization on every operation.  
References: [BR-04 to BR-06](docs/02-requirements/business-rules.md), [API](docs/04-design/api-contracts.md), [security](docs/04-design/security-and-privacy.md), and [tests](docs/05-quality/acceptance-tests.md).

`S` means a contact for whom the agent is the current primary agent or an active collaborator. `All` means every active KAY team member. Under D34 (Khalid, 2026-10-16), active agents may create/edit shared project facts, hierarchy, reusable types and physical properties/units. This grants no private-contact access or other manager-only inventory command. Administrators inherit all managers' business rights.

| Action | Administrator | Manager | Agent |
|---|---|---|---|
| Create/delete later accounts, change roles, reset another user's password | Yes; chooses initial password; reset also requires their own current password. First login requires own-password change. Delete revokes/hides access, retaining CRM attribution. Existing credentials remain unchanged. First administrator still uses the guarded server-local script. | No | No |
| Read/edit contacts, enquiries, requirements, notes, and deals | All | All | S |
| Assign the primary agent or collaborators; merge across portfolios | Yes | Yes | No |
| Merge duplicates within the same writable scope after confirmation | Yes | Yes | Yes, within S only |
| Read developments, blocks, floors, unit types, properties/units, their offerings, and shared inventory attachments | All | All | All |
| Create/edit development facts and shared briefing, hierarchy, unit types, properties/units | Yes | Yes | Yes; developer selection requires current contact scope |
| Change legal owners, inventory files, offerings, availability, external outcomes or archive/restore inventory | Yes | Yes | No |
| Read an owner/developer's private contact details/documents | All | All | Only if S for that contact |
| Create/edit a contact's visits, tasks, and deals | All | All | S |
| Reserve, close, and reopen a contact's deal | All | All | S, subject to stock invariants |
| Read/write commissions, recognition, and receipts | Yes | Yes | No |
| Read another person's appointment details | All | All | Only if S for the linked contact |
| Read colleagues' free/busy | Yes | Yes | Yes, without private details |
| Read agency visit working times and remaining company-car slot capacity | Yes | Yes | Yes, without private visit details |
| Change working days/hours, lunch breaks, or company-car hourly capacity | Yes | No | No |
| View KPIs and drill-downs | All | All | S and shared inventory, without other private contacts |
| Import CSV and export in bulk | Yes | Yes | No |
| Archive/restore contacts, developments, and properties | Yes | Yes | No |
| Read privileged security audit | Yes | Yes when operationally needed | No |

When an agent enters a phone already held by a private contact, only the current primary agent's name is shown. This is the narrow BR-04 disclosure exception. The agent cannot open, duplicate, or merge the contact, or see its deals. A shared development or unit record may show a non-private marketing name/reference, but its developer/owner link does not expose protected contact IDs, phones, documents, deals, or notes. Current permissions are rechecked on reads, search, writes, notifications, exports, downloads, and worker execution. Removing a collaboration or transferring a contact revokes access that has no remaining basis without changing the recorded authorship of past actions. Private contacts must not leak through counts, autocomplete, filenames, or copied URLs.

## Local SP-15 enforcement detail

Task ownership is a work assignment, never a permission grant. Current contact
scope controls task reads/history/writes; archived contacts are M/A-readable but
not writable. Optional deal context must belong to the contact. Owner selection
requires current active-account/contact eligibility. Transfer/revocation retains
the original owner/actor but removes stale private detail, counts and replay.

Internal inboxes are personal even for M/A. Current recipient, parent and
schedule scope is checked before totals/pages/links and read state. Delivery
rechecks current active-account/contact access after acquiring the agency lock.
The concrete recipient choice (task owner; visit organizer/current participants)
is a technical proposal for product review, not a new confirmed role rule.
[SP-15 contract](docs/04-design/tasks-reminders-local.md).
