# Selected PDF preparation workspace

The subsequent [stationery renderer](pdf-stationery-local.md) ports the selected
preparation sheet. [Approved M01 implementation](pdf-appendix-reconciliation.md#source-implementation-and-verification)
now also uses the selected styled blank appendices with checked provenance and
old-version replay. The UI-only checkpoint below changed no PDF bytes. Final
native/full-stack acceptance remains open.

Date:2026-10-27. Source implementation on `codex/redesign`; native and real-stack
acceptance remain pending. This extends the [document contract](generated-documents.md)
and [selected migration](../03-planning/design-prototype-migration-2026-10-25.md).

## Selected composition

Lead and Deal document routes share exactly two shadcn tabs: Préparer un PDF and
Historique. The actual role-scoped catalogue supplies model names, warnings,
fields, defaults and count. The desktop model rail, selected mark, grouped form,
fixed action footer and separate history scroll owner follow frozen
`documents-help.css`. The later `mobile-app.css` overrides supply the compact
select, single-column16px field spacing,16px body/history padding and full-width
44px footer action with safe-area clearance. There is one form/controller,
not separate desktop/mobile drafts. No new palette, font, dependency or chart.

History uses Document/Créé le/Auteur/Fichier on desktop and shared DataTable
cards on phones or inside a Sheet. The dossier's existing prepared-PDF collection
keeps compact cards. Both use the same real creator metadata and private transfer
controller. Numbered20-row pages remain; an empty later page keeps an escape.
The return action opens the actual parent Documents tab. Parent-kind/ID keys
separate request/draft lifetimes between records. Per-model scroll positions and
heading focus are local UI state, with no submitted values in browser storage.

## Commands, drafts and recovery

Only declared fields enter the existing POST. Missing values remain blank;
editable prefill does not invent identity or legal facts. Validation counts
Unicode code points:300 for a single line,1000 for multiline, no forbidden
control characters, at most30 fields and32KiB UTF-8 JSON. Native input bounds
allow surrogate pairs; exact limits are checked before submission and by the
authoritative server. Single-line fields do not accept newlines.

Each model retains its own values and accepted baseline. Choosing a model or
reading prefill is clean. Generating one model accepts only its submitted values,
so another model's edit remains dirty. The managed form stays mounted while
history is visible or context reloads; dirty/busy markers participate in the
existing navigation/unload boundary. Successful creation opens history.

A synchronous global lock prevents duplicate submission or model/tab/field
changes while sending. Each exact body has a retained UUID key. An unknown
result pins that model's exact body/key and disables its fields. Switching models
does not replace the uncertain attempt. Retry retrieves the same result;
catalogue shape changes cannot silently resubmit an old uncertain body. An
explicit AlertDialog can abandon recovery while retaining entered values, making
clear that the prior PDF may exist and another generation can create a new one.
That confirmation itself performs no write. Definite validation failure permits
correction; same-body retry retains its key.

Current401/403/404 from context, history or command immediately hides prior
private values. Scoped asynchronous reconciliation clears retained drafts and
attempts, cancels superseded cleanup and prunes models removed by a role change.
Both projections refresh on command denial. Archived parents keep readable
history without generation. Departure aborts the outstanding client command and
suppresses late completion; it does not claim rollback of server work.

## Creator projection and private downloads

History opts into `include_actor=true`; see the [wire contract](generated-documents.md#history-creator-projection-2026-10-27).
The creator is the document's retained `created_by_user_id`, not the current user.
The opt-in adds only ID/display name after current authorization, template
filtering and paging, with one same-agency lookup for those visible creators.
Disabled/deleted identities remain attributable. Missing creator identity fails
closed; it is never fabricated. Legacy history and POST receipts stay unchanged.
Deploy this backend capability before the new strict frontend projection. No
migration, broader staff directory or new permission grant is introduced.

Downloads require a currently displayed exact document/version/version ID,
fresh session-bound one-use permit and existing private transfer. Unmount or a
current denied read aborts transfer and suppresses a late browser download.
Names, values and proofs are not persisted, logged, exported or put in URLs.

## Evidence and remaining boundaries

The [slice evidence](../03-planning/design-migration-evidence/document-workspace-2026-10-27.json)
records423 frontend units,384 connection-forbidden backend units, lint/type/build,
Ruff/mypy and frozen/compiled-source checks. Backend units include an entirely
stubbed in-process ASGI route/query test and SQL compilation; they establish no
real database/session/role behavior. Two1440/390 journeys in
`frontend/tests/e2e/generated-documents.spec.ts` are prepared and type-checked,
not executed. Existing automatic app-access rejection remains binding.

All254 frozen inputs and12 original bundled models remain unchanged. Read-only
comparison found all12 field catalogues equivalent, but selected restyled blank
appendices have different text tokens/page breaks. That is not proof of legal
equivalence or approval. Preparation-sheet PDF styling and original/styled
appendix provenance remain M01 work; this slice changes no generated PDF bytes.

System-first composition reuses the selected tokens and shadcn primitives.
Original-machine antislop/design-system-ops files remain unavailable here; no
execution is claimed. Dense CRM forms/history are outside the marketing
design-taste workflow. AFTER timing remains. Native desktop/phone, keyboard,
touch, zoom, accessibility, real scope/download/SQL/races, full-stack/CI and owner
review remain pending, alongside the rest of P0–P8. Main/merge/deployment are
untouched; this is not completion of the redesign branch.

Read-only M01 follow-up,2026-10-28: the [concrete appendix comparison and
proposal](pdf-appendix-reconciliation.md) checks all12 selected/original pairs
and641 literal chunks. The owner subsequently chose the selected styled appendix
on2026-10-28. That approved implementation and its gates are next; the renderer
is still unchanged at this inbox checkpoint, without legal/native acceptance.
