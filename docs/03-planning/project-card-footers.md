# Project card footer refinement

2026-10-23. Owner requests equal-size directory cards and a full-width bottom
« Ouvrir la fiche » action with obvious hover feedback. Local-only branch
`codex/project-card-footer`; no commit, PR, push, migration or deployment.
The original dirty checkout is preserved; implementation is in the existing
managed `crm-live-updates/Kayrealestate` checkout based on integrated main.

## Design and scope

Operate mode, existing Riviera world, ENERGY1/RHYTHM1/MOTION1. Read the supplied
image and current property/programme compositions. Design-system-ops governs
geometry, frontend-design/uncodixfy preserve the incumbent brand and shared
components, React guidance keeps this declarative with no effects or state.
Design-taste excludes this dense CRM directory. Existing Impeccable context and
its unselected metadata drift are retained; one layout detector returns `[]`.
Antislop remains AFTER; unrelated findings are not implementation authority.

The scanning path is photo/category, name/location, actual prices/statuses, then
one full-width footer link. Reuse shadcn Button with Next Link and the semantic
Iconsax forward action. The footer uses existing muted/honey/pressed/focus roles
and an inset outline so the card's clipping cannot hide keyboard focus. No lift,
scaling animation, new palette, new package or duplicate navigation handler.

Equal grid tracks extend across rows, and cards use a flexible body plus bottom
action. Names/locations are two-line summaries with full DOM/title/detail text;
prices/statuses stay complete. A two-line `lh` minimum scales with text, rather
than prescribing a fixed pixel card height. This explicit owner request overrides
the general content-sized-card fallback only for inventory directory cards.
The same footer is used for programmes, whose category badge stays compact.
List view, routes, filters, offers, permissions and private thumbnails are unchanged.

## Verification

Frontend lint/typecheck/build and92 unit tests pass on the private Node24.22.1
runtime. The initial new test fixture was rejected for an invalid synthetic actor
prefix, then a priced fixture was rejected for missing explicit currency/period;
the test data now follows the unchanged supervisor/facade contracts. No guard or
assertion was relaxed. Focus uses actual Tab navigation, not a mouse-modality
programmatic focus assumption.

The first visual batch confirms equal property/programme dimensions, full-width
bottom actions, long URL/title handling and hover feedback. It catches the
programme badge stretching after grid-to-flex conversion; `self-start` preserves
its earlier compact anatomy. Focused Chrome checks then pass2/2; the existing
eight-photo/filter/native200% reference scenario passes1/1. Final compiled
confirmation after the badge correction is recorded in the QA register.

Captures under ignored `frontend/output/playwright/project-card-layout/` contain
only synthetic data. Test widths320/360/768/1024/1440/1920, keyboard Enter/focus,
touch navigation, price visibility, shared contrast/44px/overflow assertions and
cross-row equality are covered. Product/design acceptance remains Khalid's.
