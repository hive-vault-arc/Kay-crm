# Third-party notices

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
