# Login icon and border refinement

2026-10-16. Requested locally by Khalid; do not publish while other UI changes
are pending. This is a login presentation refinement, not an authentication
change or approval of earlier AFTER-only findings.

## Scope and intent

Reading this as KAY's existing staff sign-in form, with the approved quiet
ivory/villa/gold identity. Antislop applies DURING; ENERGY1 / RHYTHM1 / MOTION1.
Design-system-ops supplies geometry. The marketing/concept workflow of
design-taste-frontend does not apply to this existing authentication form.

- Email and lock icons precede the two persistent labels, identifying each
  field without replacing its accessible name or moving labels into inputs.
- The original icon refinement used an incoming sign-in glyph. Khalid's later
  supplied login reference replaces it with a trailing forward arrow on the
  existing submit action. The button stays charcoal, with inherited white icon
  color; authentication and pending behavior do not change.
- A person identifies administrator-created accounts; a group identifies the
  team-only footer. Supporting text wraps beside fixed-size16 icons with an8px
  gap. The shared footer also appears on change-password.
- Login fields, submit and password-toggle corners use the existing large10px
  radius. This softens the section without pills, new tokens, global control
  changes, removed focus indicators or lighter required input boundaries.
- The existing10px panel, neutral surfaces, fonts, spacing, faded villa, new
  transparent logo, French text, validation and redirects are retained.

## Asset provenance

KAY's SSR-safe typed Iconsax layer adds `PasswordIcon` and `SignInIcon` from
official Free `security.lock` and `arrow.login-02` linear assets. The pinned
0.1.1 archive SHA-512 was checked against the existing provenance manifest;
original SVG SHA-256/path selections are in
[assets.json](../../../reference/iconsax/assets.json). Existing email/person/
group assets are reused. White strokes normalize to currentColor; source path
coordinates, widths, caps and joins are retained. No runtime package, external
icon requests, premium entitlement or new dependency is introduced. Existing
Iconsax notices remain distributed.

The current source inventory is29 semantic exports,23 consumer files and45
icon sites, with0 violations and3 chart-geometry roots excluded. The initial
27-export migration inventory remains historical, not new whole-product browser
evidence.

## Verification

From `frontend/`:

- `npm.cmd run lint`: exit0,0 warnings; inventory29 exports/23 consumers/45
  sites,0 violations. Rerun after the final test-only capture correction passed.
- `npm.cmd run typecheck`: exit0, including final test changes.
- `npm.cmd run build`: exit0, optimized production compilation and route output.
- `KAY_E2E_PRODUCTION=1 npm.cmd run test:chrome -- tests/review/iconsax.chrome.spec.ts tests/e2e/auth.spec.ts tests/review/chrome.spec.ts --grep 'Iconsax:|Iconsax login:|AT-23/39: keyboard|AT-37/38 scoped|SP-03: visible login' --reporter=list --max-failures=1`:
  6/6 passed,0 skipped,1.2m. Real API/database sign-in, generic invalid credentials,
  password clearing/safe retry, pending/disabled state and restricted password
  change/fresh login are included. No backend tests or whole-product suite are
  newly claimed for this presentation-only change.
- The zoom-only case was rerun1/1,18.8s total, after correcting its screenshot
  transport. Native200% Chrome zoom is asserted from devicePixelRatio/innerWidth;
  CDP `fromSurface:false` captures the actual viewport. Full-page Playwright
  capture at native zoom had produced a clipped image despite correct DOM
  geometry; this was an evidence defect, not an application-layout failure.
- Original archive integrity and the two new source SVG hashes were checked;
  all8 new path coordinates match their official sources exactly. All29 exports
  pass SSR/accessible-label/path-count/offline checks. Six login icons appear in
  real Next HTML, with JavaScript disabled and after hydration. No remote icon
  request, missing glyph, page error or console error was observed in these cases.
- Five widths320/360/768/1024/1440 have no page overflow. Labels retain French
  accessible names; label icons measure16px with8px gaps; controls remain44px
  minimum and login inputs resolve to10px corner radii. Keyboard Tab/Space/Enter
  exercises both password-toggle states and empty-form validation/focus.
- Contrast script: input boundary `#767676`/white4.54:1; supporting text
  `#5E5E5E`/white6.48:1 and canvas6.05:1; white/charcoal submit14.94:1. These are
  existing semantic colors, not new feature-local palette values.
- Actual desktop/mobile/tablet, invalid-login, shared change-password and
 29-glyph catalogue PNGs were opened. The corrected native-zoom viewport was
  also opened. Captures live under ignored `frontend/output/playwright/`, with
  new login captures in `login-icons/`. Password fields are empty in captures;
  the invalid-login email belongs only to a disposable synthetic actor.
- Test services shut down:0 listeners on3000/3001/3100/3101/8000/8001/8100/8101/
  8102/8200/8201/8202 and0 project Node/Python service processes. Shared PostgreSQL
  on5432 is preserved. No backend diff. HEAD/main/origin-main remainc6b42a5.

## Scoped antislop delivery gate

| Gate | Result and evidence |
|---|---|
| Hard gates | PASS: existing honest French copy retained; no fabricated data/navigation/features/assets; real controls and states exercised;320–1440 reflow, native200% zoom, keyboard focus and calculated contrast pass. No new theme, FAQ, testimonial, em-dash copy or source-rewriting script. |
| Purpose | PASS: five semantic icons implement the five owner-marked locations;10px radius softens the existing form without weakening field contrast. No new decoration, motion, shadow or visual world. |
| Liveliness | PASS: explicit1/1/1 dials, existing KAY gold identity/villa and charcoal sign-in focal point retained; consistent8px icon/text spacing and structural form gaps. |
| Craft/quality | PASS: shadcn/Tailwind and inline Iconsax reused; labels, pending/error/disabled/keyboard behavior retained; scoped screenshots opened and production build/real-stack checks pass. One detector invocation returned[]; it is not human product acceptance. |

Limitations: visible Chrome and emulated responsive viewports, not physical
iOS/Android or assistive-technology user testing. The unrelated pending UI
changes and earlier AFTER findings remain outside this refinement. No whole-app
retest, deployment or GitHub verification is newly claimed.

No backend, API, permission, session, cookie, CSRF, bootstrap, rate-limit or
password-policy change is included. All test actors use the guarded synthetic
database. No credentials may appear in captures or traces. No deployment or
Git push is authorized by this refinement.
