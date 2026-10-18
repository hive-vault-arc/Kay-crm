# Login composition and support footer

Status: compact-frame refinement locally implemented, product/design review pending Khalid

Date: 2026-10-17

## Scope

This owner-requested refinement applies the supplied four screenshots to the
existing `/login` screen. The first screenshot sets the three-panel composition:
KAY identity and French welcome copy at left, the current login form in the
middle and a villa photograph at right. The other references add a secure
workspace band, support contact and footer. KAY's existing name and identity
remain in place; Immoworld branding and its WhatsApp destination are not used.

The side-panel copy is `Vos relations. Vos projets. Votre réussite.` and `Un
espace pour vos prospects, vos affaires et votre équipe.` A new decorative SVG
draws the requested house-and-tree architectural scene. The existing
`frontend/public/images/login-villa.png` supplies the villa photograph.

The footer uses the user-provided `contact@hivevaultarc.com` as a working
`mailto:` link, `Espace de travail sécurisé` as the requested workspace label,
and `© 2026 KAY Real Estate`. It makes no encryption, compliance or enterprise
security claim. The login form, unavailable-service state, redirects, validation,
password visibility and change-password layout keep their existing behavior.

## Design and component decisions

Reading this as an internal KAY staff sign-in in the supplied ivory, charcoal,
gold and villa direction; ENERGY 1 / RHYTHM 1 / MOTION 1.

- `AuthFrame` exposes a `login` variant used only by `/login`; password change
  and other callers retain the original shared frame.
- The layout uses the existing light theme, foreground/surface/link tokens,
  brand asset, Iconsax semantic icons and Tailwind spacing. At the owner's
  request, the frame and footer now use the full available width with an 8px
  small-screen / 12px larger-screen edge inset, rather than a centered 98rem
  cap. The page has only an 8px top/bottom inset and the footer is compact.
  The card flexes to fill the viewport; its content minimum is 40rem at `md`,
  with no forced 50rem desktop height. At `xl`, the panel ratio remains
  0.74:1.1:1.28; at `md` it becomes a two-column brand/form layout and hides
  the villa panel. Below `md`, the brand panel, form and footer stack in reading
  order. The transparent logo frame follows its actual asset ratio, and the
  decorative house/tree scene is capped at 10rem high.
- At `xl`, the villa reuses the existing photograph with the fine gold separator
  shown in the supplied reference.
- The tagline's serif display treatment follows the supplied mockup. Body copy
  and controls retain KAY's system sans. The line-art SVG is decorative
  (`alt=""`) and uses restrained KAY gold strokes for the reference's villa,
  tree and ground scene. The secure band is a labeled region, not a dead
  button. The support address is a keyboard-reachable `mailto:` link, and the
  existing focus-visible treatment stays.
- Login inputs keep their existing labels and behavior; the requested
  reference-specific placeholders, trailing `ForwardIcon` and 56px submit
  control are presentation only. No API, validation, redirect, session or
  password-flow behavior changed.

The marketing/concept workflow of design-taste-frontend is out of scope for this
single internal sign-in surface. Design-system-ops governs the composition;
antislop applies during implementation under the explicit V3 task override.
Responsive and Uncodixfy guidance were applied without introducing a new UI kit,
typeface file, photo, animation or dependency. The compact-space request is a
directly selected change, not an AFTER-only audit finding; unrelated findings
remain unselected.

Skill evidence: design-system-ops guided the frame/track geometry and spacing;
the responsive skill guided the stacked/2-column/3-column breakpoints and narrow
width checks. The marketing-focused design-taste workflow does not apply to this
existing internal sign-in. Antislop's purpose test is met by the owner-supplied
KAY/real-estate reference; no decorative control, invented trust claim or
unrequested navigation was added.

## Verification

The current compact-frame captures use empty login fields and no credentials:

- `frontend/output/playwright/login-spacing-after-2048.png`: 2048 × 1152, full
  width with 12px side and 8px top/bottom insets; the footer ends 8px above the
  viewport edge. All three panels and footer content remain visible.
- `frontend/output/playwright/login-spacing-after-375.png`: 375px-wide full-page
  capture; panels stack in reading order and the support email remains visible.
- At 2048 × 1152, 1440 × 900, 1024 × 900 and 768 × 900, the page fits the
  viewport. At 320, 375, 768, 1024, 1280, 1440 and 2048px, document scroll width
  equals client width. The short 1280 × 720 viewport scrolls vertically to retain
  the full form/footer; no content is clipped.
- Inputs measure 48px, password visibility 44px and submit 56px. Keyboard Tab
  reaches the password field and Space toggles visibility both ways. Empty
  submit shows French client-side validation. The request list contains only
  page GETs and no authentication POST. Browser accessibility snapshot retains
  the named fields, submit control and support `mailto:` link; console has 0
  errors and 0 warnings. The existing visible-Chrome login regression passes
  1/1 in 48.4s on the isolated synthetic test target.

Final checks pass: `npm.cmd run lint`;
`.\node_modules\.bin\tsc.cmd --noEmit --incremental false`;
`npm.cmd run security:check` (0 runtime vulnerabilities; 9 existing dev-only
findings under the approved expiring exception);
`powershell -NoProfile -File docs/03-planning/validate-sprints.ps1`; and
`git diff --check`. The production build is not run because the user's Next.js
development server is active and uses the same `.next` directory. No
backend/API/session change, test actor, credential entry, database write,
deployment or publication is part of this
refinement. Product/design acceptance remains pending Khalid.
