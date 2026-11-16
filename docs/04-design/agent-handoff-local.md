# Agent collaboration and handoff

[Decision D51](../../decisions.md) covers prospects and deals.

The **Collaborateurs** action is in both dossier headers. The primary agent,
manager or administrator can change the existing contact-level grants using
the same impact preview and command receipt. The drawer identifies that scope
before confirmation. Only a manager or administrator may transfer ownership.
A collaborator can exercise the ordinary granted access on related dossiers.

An authenticated agent may search for the complete phone number of a contact
in another portfolio. The global search separates these read-only results from
normal hits and totals. Partial phones, name searches, and ordinary lookups
retain the existing scoped behavior. Results show up to 25 active prospects
and 25 active deals for the matched contact, with the most recent first within
each kind. The request also respects the selected prospect or deal filter.
Moroccan national numbers and international numbers with `+` or `00`
are normalized before exact matching.

The handoff route uses a four-hour HMAC proof tied to the current staff
session, the matched active phone row and number, the current primary agent,
and the selected dossier. The browser fragment keeps the proof out of the
navigation request and the view or add-note command sends it in a CSRF-protected
POST body. The backend rechecks session, phone, ownership, portfolio status
and dossier lifecycle. The view shows the dossier context and recent manual
exchanges. Standard contact edits, dossier edits, documents, financial records,
exports and unrestricted contact history require ordinary authorization.

The **Notes d’autres agents** section comes at the bottom of the overview,
with a distinct informational surface and the author's name and timestamp.
The notes are append-only and carry a dossier foreign key, true-actor
snapshot, idempotency key and acknowledgement information. The existing
agency transaction lock serializes note creation, acknowledgement, assignment
and reminder delivery. A retry after an interrupted response with the same key
returns the original note.

The PostgreSQL worker publishes an unread internal notification during a
configured work window. After four elapsed hours, the next work window
outside a configured break permits another reminder. A closed day or absent
working-hours policy delays delivery. The latest notification per note and
recipient contributes to the unread count. Prior reminder rows retain their
delivery history. The recipient is the current primary agent while the
dossier is active and accessible. Reassignment removes the former primary's
inbox access. Marking the note seen from the dossier or marking its notification
read acknowledges the note and ends future reminders.

Migration `0052_agent_handoff_notes` adds the note and notification
relationship without rewriting legacy notifications. Contact merges preserve
notes through the original prospect or deal, whose normal parent link is
reconciled by the existing merge service. An archived record is excluded from
handoff lookup and reminders. See [security evidence](../SECURITY_CHECK.md#agent-handoff-and-collaboration).
