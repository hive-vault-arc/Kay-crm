# KAY selected workspace source

The owner-selected frozen prototype is the visual/UX authority for the
`codex/redesign` migration. This directory does not introduce a second styling
framework. Existing Tailwind/shadcn semantic roles resolve to the selected
light/dark, geometry and motion definitions in `kay-workspace.tokens.json`.
Historical Riviera assets/tokens remain as provenance, not the active theme.

The final active prototype CSS cascade matters:96px rail,80px global bar,
24px outer radius,18px inset radius, pill controls,44px fields/targets and
Inter UI typography. Mode color variables and geometry variables have separate
namespaces. Glass/atmosphere are owned exceptions in the workspace stylesheet;
components otherwise use shared primitives and Tailwind variants.

## Asset provenance

| Runtime file | Frozen source | SHA256 |
| --- | --- | --- |
| `frontend/src/fonts/InterVariable.woff2` | `public/assets/InterVariable.woff2` | `693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3` |
| `frontend/public/images/workspace/kay-logo.svg` | `public/assets/kay-logo.svg` | `53f3d214c0246d9c127b6225d35ba385e1b60ed6f7f284a1db36605fd5282327` |
| `frontend/public/images/workspace/kay-pearl-atmosphere.png` | `public/assets/kay-pearl-atmosphere.png` | `7c443fad9a68adb73d4b740e49b634f014ab2c72f9fb85da82b90a7eeb482c88` |

The exact original font notice is distributed at
`frontend/public/licenses/workspace/Inter-OFL.txt`. UI assets do not populate
inventory/client records or replace private property photos.

`kay-glyphs.json` preserves the selected source nodes from `lucide@1.59.0`.
The shared registry keeps all45 existing semantic export names, plus5 selected
theme/help/owner aliases. Required real capabilities absent from the prototype
use the same frozen family. Both inventory scripts keep enforcement; source
shape hashes, element/attribute allowlists and no-direct-package-import rules
are checked. No icon runtime dependency is added. Original ISC/Feather notices
are distributed at `frontend/public/licenses/workspace/lucide-LICENSE.txt`.
The old Iconsax manifest/notices remain historical provenance.

This records implementation source, not native visual/accessibility/product
acceptance. See the [execution record](../../docs/03-planning/design-prototype-migration-execution.md).
## Record status additions, 2026-10-26

`kay-status.tokens.json` freezes the selected prototype's later soft status
surfaces and wire-role mapping. `workspace-status.css` consumes those values.
The deal context explicitly maps `new` to proposition/Nouvelle while enquiries
retain not-contacted/Nouveau. `kay-glyphs.json` adds the exact frozen Ellipsis
nodes as MoreIcon, bringing the semantic registry to51; original notices apply.
