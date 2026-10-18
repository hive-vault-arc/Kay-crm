---
version: 1
slug: "frontend-src-features-contacts-lead-create-tsx"
primary_target: "frontend/src/features/contacts/lead-create.tsx"
related_targets: ["frontend/src/features/contacts","frontend/src/features/deals","frontend/src/app/(workspace)/leads","frontend/src/app/(workspace)/deals"]
---

Mode: Operate. Scope: KAY lead/deal create, edit, list, detail and conversion.
Audience: the agency's agents and managers working repeatedly on client records.
The owner's explicit IMMO World reference fixes the workflow and composition;
KAY's existing colours, components and permission model remain authoritative.

## Direction contract

THESIS: Qualify the client and project, then convert the lead. Remove the
arbitrary deal-name step and unused summary/sidebar space.

OWN-WORLD: Inherit KAY's light canvas, white controls, black navigation,
restrained gold creation, semantic status colours, system sans and Iconsax.
Reuse shadcn controls and the existing Tailwind geometry; no new visual world.

STORY: Select a calling code, record the client's profile, languages, budget and
source. Review project, budget and buying intent before one atomic conversion.
The same client facts remain readable in the deal and its history.

FIRST VIEWPORT: Compact header and gold primary action above full-width content.
Forms pair contact fields and qualification fields in balanced desktop columns;
mobile stacks in reading order. Lists prioritise client/phone, project or budget,
status, source, owner and activity. Filtering and numbered pages stay close to
the table. No decorative metrics or permanently empty summary column.

FORM: Owner-pinned IMMO World operational layout in KAY's established system.
Seed key: N/A, explicit reference and precise workflow, not an open concept round.
Signature interaction: a versioned conversion confirms project/budget/intent,
then opens the inherited deal; it never implies a stock reservation.
ENERGY1/RHYTHM1/MOTION1; only meaningful state transitions.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
