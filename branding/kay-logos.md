# KAY supplied logo replacement

Owner request:2026-10-16. Replace the earlier low-resolution logo and the empty
favicon with the two supplied PNGs; preserve the existing Approved V3 interface.
No generated/redrawn brand, backend, data, permission or business-rule changes.

## Sources and use

| Supplied original | Preserved source | SHA-256 |
|---|---|---|
| Champagne-Gold KAY Real Estate Logo.png | `kay-logo-reference-flat.png` | `a4476635e72072a437b7642feba9215452e37dd4a3ddb94e12f0b59dc38e5966` |
| Luxury Gold KAY Real Estate Logo.png | `kay-logo-reference-textured.png` | `259606cb181020ad9784a382c79a3d5bf263d3971930692f7db91e13fed5bdba` |

Both originals are1254×1254. Champagne has a real alpha channel; Luxury is opaque.
The reference filenames remain compatible with existing design-document links,
but their old artwork bytes are replaced, not retained as alternate assets.

`node frontend/scripts/brand-assets.mjs` reproducibly removes outer unused space
and derives the shipped PNG/SVG/ICO assets using the pinned Next.js image processor.
It does not recolor, redraw, remove backgrounds or alter the supplied gold texture.
The transparent source's existing edge texture is retained exactly.

| Surface | Shared integration | New artwork |
|---|---|---|
| Login and change-password forms | `AuthFrame` → `Brand appearance="transparent"` | `kay-champagne-gold.png` |
| Desktop shell on every authenticated route/tab/record | `AppShell` → `Brand` | `kay-luxury-gold.png` on black |
| Mobile navigation | Existing text-based drawer preserved | No previous logo image to replace |
| Every page's browser tab | Root metadata | Self-contained `favicon.svg`, versioned URL;16/32/48px ICO fallback |
| iOS/home-screen bookmark | Root metadata |180px `kay-apple-icon.png` |
| Local website simulator favicon | Existing `/favicon.svg` forwarding | Same new self-contained SVG, no backend change |

The tiny favicon uses the original KAY/key lettermark without the small wordmark,
not invented lettering. The SVG embeds its PNG and needs no secondary request.
The old active `frontend/public/images/kay-logo.png` is removed (recoverable from
Git history). Original approved screenshots and historical evidence retain their
original pixels; rewriting those would falsify their provenance. No history rewrite.

## Design and scope

Reading this as a supplied-brand replacement in the existing French KAY CRM,
ENERGY1/RHYTHM1/MOTION1. Antislop is applied during the change; separate unselected
AFTER findings are not touched. Design-system-ops preserves the shared width,
reserved652:616 footprint, alignment, descriptive alt text and surrounding controls.
Design-taste-frontend's landing/concept workflow is excluded for this operational
CRM/asset-only change. Existing shadcn/Tailwind/Bklit/Iconsax remain unchanged.

Black artwork belongs on black navigation; transparency avoids a black tile on
the existing faded-villa authentication screen. No palette, type or layout redesign.
Artwork aspect ratios remain intact. Logos are not form text or a new status cue.

## Verification

- `cd frontend; npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`:
  pass, no lint/build warnings. Icon inventory remains27 semantics/0 violations.
- `$env:KAY_E2E_PRODUCTION='1'; npm.cmd run test:chrome -- tests/e2e/brand.spec.ts --reporter=list`:
  final3/3 pass in38.8s, compiled stack and visible isolated installed Chrome.
  The earlier2/2 run is superseded, not added to this count.
- Checks include both original hashes,5 actual public asset responses/MIME types,
  ICO16/32/48 entries, server-rendered/no-JavaScript login, browser-decoded SVG
  with actual gold pixels, mandatory password-change branding, eight navigation
  routes, actual loaded images,320/768/1440px login and360px keyboard drawer
  open/Escape/focus return. No page overflow or collected page/console errors.
- All five generated assets reproduce byte-for-byte on a second generator run.
- Five safe native captures under ignored `frontend/output/playwright/brand/`:
  three empty-login widths, synthetic empty Leads and mobile navigation.
  Desktop/mobile originals are opened and visually inspected, not inferred from
  successful assertions. Supplied transparent edge texture is retained.
- `git diff --check` and repository safety/index ignore probes pass.

Antislop delivery gate at this asset-only scope: R-23 PASS (explicit supplied
artwork, preserved hash identity); R-03/R-32 PASS (responsive and keyboard cases);
R-35 PASS (compiled browser interactions and rendered images); R-33 PASS (source
edits in source, generator writes derived media only). No invented UI controls,
claims, data or routes; no changed functional color, copy, theme or animation.
No new AFTER-only aesthetic fix. This is not full CRM/product acceptance.

Hosted full CI and protected-main promotion remain separate gates; the actual
PR/check records determine publication, not the local test count. The focused
local check runs on the existing working UI; only the reviewed logo files are
published. The required hosted checks test the exact clean commit against main.
No DigitalOcean deployment or browser-cache state on another machine is claimed.
