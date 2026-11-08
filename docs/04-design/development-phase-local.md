# Selected programme phase: local integration

Date: 2026-10-28. Branch: `codex/redesign`. Frozen `pages.js` and
`inventory-detail.js` display/filter Préparation and Commercialisation, while
the inherited CRM had no persisted equivalent. This implements that selected
field through storage, current versioned commands, reads, forms and history.

## Meaning, scope and proposed legacy treatment

`phase` is descriptive shared programme metadata: `preparation` or `marketing`.
It is separate from an offering's draft/available/reserved/outcome state and does
not activate, reserve, release, publish, archive or complete stock. Existing
marketability/structure validation still applies to full programme edits.
D34's current shared-fact create/edit rights and active-user checks remain;
managed offerings, legal owners, files and archive rights do not change.

Technical integration proposal, pending product review: older records stay
unknown (`NULL`) until explicitly chosen. There is no automatic backfill or
inference from available units/offers. Current UI labels unknown as À renseigner;
immutable history says Non renseigné. New creation visibly defaults to
Préparation and includes it in review, with both choices and an unknown option.
This is not a new confirmed business gate or permission decision.

## Storage and immutable snapshots

Prepared migration `0037_development_phase` follows `0036_visit_notes`; neither
is applied by this checkpoint. It adds nullable `development.phase` and
`inventory_event.development_phase`, with bounded two-value checks. The event
field is only populated for development events. No historical values are copied
from the present into old events. Existing true-actor append-only history remains.

The existing central history writer captures the programme's phase at the actual
event/version. A deferred development guard requires a matching same-version
snapshot at commit, including explicit unknown. Current identity/aggregate locks,
expected versions and atomic receipt/event handling remain. Downgrade refuses
development targets or any retained non-null phase/snapshot; no downgrade ran.
The migration must be accepted/applied to an authorized isolated target before
real SQL/native execution. This is source preparation, not a schema deployment.

Legacy create/edit requests may omit phase. Omission preserves a stored phase
on edit and excludes the new field from the old canonical receipt payload.
Explicit null clears phase and is a distinct command; explicit known values
are captured. Developer-contact omission and existing hash handling remain.

## Strict read compatibility and filtering

The server facade alone opts into `X-Kay-Development-Phase:1`, on exact programme
GET list/detail/inventory/history paths. It is absent from writes, owners,
other domains and similarly prefixed paths. Incoming browser headers or copied
query capability flags cannot override it. This is projection negotiation,
not authorization or a browser-stored grant.

- Legacy reads retain their original strict shape.
- Negotiated summaries/details include nullable `phase` and
  `phase_supported:true`; list pages also attest support when empty.
- Negotiated programme history exposes the original `development_phase` snapshot.
- `phase=preparation|marketing` filters the actual development before both total
  and numbered page. It combines with existing archive/category/search/offer/
  exact-price criteria, without borrowing child offer prices or private owners.
- Copied phase filters on properties/offerings/unit inventory, invalid enum values,
  duplicates and query capability overrides are rejected.

New frontend schemas accept legacy absence and complete negotiated metadata,
rejecting half-attested fields and mixed page projections. An older backend
therefore leaves phase controls hidden rather than pretending persistence exists.

## Selected UI and recovery

Phase lives in the existing programme creation/edit identity section and review;
the overview keeps its compact four-fact layout, with category retained in the
header metadata when phase occupies its selected state position. Existing cards,
desktop list and filter rail/phone sheet show the real stored phase. Unsupported
legacy views keep the former category treatment and no empty phase column.
No new tab, drawer table, stylesheet, component kit, icon or dependency is added.

Creation reads support through the existing protected one-row programme list.
It waits for a successful metadata read before final submission. The capability
choice is frozen at the first valid submission, so refresh cannot silently add
or remove phase from an already reviewed retry body. Legacy mode omits the field.
Edit retains reviewed version/developer-link handling; current comparisons include
phase. An active directory phase remains visible and clearable if support is
temporarily unavailable. Other filter criteria and desktop/mobile view recovery
remain intact. History labels recorded values without suggesting old events can
be filled or inferred from the current programme.

## Verification boundary

499 connection-forbidden backend units pass, including23 added contract/payload/
actual command/history/summary/SQL compilation/stubbed ASGI/migration cases;
708 real-stack cases are deselected. Ruff check/format14 paths and backend mypy
on219 application sources pass. Four PostgreSQL cases are prepared, not run.

550 frontend units pass, including11 additional phase/schema/facade/TLS/form/
directory/card/history cases and expanded role/layout coverage. The final history
wording has a focused eight-case rerun and targeted ESLint; lint/types/build and
compiled history pass. Static Frontend Taste app lint checks nine changed UI
sources. One synthetic real-browser create/edit/filter/original-history/phone
journey is prepared/type-checked, not executed. Source checks do not prove actual
SQL/trigger behavior, current scopes/races, native layout/focus/touch/zoom or CI.
[Evidence](../03-planning/design-migration-evidence/development-phase-2026-10-28.json).

Frontend Taste app guidance and React event/derived-state review apply within
the selected identity. No new style draw replaces it. Original-machine mandatory
skills remain unavailable/not claimed; AFTER and owner acceptance remain pending.
No app/browser/CUA/CDP/HTTP workaround, real DB/service/private configuration or
records, executed migration, main/push/merge/deploy. Full per-domain coverage,
historical native selector reconciliation and final verification remain open.
