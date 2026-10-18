# KAY Riviera branding

Owner-selected 2026-10-18, version 1.1.0. This is the current application palette
and typography, superseding older V3/Satoshi/pure-black-sidebar specifications.
It does not replace approved CRM layouts, French copy, Iconsax, shadcn, Tailwind,
Bklit, logos, authentication, permissions or API metric definitions.

- [Exact 191-token handoff](kay-riviera.tokens.json), including 60 contrast pairs.
- [Original CSS reference](kay-riviera.css), not imported as a parallel framework.
- [Original 10-page guide](kay-riviera-branding.pdf).
- [Application role mapping](../kay-ui-tokens.json).
- [Runtime exporter](../../frontend/src/lib/theme.ts) resolves aliases, rejects
  cycles/missing references and publishes namespaced `--riviera-*` variables.
- [Shared CSS](../../frontend/src/app/globals.css) maps those roles to Tailwind,
  shadcn controls, Bklit charts and existing app compositions.

## Colors

| Role | Exact value |
|---|---|
| Canvas / surface | `#FAF8F4` / `#FFFDF8` |
| Ink / secondary text | `#272727` / `#6B6257` |
| Honey action / hover / pressed | `#D8AA45` / `#E4BC62` / `#CC9C36` |
| Gold text and light focus | `#765A13` |
| Sidebar / selected | `#121512` / `#252D24` |
| Controls / dividers | `#858779` / `#E5E0D6` |
| Stage colors | blue `#3B82F6`, cyan `#06B6D4`, yellow `#FACC15`, purple `#8B5CF6`, green `#22C55E`, orange `#F97316`, red `#EF4444`, pink `#EC4899`, slate `#64748B` |

Chart category fills are not feedback colors. Error text/destructive actions use
`#994A40`, success uses `#235D37`, warning uses `#825A14`. Names and exact values
remain visible; zero counts and live API counts are never replaced by mock data.

## Fonts and licenses

The three attachments did not contain the referenced WOFF2 files. The retained
official Google Fonts variable TTF source archive matches the handoff's embedded
version pins: Fraunces 1.000, Manrope 4.505 and DM Sans 4.004. Its SHA256 source
identities and license paths are recorded in [fonts.json](fonts.json).

The runtime uses the local files below through `next/font/local`; their embedded
versions were checked independently with Next's bundled font parser. The three
OFL notices are retained in `frontend/src/fonts/` and distributed from
`frontend/public/licenses/fonts/`. No live font endpoint or browser request to
Google is used.

| Role | Family / embedded version | Runtime source |
|---|---|---|
| Titles | Fraunces 1.000, weight550, opsz40, SOFT0, WONK0 | `frontend/src/fonts/Fraunces-variable.woff2` |
| Interface | Manrope 4.505 | `frontend/src/fonts/manrope-variable.ttf` |
| Metadata | DM Sans 4.004 | `frontend/src/fonts/DMSans-variable.woff2` |

The unused `Manrope-variable.woff2` remains preserved from concurrent workspace
work. Its embedded version is 4.504, so the runtime uses the verified 4.505 TTF
to honor the supplied pin. WOFF2 CDN revision labels are not font-version pins.

The families and OFL terms are documented by upstream [Fraunces](https://github.com/google/fonts/tree/main/ofl/fraunces), [Manrope](https://github.com/google/fonts/tree/main/ofl/manrope) and [DM Sans](https://github.com/google/fonts/tree/main/ofl/dmsans).

## Application adaptations

The guide's Lucide identifiers are design data only: equivalent existing
Iconsax icons are retained. Sample users, periods, chart geometry exports and
counts are not shipped as dashboard data. No missing metric or feature is added.
Existing contact/deal split layouts, directory filter rails, auth composition,
table scroll regions and 44px targets remain. Desktop navigation is now
collapsible; global search lives in its expanded rail and remains accessible in
compact mode and the responsive header. The existing login villa/palm line art
is reused decoratively in the desktop rail. Riviera changes the shared palette,
fonts, 10px controls/12px panels, focus and disabled states. Dashboard KPI cards
receive the supplied left icon badges. The existing `dashboard-city.png` photo
is retained; the screenshot includes a different panorama but no clean standalone
hero photograph was supplied. The newer owner screenshot, rather than the
original handoff's split copy/media grid, sets the dashboard composition:
full-width banner, ivory text-protection fade, live desktop notification/account
controls, compact scope/date/Lead toolbar, grouped KPIs and paired existing-data
funnels. Screenshot sample counts and agent charts remain illustrative and are
not application data. The 72px collapsed-rail width is an implementation
proposal because the supplied handoff specifies only 224px.
