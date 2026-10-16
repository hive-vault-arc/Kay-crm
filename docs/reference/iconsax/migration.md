# KAY Iconsax migration — coverage and integration

2026-10-16. Explicit user authorization: [D33](../../../decisions.md). UI-only;
Approved V3, shadcn/ui, Tailwind and Bklit remain authoritative. Current technical
results and limitations: [execution.md](execution.md). A source checkbox is not
a claim of one browser screenshot for every nested permission/state permutation.

## Integration and license

The official `iconsax@0.1.1` npm archive was fetched and its SHA-512 integrity
checked against the publisher's versioned registry metadata before selecting
assets. The archive was inspected as data, not executed. Its web-component entry
extends `HTMLElement` at evaluation time and loads JSON assets; KAY does not
import it, install a similarly named React package, or guess component exports.
Instead, 26 selected official bundled Free linear SVGs form 27 typed semantic
React components in `frontend/src/components/icons/index.tsx`. This ordinary
React layer is usable during SSR and hydration and needs no asset endpoint.

[assets.json](assets.json) records the exact archive integrity, official category
source, original SVG SHA-256 and selected path indices for every semantic icon.
Only functional component code is shipped, not a standalone SVG pack or catalogue.
Original path coordinates, 1.5px strokes (2px on source punctuation dots), caps
and joins are retained. White strokes become `currentColor`. Redundant full-24px
clip wrappers become root viewport clipping, avoiding duplicate IDs. Check/close
marks omit outlines already supplied by native controls and use a tighter viewBox.
The official `menu` asset is four circles; affaires uses `briefcase`. No fabricated
hamburger or handshake export was assumed.

The asset grant is **Iconsax Free proprietary terms, not MIT**. Official developer
terms permit free commercial source-code integration/modification with notice
retained. No Pro files, subscriptions, account, key, premium synchronization,
purchase or external messaging are involved. Retain
[THIRD_PARTY_NOTICES](../../../frontend/THIRD_PARTY_NOTICES.md), also distributed
at `frontend/public/licenses/iconsax.txt`. Do not redistribute loose icons.
Primary sources: [license](https://docs.iconsax.io/license-and-terms/license),
[usage terms](https://docs.iconsax.io/license-and-terms/usage-manifesto),
[attribution](https://docs.iconsax.io/license-and-terms/atribution-guide),
[versioned registry](https://registry.npmjs.org/iconsax/0.1.1),
[official integration](https://docs.iconsax.io/integrations/intro).

## Shared contract

Semantic named exports and `KayIconProps` / `KayIconComponent` replace direct
library imports, including dynamic navigation/KPI arrays and SectionHeading.
Default size24; size prop12/16/20/24/32/48; existing Tailwind size classes,
parent gaps, geometry, button targets and inherited colors are unchanged.
Decorative SVGs default to aria-hidden/unfocusable. The typed labelled variant
adds role=img and an accessible name. Existing French button labels remain.
No icons were added to previously text-only buttons, tabs or calendar events.

Lucide was removed with npm only after all consumers were migrated and npm
confirmed it had no other dependent. `components.json` omits its obsolete icon
choice; there is no invented Iconsax shadcn registry mapping. After generating
or updating shadcn/Bklit source, explicitly adapt interface icons to the shared
layer. ESLint rejects direct Lucide/Iconsax package imports.

## Complete source inventory

Before:21 Lucide-importing source files, including a type-only SectionHeading
consumer. After:the same21 consumers,40 static/dynamic/composed icon sites,
27 semantic exports,26 distinct official assets. Repeatable read-only inventory:
`cd frontend; node scripts/icon-inventory.mjs`. No interface SVG is permitted
outside the layer; Bklit's three SVG roots are explicitly chart geometry.
The full route/context inventory remains29 route files,168 contextual sites and
111 overlapping region/disclosure sites in71 files: [V3 complete surface map](../../04-design/ui-reference/approved-v3/coverage.md).

| Source checked | Source (frontend/) | Semantic imports | Sites | Running evidence family |
|---|---|---|---|---|
| [x] | `src/components/shared/data-state.tsx` | `AlertIcon`, `EmptyFolderIcon` | 2 | All routes/error boundaries; glyph/controls fixture + development foundation |
| [x] | `src/components/shared/section-heading.tsx` | `KayIconComponent` / dynamic Icon | 1 | Lead/deal/inventory/task/finance forms; V3 form captures |
| [x] | `src/components/ui/checkbox.tsx` | `CheckIcon` | 1 | Column chooser, contact roles, import/settings; native Leads + glyph fixture |
| [x] | `src/components/ui/native-select.tsx` | `ChevronDownIcon` | 1 | Every native filter/field; V3 + native workflows |
| [x] | `src/components/ui/radio-group.tsx` | `RadioIndicatorIcon` | 1 | Contact kind/phone choice; native Leads + glyph fixture |
| [x] | `src/components/ui/sheet.tsx` | `CloseIcon` | 1 | Search, columns, notifications, mobile navigation; native shell/Leads/V3 |
| [x] | `src/features/auth/login-form.tsx` | `ShowPasswordIcon`, `HidePasswordIcon` | 2 | SSR/no-JS/password toggle + V3 login |
| [x] | `src/features/contacts/contact-fields.tsx` | `PhoneIcon`, `EmailIcon` | 2 | Lead create/edit; V3 form captures + native Leads |
| [x] | `src/features/contacts/lead-create.tsx` | `TaskIcon`, `ContactIcon`, `EnquiryIcon` | 3 | V3 Lead form + native Leads |
| [x] | `src/features/deals/deal-form.tsx` | `ContactIcon`, `DealIcon` | 2 | V3 deal-create |
| [x] | `src/features/discovery/search-trigger.tsx` | `SearchIcon` | 1 | V3 global-search + authenticated SSR |
| [x] | `src/features/files/inventory-thumbnail.tsx` | `DevelopmentIcon` | 1 | V3 project/standalone cards + native inventory + clean-image case |
| [x] | `src/features/finance/terms-form.tsx` | `FinanceIcon` | 1 | V3 commission-form + native finance |
| [x] | `src/features/inventory/development-editor.tsx` | `DevelopmentIcon` | 1 | V3 project-create/project-edit |
| [x] | `src/features/inventory/inventory-card.tsx` | `LocationIcon` | 1 | V3 project cards/inventory mobile + native inventory |
| [x] | `src/features/inventory/property-editor.tsx` | `PropertyIcon` | 1 | V3 property-create/property-edit + native inventory |
| [x] | `src/features/reports/report-dashboard.tsx` | `DevelopmentIcon`, `CompletedIcon`, `DealIcon`, `InboxIcon`, `ContactsIcon`, `FinanceIcon` | 7 | V3 dashboard + native reports |
| [x] | `src/features/requirements/requirement-panel.tsx` | `CheckIcon` | 1 | Native requirements selected-state/targets |
| [x] | `src/features/shell/app-shell.tsx` | `NotificationIcon`, `NavigationMenuIcon` | 2 | All protected routes, mobile navigation/inbox + shell cases |
| [x] | `src/features/shell/navigation.tsx` | `CalendarIcon`, `DealIcon`, `PropertyIcon`, `DashboardIcon`, `SettingsIcon`, `ContactsIcon` | 7 | All protected routes + shell/SSR |
| [x] | `src/features/work/task-form.tsx` | `TaskIcon` | 1 | V3 task-form + native work |

## All route families, including unpictured pages

These rows map source coverage to the actual checked route family. A route
without its own glyph inherits shared shell/control icons; no decorative glyphs
or new product functionality were invented to fill the checklist.

| Source checked | Route | Retained V3 pattern | Runtime coverage family |
|---|---|---|---|
| [x] | `/[section]` | 02-dashboard | V3 dashboard + shell fallback |
| [x] | `/contacts/[id]` | 05-lead-details | V3 contact tabs + native requirements/work |
| [x] | `/deals/[id]` | 05-lead-details | V3 record/form + relevant native workflows |
| [x] | `/deals/new` | 04-create-or-edit-lead | V3 record/form + relevant native workflows |
| [x] | `/deals` | 03-leads-and-deals-list | V3 record/form + relevant native workflows |
| [x] | `/leads/[id]/edit` | 04-create-or-edit-lead | V3 Leads/views/forms + native Leads |
| [x] | `/leads/[id]` | 05-lead-details | V3 Leads/views/forms + native Leads |
| [x] | `/leads/new` | 04-create-or-edit-lead | V3 Leads/views/forms + native Leads |
| [x] | `/leads` | 03-leads-and-deals-list | V3 Leads/views/forms + native Leads |
| [x] | `/projects/[id]/edit` | 04-create-or-edit-lead | V3 inventory forms/tabs + native inventory |
| [x] | `/projects/[id]` | 08-project-details | V3 inventory forms/tabs + native inventory |
| [x] | `/projects/new` | 04-create-or-edit-lead | V3 inventory forms/tabs + native inventory |
| [x] | `/projects` | 07-projects | V3 inventory forms/tabs + native inventory |
| [x] | `/projects/properties/[id]/edit` | 04-create-or-edit-lead | V3 inventory forms/tabs + native inventory |
| [x] | `/projects/properties/[id]` | 08-project-details | V3 inventory forms/tabs + native inventory |
| [x] | `/projects/properties/new` | 04-create-or-edit-lead | V3 inventory forms/tabs + native inventory |
| [x] | `/settings` | 09-all-users | V3 administration/forms + native schedule |
| [x] | `/settings/users/[id]/edit` | 09-all-users | V3 administration/forms + native schedule |
| [x] | `/settings/users/new` | 09-all-users | V3 administration/forms + native schedule |
| [x] | `/settings/users` | 09-all-users | V3 administration/forms + native schedule |
| [x] | `/settings/working-hours` | 09-all-users | V3 administration/forms + native schedule |
| [x] | `/ui-checks` | 02-dashboard | Development-only foundation |
| [x] | `/visits/[id]` | 04-create-or-edit-lead | Native schedule |
| [x] | `/visits/new` | 04-create-or-edit-lead | V3 calendar/booking + native schedule |
| [x] | `/visits` | 06-visits-calendar | V3 calendar/booking + native schedule |
| [x] | `/change-password` | 01-login | V3 record/form + relevant native workflows |
| [x] | `/login` | 01-login | V3 + real SSR/no-JS |
| [x] | `/` | 02-dashboard | Shell entry/redirect |
| [x] | `/website-simulator` | 04-create-or-edit-lead | Native synthetic intake |

Record tabs, owner/history/requirement/deal/task/document panels, finance,
search/export/archive/audit/import, working hours, notifications and calendar
contexts inherit the same shared layer. Their existing168 sites and111 region
sites are not duplicated into misleading new route counts. V3's composition
case and relevant native workflows verify the actual reachable controls/states;
[execution](execution.md) distinguishes rerun evidence from historical coverage.

## Deliberate exclusions and preserved boundaries

- All locally owned shadcn icons (Checkbox, RadioGroup, NativeSelect, Sheet) were
  migrated. Other local primitives had no interface glyph to replace.
- Bklit `bar-chart.tsx:625` and `tooltip/chart-tooltip.tsx:274,303` are the
  chart canvas, crosshair/tooltip marker geometry, not interface icons. All chart
  source bytes are preserved; no imported interface icons remained there.
- KAY logos, photos, dashboard/login assets and the existing transparent favicon
  placeholder are branding/media, not interface icons; unchanged.
- French history arrows are text transition separators. Browser-native date,
  file-picker and number-input affordances are browser chrome, not app-owned
  icon assets; unchanged.
- No backend source, migration, route, API, permission, business rule, date/MAD
  formatter, form field or action changed. No screenshot is rendered as a page.

## UI skill application

Antislop was applied DURING this implementation under the user's V3 instruction;
no separate unselected AFTER-only aesthetic finding was implemented. The existing
V3 world, shared geometry and functional accessibility were retained. Dense CRM,
admin, table and form surfaces are outside design-taste-frontend's marketing
workflow; no new world, concept tournament, motion or marketing structure was
introduced. design-system-ops governed unchanged icon slots, alignment and touch
geometry; React/Next server guidance informed the static boundary. Impeccable's
existing-context/extraction and craft-floor guidance constrained this to a narrow
system refinement, not a new redesign or broader DESIGN.md merge. No new agent
review verdict or human acceptance is claimed.
