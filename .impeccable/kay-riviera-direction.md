# KAY Riviera — CRM visual direction

Status: owner-pinned direction, implementation in progress

Date: 2026-10-18

## Product and scene

KAY is the shared workspace a Moroccan real-estate team uses to move accessible
contacts and enquiries through property deals, visits, inventory and follow-up.
The audience is KAY staff working through live records, often in dense lists and
forms, in French and MAD with Casablanca time. The dashboard must prove that the
team can read its real pipeline and current work at a glance without mistaking
illustrative reference values for CRM facts.

## Pinned visual world

Khalid supplied and selected the KAY Riviera CSS, token JSON, ten-page brand PDF,
dashboard reference image and CRM UX research. These sources pin a refined
coastal workspace: ivory canvas, warm-white surfaces, dark olive-charcoal rail,
honey actions, a calm split city-photo hero, Fraunces display headings, Manrope
interface text, DM Sans metadata and nine distinct pipeline hues. The existing
KAY logo and login villa/palm line art remain; no replacement logo or invented
commercial claims are allowed.

The supplied dashboard is a composition reference. Every count, agent value,
permission, status and interaction in the running product continues to come from
the current API and its contracts. The measured composition is translated into
the existing shadcn, Tailwind, Iconsax and Bklit layers; the original CSS and
tokens remain the brand reference in `branding/riviera/`.

## First viewport and reach

The dashboard opens with a solid readable title area beside the coastal photo,
then the existing period controls and two grouped KPI sets: current snapshot and
selected period. Current lead/deal funnels and the real attribution charts keep
their authorized data and accessible equivalents. Work, notifications,
exceptions and follow-up stay available below. Other screens inherit the same
surfaces, colors, type, control geometry and compact rhythm without changing
their routes, fields, permissions or business behavior.

The desktop sidebar keeps all current routes and gains a keyboard-operable
collapse/reopen control. Global search moves into the rail on desktop and stays
available in the responsive header/drawer. The existing login architectural
line-art asset is reused decoratively at the bottom of the desktop rail.

## Signature interaction and risks

The only new interaction is a reversible desktop sidebar collapse. Its width is
72 px as a local implementation proposal because the supplied system specifies
the 224 px expanded rail but not its compact width; every destination remains
discoverable by its accessible name. Mobile keeps the existing labelled drawer.

The main visual risk is that the reference's illustrative data or compact
dashboard could obscure the CRM's real metric definitions. Existing API,
authorization, accessible chart tables, period scope and long French content
take precedence. Panels stay legible and responsive; no new chart library,
route, workflow, state or synthetic live-looking metric is introduced.

## Execution boundary

This is a user-pinned replacement of the prior appearance, not an open-ended
concept selection. No alternate aesthetic is being proposed. Product truth,
approved component stack, local font licensing, responsive behavior and keyboard
access remain binding. Product/design review remains Khalid's.
