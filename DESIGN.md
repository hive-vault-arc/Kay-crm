---
name: KAY Reference Workspace
description: Shared visual system from the owner-supplied KAY prototype.
colors:
  canvas: "#F6F7F9"
  ink: "#181918"
  muted: "#4C5562"
  primary: "#20221E"
  primary-hover: "#383B32"
  control: "#E7ECF2"
  border: "#C9D1DC"
  focus: "#64748B"
  dark-canvas: "#151719"
  dark-ink: "#E8E9EB"
  dark-control: "#303944"
  dark-border: "#4B5666"
typography:
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: "21px"
  section:
    fontSize: "17px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-0.02em"
  control:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.25
rounded:
  panel: "24px"
  inset: "18px"
  field: "20px"
  pill: "999px"
spacing:
  micro: "4px"
  icon: "8px"
  compact: "12px"
  regular: "16px"
  panel: "20px"
  group: "24px"
  trailing: "32px"
---

# KAY workspace design

Use the owner-supplied `kay/kay` project dated 2026-11-10 as the visual
reference. Read the stylesheet imports in `src/main.js` in order and compare
the rendered state at the matching width, theme and interaction. Earlier
prototype stylesheets can be superseded by later rules in that same project.

The shared source of truth is the [reference token file](branding/prototype/kay-workspace.tokens.json).
The [design system](docs/04-design/design-system.md) describes the runtime
mapping, visual roles and the boundary for this foundation pass.

- Use Inter for display, body, forms and metadata. Use the existing pinned
  Lucide glyphs, wordmark and pearl texture from the reference.
- Use 13px labels and table headings with their own weights. Use chevrons for
  browsing pages and periods, and arrows for navigation to a destination.
- Use the reference's pearl/graphite surfaces, 1px translucent edge, 24px outer
  radius, 18px inset radius and compact spacing. Keep controls solid where the
  reference uses a solid fill.
- Use 40px labelled desktop buttons, 44px touch controls and 48px desktop
  rail targets. Keep the 96px rail and 80px desktop header. The phone header
  is 64px at 830px and below.
- Use the reference's 260ms control easing, 120ms press feedback, 280/200ms
  menu entrance/exit, 420/300ms drawer entrance/exit and 460ms route entrance.
  Keep reduced-motion, reduced-transparency and forced-color behavior.
- Use Motion for the dashboard KPI entrance and Lenis for the reference's
  desktop wheel easing. Keep each scroll surface independent.
- Keep the installed Next.js, Tailwind, shadcn/Radix and Bklit integration.
  Preserve French labels, permissions, focus handling and real CRM data.
  Review page and component composition separately using the supplied source.
