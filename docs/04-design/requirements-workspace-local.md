# Selected contact search workspace

Date: 2026-10-27. Implementation on `codex/redesign`; native/product acceptance
remains pending. This is part of the full selected-design migration, not a new
product scope or permission decision.

## Composition and retained capabilities

The frozen `src/parity-ui.js` requirements collection is the visual/interaction
reference: tonal cards, original budget/period, known criteria and importance,
direct edit/select actions, inline selections below a separator, and one focused
form replacing the collection. Existing `RecordEntry`, its related variant,
`RecordSection`, shadcn primitives and shared drawer/form/footer styles supply
the presentation. No additional palette, layout cap, dependency or chart kit.

Contact overview keeps its Recherches drawer below the linked dossiers heading.
Lead and Deal qualification use the same workspace. No new main tab is added.
The current Contact read resolves a merged alias before collection queries;
canonical identity keys the private workspace. Existing caller write policy and
current contact archive state both apply. A current scoped denial unmounts the
workspace before a retry creates a fresh lifetime; earlier drafts do not return.

Requirements use numbered 20-row pages. Their summary includes known criteria;
unknown criteria are omitted from the compact card, but remain explicit in the
editor and comparison. A populated selection reads the existing bounded detail
endpoint (at most 100 entries) beneath its own card. This is at most twenty
bounded detail reads for a full populated collection page; no new bulk endpoint
or unbounded scan. Native latency/rendering acceptance remains open.

Inline entries retain exact offer identity, feedback, sale/rental label and a
disclosure of original price/period, conditions, status, target/hierarchy and
exact-target link. Existing create-Deal links remain available for a requirement
or exact selected offer. These links do not create a Deal automatically. The
existing contact timeline appears after the collection as contact-wide dossier
history, honestly labelled as such; it is not represented as exclusive criteria
history. Original actor, body, reason and Casablanca instant remain visible.

Opening an editor retains collection/history pages and return context. Cancel
uses the shared draft guard. Saving returns only after a current same-contact
detail is readable at least at the acknowledged version. Focus returns to the
originating action and drawer scroll; a delayed shortlist read does not steal
focus after the user has moved elsewhere. Empty first-page pagination is omitted;
an empty later page retains a numbered escape.

## Fields and manual offer selection

The requirement editor retains title, intent, original MAD minimum/maximum and
monthly/yearly rental period, plus all six value/importance pairs. Unknown stays
null; false stays false. Blank values never become zero. Positive decimal strings
and exact annual comparison remain governed by the existing contract. Decimal
commas normalize only for submission/filtering, preserving an invalid draft.
Intent is disabled while a selection is populated; server Deal-link checks still
apply independently. The complete form uses paired fields in a wide drawer and
one column under the shared 520px container rule.

A new selection has a compact searchable exact-offer picker, status/target-level
controls and optional category/price/area/rooms/programme/block/floor/type filters.
The existing inventory query is reused with `archive=active`, explicit requirement
intent and numbered 20-row pages. Default status is available; all other existing
statuses remain browsable. Requirement preference values are not automatically
applied as matching rules. Type metadata filters real units; it never becomes a
selectable offering. Searching a picker does not make the business form dirty;
choosing an exact offer, editing feedback or changing the retained-entry action
does. Off-page selected identity stays visible while current denied/invalid
picker pages mask their earlier options.

Editing a retained entry fixes its original offer UUID. Its feedback can be
updated or its link removed even when the target is historical/archived, subject
to current backend authorization. Removal requires a separate confirmation and
only the existing versioned DELETE; it changes neither offering nor reservation.
The ordinary new-choice picker stays on active inventory as before. Neither
selection nor feedback changes stock, reserves an offer or creates a proposal.

## Commands, comparison and authority

No endpoint, backend write rule, grant, schema or migration changes. The existing
SP-10 [wire contract](api-contracts.md#sp-10-requirements-and-manual-shortlist-wire-contract)
remains authoritative. Full Contact detail and contact timeline are existing
scoped reads. All current strict facade validation and session/CSRF/TLS mediation
remain in place.

The managed command controller synchronously locks submissions and pins method,
path, body and idempotency key after an unknown acknowledgement. Its only write
retry repeats that operation exactly. Once a result is acknowledged, a failed
completion read retries only the read, including a later read-only context.
Changed bodies cannot replace an uncertain attempt. Wrong result identity remains
uncertain rather than completing another search. Abort/unmount prevents late
command or comparison delivery; cancelled UI does not claim a committed write
was rolled back.

A definite conflict exposes explicit comparison. Current canonical contact and
requirement identity are re-read; archived/reparented contexts cannot supply a
new write baseline. Keep adopts reviewed versions while retaining entered fields;
reload remains guarded. A new offering comparison re-reads exactly its original
selected inventory page. Missing/moved choices require re-selection, without
inventing GET-by-ID or searching every page. Retained-entry comparison uses its
current detail entry. A removed original, changed intent or already-added new
choice cannot silently become another command. No automatic retry/rebase after
comparison and no interpretation of UI metadata as authorization.

## Evidence and remaining gates

489 frontend units pass, including 18 new controller/model/render tests. Lint,
types and pinned Next 16.4.2 build pass. The emitted closed history bootstrap
executes standalone; six emitted shared-layout declarations are checked for
cards/related entries/form/pairs/narrow fields/footer. These checks prove source
and compiled declarations, not native layout/focus or product acceptance.
All 254 frozen inputs remain unchanged. Prepared SP-10 e2e/native cases and the
linked-Deal requirement edit use the new workflow; they have not been executed.

The prior automatic app-access rejection remains binding: no browser, CUA, CDP,
Playwright, app HTTP or alternative-origin workaround was run. No backend tests,
database/service, private configuration, real records, main, push/merge/deploy.
Native desktop/mobile/zoom/touch/focus, current authority/races, isolated real-stack
acceptance, real CI, AFTER and owner review remain open. Original-machine
mandatory antislop/design-system-ops remain unavailable/not claimed; dense CRM
forms/history exclude marketing design-taste. AFTER timing is unchanged.

Full P0/P2/P3–P8 reconciliation and the overall redesign goal remain active.
[Execution](../03-planning/design-prototype-migration-execution.md) and
[evidence](../03-planning/design-migration-evidence/requirements-workspace-2026-10-27.json).
