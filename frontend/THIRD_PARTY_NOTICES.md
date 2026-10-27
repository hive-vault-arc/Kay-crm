# Third-party notices

## Selected Bklit pie components

`src/components/charts/pie-chart.tsx`, `pie-context.tsx` and `pie-slice.tsx` are
copied from the owner-frozen Bklit source in the KAY prototype. Their original MIT
notice is retained verbatim in `public/licenses/workspace/Bklit-MIT.txt`. The only
source adaptation is the existing local `cn` helper import. The pie reuses Bklit's
existing parent measurement/mount-animation helpers; KAY composes the semicircle,
exact accessible legend and reduced-motion behavior in feature wrappers.

The directly imported `@visx/group@4.0.0` and `d3-shape@3.2.0` already existed in
the locked/installed chart tree; their exact versions are now declared directly.
No different chart library or dependency upgrade is introduced. Source hashes,
full-prototype comparison and dependency audit evidence are recorded in
`../docs/03-planning/design-migration-evidence/dashboard-ui-2026-10-27.json`.

## Selected workspace assets

The owner-selected screen uses Inter Variable, distributed under SIL OFL1.1.
The original font notice is retained in `public/licenses/workspace/Inter-OFL.txt`.
Brand/atmosphere assets are copied from the owner's frozen KAY prototype and
listed by checksum in the migration inventory, not assigned to business records.

The selected workspace glyphs are frozen vector nodes from `lucide@1.59.0`, under its
ISC license with applicable Feather notices. The complete original license is
retained in `public/licenses/workspace/lucide-LICENSE.txt`. Only selected shapes
are integrated into the typed semantic icon layer; no runtime icon package or
loose icon pack is installed. `branding/prototype/kay-glyphs.json` records their
provenance and hashes. The owner's current prototype-fidelity instruction governs
these glyphs. All45 prior semantic exports retain their names and behavior via
this selected visual family; additional Help/Owner/theme aliases share the same
source. Existing Iconsax source notices/manifests remain as historical provenance.

## Riviera variable fonts: SIL Open Font License 1.1

Fraunces 1.000, Manrope 4.505 and DM Sans 4.004 use the SIL Open Font License 1.1
and are self-hosted through `next/font/local`. Runtime files use WOFF2 for
Fraunces/DM Sans and the verified TTF for Manrope. The original Google Fonts TTF
source archive and its SHA256 manifest are retained. Original copyright and
license notices are retained in `src/fonts/*-OFL.txt` and distributed at
`public/licenses/fonts/`. See `../branding/riviera/README.md` for source/version
verification. Font names and original notices remain intact; no font sublicense
or proprietary ownership is claimed.

## Iconsax Free — selected interface assets

Copyright © Iconsax. Iconsax Free assets are licensed under Iconsax's
proprietary Free license and usage terms, **not** the MIT software-license metadata
on the npm package. All rights reserved except as granted by those terms.

Source: official `iconsax@0.1.1` free SVG data, published by Iconsax:
https://www.npmjs.com/package/iconsax
https://github.com/iconsax/iconsax-npm

License: https://docs.iconsax.io/license-and-terms/license
Usage terms: https://docs.iconsax.io/license-and-terms/usage-manifesto
Attribution guide: https://docs.iconsax.io/license-and-terms/atribution-guide

KAY integrates selected Free icons into its functional interface source code.
The Free developer terms permit commercial source-code integration, including
modifications, with this notice retained. This is not a sublicense, a standalone
icon library, permission to redistribute loose assets, or a Pro entitlement.
Do not extract or redistribute these assets as a pack. No paid assets, subscriptions,
account tokens, API keys or web-component loader are used.

Verified package integrity and per-icon provenance are recorded in
`../docs/reference/iconsax/assets.json`. The shared implementation is
`src/components/icons/index.tsx`. White strokes inherit the UI's current color;
redundant full-canvas clipping IDs are removed. Check and close marks omit their
outer frames and use a tighter viewBox for native controls. Original path
coordinates and weights remain intact. Retain this notice in source and binary
product distributions; a browser-readable copy is included at
`public/licenses/iconsax.txt`.

D38's calendar also integrates the selected Free linear car and clock assets
through that same semantic layer. Their source hashes and the car's equivalent
subpath combination are recorded in the manifest; no second icon family, package
runtime or loose-asset distribution is introduced.
