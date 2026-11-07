# Selected property/unit listing workflow

Date:2026-10-28. Branch:`codex/redesign`.
Status: source integration; real SQL/native/product review pending.
[Coverage map](../03-planning/design-migration-coverage-2026-10-28.md).

## Selected workflow and concrete gaps

The frozen `src/property-listing.js` uses one five-step flow for standalone
properties and programme units: Bien, Lieu, Détails, Options, Résumé. The real
unit creator retained a separate three-step form, omitting rich location,
characteristics, equipment and description. Unit editing also exposed unsupported
categories, and the shared review omitted most submitted detail values.

Creation/editing now use the same PropertyListingWizard, selected stepper,
shadcn controls, current spacing, labels-above-fields and responsive form layout.
The old duplicated unit form is removed. Parent programme identity comes from
the already-read programme, not a new private lookup or an unexplained UUID.
Cancel from the Units drawer calls its existing unsaved-guarded close callback;
routed forms retain contextual internal return links. Exact commands, dirty/
pending/retry handling and property detail destinations remain unchanged.

## Field/control and real payload map

| Selected field cluster | Real payload/home | Behavior |
| --- | --- | --- |
| Référence, titre/name, type | reference, marketing_name, category | Same shared identity controls. Unit categories are villa/house/apartment/land/commercial; standalone retains all9 existing categories. New titles retain the selected50-character input, editing160. |
| Market, price, period | initial_offering.kind/price_mad/price_period/currency | Exact decimal MAD, sale/rent for units; existing applicable holiday options only for standalone. Unit creation still requires the initial priced draft. Existing edits never overwrite offers/prices. |
| Programme, bloc, étage, reusable type | development_id, floor_id, unit_type_id | Block is derived through the actual floor's block. No new property.block_id. A chosen block without a floor must be completed or removed, preventing silent lost placement. |
| Region/city/district/neighborhood/address/Maps | listing_details.region/city/district/neighborhood/address/google_maps_url | Every known value appears in final review, including the real URL as safe text. Same HTTPS Maps allowlist and lengths. location remains the existing short location, with current new-record city fallback. |
| Area/rooms | area_sqm, rooms | Independent physical facts; decimal strings and null unknowns preserved. A template never fills or later propagates area/rooms into a unit. |
| Bedrooms/bathrooms/capacity/minimum nights | listing_details corresponding fields | Existing category/market applicability and numerical bounds. Zero bedrooms/bathrooms remain explicit values, not missing placeholders. |
| Condition/age/floor type/physical floor/building floors/orientation/plot/land facts | listing_details corresponding fields | Same typed choices and category applicability; physical unit_floor0 remains distinct from the programme floor label. |
| Amenities, garden/terrace/garage quantities, description | listing_details.amenities/garden_area_sqm/terrace_area_sqm/garage_spaces/description | Same29 IDs, applicable choices, quantity dependencies and5000-character description. All names/quantities and multiline description appear in review; long facts span the available row. Corrected the label Entre-sol without changing its entresol ID. |

The final review uses the same listing-field formatter as detail views, preserves
numeric zero, and excludes genuinely empty values rather than creating dead
fact rows. It shows submitted applicable values and real equipment names rather
than a count-only summary or 'Lien renseigné'. React text escaping remains;
reviewing a URL never triggers an external request.

## Preserved business rules and draft reconciliation

[BR-26](../02-requirements/business-rules.md) and the existing hierarchy service
require apartment units to have a floor in a block and a same-programme reusable
type. Other unit categories may attach directly to the programme. These rules
remain authoritative after aggregate locks. The shared command schema and form
now reject known invalid unit categories/absent apartment placement earlier.
Foreign floors/types and category mismatch still fail on the backend. Existing
offers still lock category/reparenting; the form displays that existing lock and
keeps other permitted fact edits available. No stock/availability/readiness rule
or owner right is relaxed.

Technical integration proposal, pending product review: preserve the existing
incomplete-unit draft capability while adding known rich facts atomically.
Previously callers could create a sparse unit only by omitting listing_details;
any provided details accidentally invoked the standalone complete-listing rule.
CreateProperty now applies those complete-listing requirements only to standalone
rich listings. Units can retain null unknown facts and persist known details in
the same atomic create/initial-offer transaction. Every supplied value still
passes existing type, category, Maps, quantity and amenity checks. Initial holiday
unit offers remain forbidden. Standalone rich-listing required fields and the
legacy bare-draft API shapes remain unchanged; no new business lifecycle is
introduced. This is not automatic publication or marketability.

The programme/type picker retains its complete server total and numbered pages.
It disables visibly incompatible categories instead of filtering one fetched
page and pretending it is the whole result. It forwards the exact selected id
and shared label for review, retains selections on other pages, rejects forged
new choices and disables changing metadata on failure. Category changes clear an
incompatible reusable type while retaining the chosen physical floor. Backend
current-parent/category/stock checks still decide whether the write is allowed.

No legal-owner links, private contacts, files/photos/documents, scans, current
campaigns, prices, reservation/outcome history or prepared PDFs are replaced by
these forms. No template defaults are copied or fake occupancy facts introduced.
The prototype's illustrative property.occupied/Libre fallback remains reconciled
to the actual stock-derived occupied flags already shown per offer; this slice
does not invent a physical vacancy field or claim that missing evidence means
vacancy.

## Verification boundary

Connection-forbidden cases cover the rich-unit/standalone distinction, known
zero values, real hierarchy/stock guards and exact property_values serialization.
Frontend cases exercise the actual shared wizard, full review, five-step draft
retention/save, no-silent-loss placement, restricted/locked categories, exact
initial price, complete type pages/incompatible choices, cancel callback, summary
zero/multiline handling and runtime-validated programme fixtures.

Four isolated PostgreSQL cases are prepared for Agent/M/A atomic partial unit
create/replay, nonpropagating template defaults, foreign-template rollback and
standalone complete-field retention. Two desktop/phone browser journeys are
prepared for clean drawer cancel, five-step creation, full review and persisted
known/unknown facts. They have not run. Static skill lint is not native rendering.

No migration, app/browser/CUA/CDP/HTTP workaround, actual DB/service/account/private
configuration/real record/import/export/worker/transfer, main/push/merge/deploy or
final product review occurred. Existing migrations0036/0037 remain unapplied.
Real SQL/native/device/focus/zoom/visual/performance/CI/AFTER/owner gates remain
open. This does not complete the entire redesign or P0 coverage audit.

[Checkpoint commands and source hashes](../03-planning/design-migration-evidence/unit-listing-workflow-2026-10-28.json)
retain source results independently of prepared actual SQL/native acceptance.


## Subsequent original-command recovery,2026-10-29

[Property listing recovery](property-listing-recovery-local.md) now covers the
shared wizard's independent/unit create/edit flows, original request ownership,
explicit current comparison and verified result navigation. The field/control map
above remains. Its contract separately records the explicit locked-category/
placement reconciliation proposal and source/native acceptance boundaries.
