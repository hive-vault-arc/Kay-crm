# SP-01 execution record

Date: 2026-10-14. Scope: C13/C14, BR-22, AT-23 setup variants only.
Product review: pending Khalid's review.

## Focused E2E defined before implementation

No users, credentials, CRM records or database are required. The actor is a visitor
viewing the explicitly labeled local shell preview.

1. Opening `/` reaches the French `/login` entry. It explains that authentication
   is pending and offers an explicit navigation preview without collecting secrets.
2. Opening the preview reaches `/dashboard`. It shows no invented KPI values,
   contact rows, authenticated identity or successful business operations.
3. Desktop navigation identifies the current destination. Planned Leads, Deals,
   Visit Calendar and Projects destinations show truthful unavailable/empty states.
   Settings remains visibly unavailable until administrator authorization exists.
4. At 320, 360, 768, 1024 and 1440 CSS px, the page has no horizontal overflow.
   Long French copy wraps. Touch targets, skip link and focus remain usable.
5. On mobile, keyboard Enter opens the shadcn/Radix navigation sheet; Tab stays
   inside; Escape closes it and returns focus to the trigger. Selecting a page
   closes the sheet and moves focus to the new page heading.
6. Exercise loading, empty and recoverable error components with the real rendered
   stack. Test-only state fixtures are isolated from normal product navigation.
7. Unknown paths show a French not-found view with a working recovery link.
8. Inspect console/network and assert no unexpected errors, failed requests,
   remote fonts or fabricated `/api/v1` success responses.
9. Run the same shell interaction headed in installed Chrome, at desktop/mobile
   widths and real browser zoom 200%, and capture safe screenshots.

Backend, migrations, records, authorization, retries and database races are N/A
for SP-01. Their implementations begin in later sprints.

## Runtime and installed versions

Verified 2026-10-14 on this Windows laptop, synthetic data only. Commands below
run in `frontend/` unless stated otherwise.

Node 24.13.1; npm 11.8.0; Git 2.53.0.windows.1; Next.js/eslint-config-next 16.4.0;
React/react-dom 19.3.1; Tailwind/@tailwindcss/postcss 4.3.3; TypeScript 5.9.3;
Playwright 1.64.1; shadcn CLI 4.21.5; Radix 1.8.1; Lucide 1.57.0;
RHF 7.90.0; resolvers 5.9.1; Zod 4.6.7; TanStack Table 8.21.3.
All direct package versions and the complete resolved tree are in package-lock.json.
Installed Chrome 155.0.8059.79 and Edge 155.0.4283.45 were used. Playwright installed
Chromium 156.0.8078.4/revision 1248, Firefox 157/revision 1555 and WebKit 27.2/revision 2370.

## Execution results

| Check | Exact command / observation | Actual result |
|---|---|---|
| Root repository | `git init` in project root; `Test-Path frontend/.git` | One root repository; no nested repository. No commit/push created. |
| Private exclusion | `git check-ignore docs/03-planning/local-database-credentials.md` and `git ls-files` for that path | Ignored and not tracked. Its contents were not read for SP-01. |
| Locked reinstall | `npm ci` after source/dependencies were established | Exit 0; 674 packages installed from the lock. |
| Development | `npm run dev` | Real Next server at localhost:3000; French entry and shell opened/interacted with. |
| Lint | `npm run lint` | Exit 0, zero warnings. Checks source, tests and root configuration; generated caches excluded. |
| Types | `npm run typecheck` | Exit 0. Fresh `next typegen` plus strict `tsc --noEmit`. Transient dev/E2E validators excluded to avoid stale deleted-route references; normal generated route types are checked. |
| Build | `npm run build` | Exit 0; optimized Turbopack build and Next TypeScript checks passed. |
| Browser installation | `npx playwright install chromium firefox webkit` | Exit 0; all three engine downloads installed. |
| Running-stack E2E | `npm run test:e2e` | 30/30 passed, zero skipped: six cases on Chromium, installed Chrome, installed Edge, Firefox and WebKit. |
| Visible Chrome | `npm run test:chrome` | 7/7 passed, zero skipped. Actual headed installed Chrome, ephemeral synthetic contexts and a disposable zoom profile. |
| Production server | `npm run start` | Built app served on localhost:3000, bound locally. |
| Production E2E | Set `PLAYWRIGHT_BASE_URL=http://localhost:3000`, then `npm run test:e2e -- --project=chrome --grep '@shell'`; unset variable | 4/4 passed: French entry/links, sheet keyboard/focus, width matrix, unknown route recovery. |
| Test fixture gate | Request `/ui-checks` on the production server | Unavailable view, no check form rendered. The fixture is enabled only by Playwright's development server. |
| Runtime dependency audit | `npm audit --omit=dev` | Exit 0; zero runtime vulnerabilities. Full development audit risk is recorded below. |
| Documentation validation | Root: `powershell -NoProfile -File docs/03-planning/validate-sprints.ps1` | Exit 0 after implementation/status updates: 22 sprint specifications, 963 local links/anchors including 70 skill links, 41 AT mappings, 13 synchronized Mermaid pairs and 9 valid API JSON examples. Documentation-only check. |
| Contrast | Calculate luminance from the actual JSON token pairs | Body 14.08:1, secondary 6.11:1, button 14.94:1, selection 12.75:1, info 6.16:1, danger 6.73:1, focus 6.50:1. |

The focused tests precede implementation in this record. Test files are
`frontend/tests/e2e/shell.spec.ts`, `foundation.spec.ts` and
`frontend/tests/review/chrome.spec.ts`. They use the real Next server; no successful
CRM API response or database fixture is substituted.

## Browser and state observations

- Entry → explicit preview → each named implemented destination; active navigation
  uses `aria-current=page`. Settings is unavailable, and direct `/settings` shows the
  unavailable page. No role or account is invented.
- At 320/360/768/1024/1440 CSS px, long French labels wrap and the document does not
  overflow horizontally. Menu/close controls have 44 px targets. The headed review
  also taps the sheet and destination in a touch context at 360×800.
- Keyboard Enter opens the sheet; twelve Tab moves stay inside; Escape returns to
  the trigger; selecting a destination closes it and focuses that destination's heading.
- Shared loading/empty/error components render on the gated test page; empty table
  text, invalid French field message/ARIA, valid metadata handling and real Next
  error-boundary reset pass. No business save is claimed by that form.
- Real 200% browser zoom uses only a generated profile under test-results. Measured
  baseline DPR 2 / innerWidth 1427, zoom DPR 4 / innerWidth 713, overflow false;
  opening/Escape/focus works at that zoom. This is not a pinch-scale substitute.
- Unexpected page/transport errors are absent on normal shell paths. Expected
  superseded RSC request cancellations and synthetic error-fixture exceptions are
  identified separately. DevTools inspection also found no normal-shell console
  warnings/errors; requests are local, with no remote fonts or business API calls.
- Production favicon SVG returns 200. Its transparent placeholder avoids supplying
  an unapproved brand mark. The earlier metadata-204 response error was removed.

Safe screenshots are generated in ignored `frontend/output/playwright/`:
`sp01-desktop.png` (1440×900), `sp01-mobile.png`, `sp01-mobile-sheet.png` (360×800),
and `sp01-zoom-200.png`. Browser reports/traces are ignored and overwritten on rerun.
High-DPI zoom screenshot cropping is an artifact limitation; the measured browser
interaction and desktop/mobile captures provide the separate evidence described above.

## UI skill and system evidence

All three installed skill files were read: antislop, design-system-ops and
design-taste-frontend at the paths linked by SP-01. The four relevant geometry,
component anatomy, responsive/accessibility and visual-quality references from
design-system-ops were also read. KAY's supplied logo references were viewed.

design-system-ops governed KAY's 240 px rail, token radii/spacing, touch anatomy,
responsive gutters, one-column mobile layout and sheet. Semantic colors originate
in the root branding JSON; the local adapter prevents a duplicate palette. Two
readable-width tokens (32rem entry, 42rem explanatory text) are reusable frontend
system extensions. Sheet overlay is the only elevated surface. Source comments
explain the safe-area/theme/reduced-motion CSS exceptions.

The shell, dashboard placeholder and form/table/admin foundations are outside
design-taste-frontend's stated marketing scope. No marketing hero, generated photo,
forced animation, different component kit, icon family or dark theme was added.
Bklit has a registry entry reserved for SP-17; SP-01 has no chart to render.

The eight used shadcn primitives are Button, Sheet, Skeleton, Alert, Input, Label,
Form and Table. CLI 4.21.5 generated source under the manual New York/Radix config;
local adaptations cover French close text, 44/48 px controls, token mappings,
wrapping and a local class helper. RHF/Zod and TanStack integrations execute on the
gated test page. TanStack v8 is explicitly outside compiler memoization, with one
documented local lint directive rather than disabling hooks rules globally.

AFTER audit: [audit-001](../../../anti-slop/audit-001-2026-10-14.md), no numbered
aesthetic findings. No selection was requested or invented. Product/design review
remains pending Khalid. C01-C14 business acceptance is not implied by AT-23 setup.

## Security review and remaining risk

Applicable boundaries: local configuration, dependency supply chain, client API
boundary, generated evidence and public preview. Root/private-note and runtime
exclusions were checked. No supplied database password, environment secret, real
record, auth cookie or one-time credential was read, generated, logged or committed.
Both servers bind to localhost. There is no backend, database write, session,
privileged role, external messaging, deployment or file transfer in this sprint.
Authorization, CSRF, database races, migrations and Ruff/mypy/pytest are explicitly N/A.

`npm audit` reports nine high development-tree advisory entries, all derived from
the braces/micromatch/fast-glob stack-exhaustion advisory GHSA-vfj7-8cjw-p6xm in the
Next ESLint/shadcn tooling chain. Registry verification found braces 3.0.3 remains
the available release. No patched compatible update was identified; `--force`
proposed incompatible Next/shadcn downgrades and was not run. These tools receive
only trusted local patterns/registries during SP-01; there is no runtime exposure
in the production dependency audit. Keep this recorded local-tooling risk under
review; do not call the full development audit clean. ESLint 9 also emits an upstream
support warning. Real-data/production release remains outside this local sprint.

Real iPhone/Safari, assistive-technology user testing, final font/logo approval,
business roles and all later CRM workflows remain unverified. WebKit on Windows
and touch emulation do not count as actual iOS tests.

## Defects resolved and handoff

Fixed shared-token bundling root, typed theme mapping, TanStack compiler lint
boundary, keyboard hydration readiness, dev/production destination focus timing,
stale generated dev type references and the favicon metadata response. The relevant
checks were rerun; no technical failure remains in SP-01's applicable workflow.
The navigation correction is saved in docs/AGENT_LESSONS.md.

The Next.js-generated agent block remains with an explicit root-KAY precedence
note. The default generator page/logos/favicon were replaced/removed; project
reference/branding assets were preserved. No optional skill bundle was installed.
No source commit or external publication was made. The next authorized roadmap
item is SP-02; this request implements SP-01 only.
