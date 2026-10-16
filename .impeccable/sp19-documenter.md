# SP-19 ordinary-extension documentation handoff

Date: 2026-10-15. Outcome: incumbent system preserved. The confirmed instruction
is “Yes, follow the sprint within the existing KAY interface.” This is a narrow
Operate extension at ENERGY 1 / RHYTHM 1 / MOTION 1, not an approved world or
design-system replacement.

## Source and authority checked

Read the shipped `impeccable_documenter.toml` role and `reference/document.md`
in full, then compared the implemented source with `DESIGN.md`,
`docs/04-design/design-system.md`, `branding/kay-ui-tokens.json`,
`docs/04-design/ui-components.md`, `.impeccable/sp19-direction.md` and the
registered surface brief
`.impeccable/surfaces/frontend-src-features-discovery-search-trigger-tsx.md`.
The functional boundary was checked against
`docs/04-design/discovery-contract.md`.

The source scan covered `frontend/src/app/globals.css`,
`frontend/src/lib/theme.ts`, all nine files in
`frontend/src/features/discovery/`, and the shared Button, Input and Sheet
sources. Integrations checked: `features/shell/app-shell.tsx`;
`features/contacts/lead-list.tsx` and `contact-directory.tsx`;
`features/inventory/property-record.tsx`, `development-record.tsx`,
`unit-directory.tsx`, `property-directory.tsx`, `development-directory.tsx`
and `facade.ts`; workspace Leads, Dashboard/section and programme-detail routes;
the API catch-all relay; and `lib/api/errors.ts`. Inventory contract fields
and route/query integration were sampled through the targeted source search.

## Implemented system comparison

Palette: semantic ivory canvas, white content, charcoal actions/navigation,
restrained deep-gold links/selection and existing textual status colors.
Typography: incumbent system sans, page role 32/40 px, section role 20/28 px,
16 px body/input and 14 px labels/supporting operational text as composed.
Layout: existing page gutters, 42rem reading width, 4/8px spacing rhythm,
44px button/link targets, 48px fields and content-driven responsive grids.
Depth and shape: inherited Sheet overlay, control radii, flat divided rows
and inline confirmations; no new shadow, radius or material vocabulary.
Named guardrails: current authority before private content, textual state
beside color, explicit whole-filter confirmation, recoverable lifecycle and
numbered pages remain contract/composition rules, not a new visual identity.

Search reuses the existing focus-protected Sheet, labels, native kind select,
explicit submit and numbered results. Export request, own-job status and
protected-transfer recovery use flat sections and wrapping controls. Inventory
lifecycle retains a required reason, accurate archive/restore actions and
read-only archived feedback. The audit view remains contextual to Dashboard;
Settings retains its separate administrator boundary. These source observations
do not independently certify backend security behavior.

## Documentation decision and evidence boundary

Wrote this record and one narrowly scoped existing `ui-components.md` note for
the newly reusable `SheetContent.closeLabel` accessibility API: task Sheets can
name their actual close action in French, while navigation keeps its incumbent
default. No new palette, type ramp, font, geometry token, kit, framework,
dependency, chart or shipping raster was found in the SP-19 composition.
Bklit and shipping-raster provenance are therefore not applicable to this slice.
Synthetic browser captures are test evidence, not product imagery.

`DESIGN.md` and `.impeccable/design.json` were left untouched. The existing
approved V3 target and pending application/design review remain authoritative;
this handoff does not convert earlier local composition into V3 acceptance.
`PRODUCT.md` and `.impeccable/design.json` are absent inherited persistence
drift. Existing descriptive design documents also retain historical proposal/
future-tense passages despite the running implementation; these were reported,
not silently refreshed or replaced. The ordinary-extension role explicitly
requires preserving the incumbent system and reporting pre-existing drift.

Read `.impeccable/sp19-review-packet.md`,
`.impeccable/sp19-finish-review.md` and the then-current
`docs/03-planning/sprints/sp-19-execution.md`. The fresh independent finish
review records `ship`, no material fixes and independent validation of all 18
required captures, including the 16 named originals and two canonical copies.
This documenter did not reopen or revalidate those images, rerun the detector,
run browsers/tests, access a database or start services. The packet records
the detector's empty result and the scoped technical checks; the parent
handoff supplies the final compiled result (2/2 passed, 44.7s) and final visible
Chrome result (1/1 passed, 29.0s; 39.6s total). These are reported provenance,
not new independent test results from this pass.

Khalid's product/design review remains pending. AFTER aesthetic fixes still
require his numbered selection. No defect, absent metadata, local test result
or historical prose was canonized as a new design-system rule.
