# SP-12 documenter record

Decision: **No changes needed** to the existing design-system or component
documentation. This record is the only file written by this pass.

Date: 2026-10-15. Scope: the completed reservation/release extension to the
existing French KAY deal detail. Khalid confirmed, “Yes, extend the existing
deal detail.” No new visual world or system change was approved. Product/design
review remains pending Khalid.

## System comparison

| Area | Shipped source compared with the incumbent system | Decision |
|---|---|---|
| Palette | Root layout consumes the existing token mapping: ivory canvas, white content/overlay, charcoal primary actions, deep-gold focus and semantic warning/danger/success text. Reservation code uses semantic utilities, with no feature palette. | Reuse; preserve DESIGN.md and the existing token authority. |
| Typography | System sans remains the local font. The existing page 32/40 and section 20/28 px tokens, 16px body and 14px button/label styles supply the slice; the shared Label retains its own leading-none treatment. The reservation introduces no type role or font. | Reuse; proposed Satoshi and final brand approval remain unresolved. |
| Layout and geometry | DealRecord retains its 42rem reading container and parent-owned 32px section gaps. Reservation uses flat sections with 16px content gaps and 24px block padding. Shared AlertDialog supplies the 32rem maximum width, 16px viewport clearance, bounded vertical scrolling, 24/16px desktop/mobile padding and wrapping action group. | Reuse; no new layout token or custom stylesheet. |
| Shape and depth | Buttons/fields use the existing medium radius; the shared dialog uses the existing large radius and overlay shadow. The record remains flat. Existing focus, control-height and reduced-motion behavior belong to the shared controls/global styles. | Reuse; no new radius, elevation or motion rule. |
| Composition and state | ReservationPanel follows exact target facts before Pipeline. It composes AlertDialog, Button, Label and Textarea; scope/kind/state/versions precede confirmation, release alone requires a reason, busy state disables competing local controls, failures retain input/retry identity, and success reloads deal/stock. InventoryStatus provides textual safe overlap guidance. | Already documented by the SP-12 paragraph in docs/04-design/ui-components.md; no duplicate recipe needed. |

## Evidence and narrow documentation decision

Read the fresh documenter role and reference/document.md completely. Compared
DESIGN.md, docs/04-design/design-system.md, branding/kay-ui-tokens.json,
docs/04-design/ui-components.md and the registered SP-12 direction/review/finish
records against these representative source files:

- frontend/src/app/globals.css, app/layout.tsx and lib/theme.ts;
- frontend/src/features/deals/reservation-panel.tsx and deal-record.tsx;
- frontend/src/components/ui/alert-dialog.tsx, button.tsx, label.tsx and textarea.tsx;
- frontend/src/features/inventory/states.tsx and features/requirements/offering-card.tsx.

Also read the local reservation contract and AFTER012 audit. Independently
viewed the final saved native sp12-reserve-desktop.png and
sp12-reserve-mobile.png; their white bounded confirmation, French text hierarchy,
scope/version ordering and wrapped mobile actions agree with the source and
incumbent system. The independent finish reviewer inspected all 12 required
captures and returned **ship**, with no material fixes in its reviewed UI scope.
Its historical pending-final-rerun caveat is not silently rewritten here.

The implementing agent supplied final build vdAiKy5eJbtZ70GZWIiJ0, the final
affected five-target 15/15 pass in 5.6m and final headed Chrome 1/1 pass in 44.7s
with 12 captures. Earlier 35/35 deal/reservation and 8/8 broader Chrome results
remain prior evidence. This documenter pass did not launch services, run tests,
rerun the detector, read secrets/private runtime configuration, or independently
revalidate backend behavior. These are scoped local results, not human product
approval or full CRM/production acceptance.

The mandatory skill comparison preserves design-system-ops' system-first reuse;
design-taste-frontend excludes this dense operational detail/form surface from
its marketing workflow. Antislop remains in the selected AFTER mode: audit012
has no new aesthetic findings, and earlier optional findings stay unselected.

No new durable token, primitive or repeated visual pattern requires a system
addition. PRODUCT.md and .impeccable/design.json are pre-existing absences.
Planning-era wording and the incumbent DESIGN.md format are pre-existing
documentation drift, not a newly approved identity or metadata migration;
they are neither repaired nor promoted into new rules by this extension.

## Five-line system summary

Palette: existing ivory/white surfaces, charcoal actions, restrained gold focus/selection and textual semantic statuses.
Type: approved local system sans; existing 32/40 page and 20/28 section tokens, 16px body and 14px control labels.
Layout: readable flat detail sections, parent-owned spacing, bounded scrollable confirmation and wrapping narrow actions.
Shape/depth: existing medium control and large overlay radii; elevation identifies the modal layer only in this slice.
Rules: exact physical scope before action, one primary action per region, persistent no-expiry truth; ENERGY1/RHYTHM1/MOTION1.

Not canonized or repaired: pre-existing metadata/format/planning-wording drift
and unselected optional aesthetic findings; this ordinary extension supplies no
authority for their repair and no new system defect was found in the sampled UI.
