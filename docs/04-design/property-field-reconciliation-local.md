# Selected property detail field reconciliation

Date: 2026-10-29. Branch: `codex/redesign`. Source/contract checks only; actual
database/native/product acceptance remains pending.

## Fields and selected homes

The selected five-step property/unit wizard retains identity/offer, location,
characteristics, equipment and review. Existing shadcn/Tailwind controls, short
clickable steps, above-field labels, compact review facts and desktop/phone
composition remain. No stylesheet, token, glyph, motion, library or chart changes.

Read-only AST/source comparison accounts for all24 listing-detail keys in the
backend ListingDetails model, frontend strict schema, actual payload and French
formatter. All selected detail labels map; amenities use their separate selected
label map, not listingLabels. The frontend and selected29 amenity keys match.
This is field-name coverage, not proof of every conditional/native workflow.

| Detail group | Exact fields / current home |
| --- | --- |
| Localisation | region, city, district, neighborhood, address, google_maps_url; location remains the separate short root location |
| Characteristics | bedrooms, bathrooms, capacity, minimum_nights, condition, age_band, floor_type, unit_floor, building_floors, orientation, plot_area_sqm, land_delivery, land_status |
| Equipment dimensions | garden_area_sqm, terrace_area_sqm, garage_spaces, with existing explicit amenity dependencies |
| Equipment / description |29-key amenities and description; current choices, category restrictions and limits retained |
| Root identity and dimensions | reference, category, marketing_name, location, area_sqm, rooms; existing exact decimals/null/zero values and strict versions |
| Unit context | development_id, floor_id, unit_type_id and current hierarchy DTO; block choice narrows floor context rather than introducing a new root block field |
| Offer context | Creation-only priced draft and explicit kind/period/MAD; editing keeps all offers/prices/states separate |

The selected prototype's root occupied fixture flag is not invented as a property
fact. Actual current occupation/conflict is already passed from each server
offering to InventoryStatus in cards and offer sections. No missing/unknown stock
value is labelled Libre by this change. [Directory](inventory-directory-local.md)
and [command owner](property-listing-recovery-local.md) retain their boundaries.

## Proven hidden-field loss and scoped correction

The existing backend permits a saved orientation on a room. The selected form
intentionally has no orientation control for that category. An unrelated title
edit previously built orientation:null and replaced the persisted detail object,
silently losing that valid fact. A new actual component/command test first fails
with null !== north, reproducing this source path in a synthetic harness.

For an existing room that remains a room, payload and review now retain the
accepted record's orientation. Explicit current-version acceptance uses the
fresh accepted orientation rather than the older hidden draft value. The same
existing summary displays the retained French direction. No new editable field
or backend policy is introduced. Null stays null. New rooms cannot inherit a
hidden direction from a different draft category; a deliberate category change
to a nonresidential type still clears its inapplicable direction. Visible
orientation controls keep their existing change/clear behavior. Zero bathrooms
and ground-floor0 remain real values.

Original body/key/current identity, recovery, strict receipt/current result,
category/offer locks and dirty draft behavior remain. No backend production,
schema, migration, permission or API shape changes. This does not infer that all
legacy inapplicable fields should be retained or silently broaden category rules.

## Verification and remaining work

932 frontend units pass, five added for unrelated room edit/review, fresh conflict
acceptance, null/new-room isolation, visible change/clear and explicit category
change.573 connection-forbidden backend units pass, one added to prove this room
orientation/zero-fact edit remains legal under the real strict contract. Full
frontend lint, typecheck, build and compiled history pass. The additional native
file passes focused lint/types. Static Frontend Taste app lint checks the single
changed UI source with0 findings. Its truth/field grouping guidance applies to
the retained selected composition; no new concept/assets or browser inspection.
Original-machine antislop/design-system-ops remain unavailable; AFTER timing stays.

Two cases in frontend/tests/e2e/property-room-orientation.spec.ts prepare390/1440
isolated manager creation/edit/review/PATCH/readback, no extra orientation control,
zero facts and no horizontal overflow. They are typechecked, **not run**. Traces,
videos and screenshots are off; fixtures are synthetic and cleanup detached.

Actual SQL/legacy/concurrency/rights/stock/file/native/device/focus/zoom/contrast/
security/CI/AFTER/product acceptance remains pending, as do migrations0036/0037.
Exact block-only selection versus persisted floor/review semantics still needs
follow-through; no new physical block field is assumed here. Other P0 fields,
contexts and old selectors remain open. No actual app/browser/HTTP/DB/account/
private configuration/service/worker/scanner/simulator/transfer access or
workaround, migration, main/push/merge/deployment. Main and254 frozen inputs stay
preserved; the full goal remains active.
[Evidence](../03-planning/design-migration-evidence/property-fields-2026-10-29.json).
