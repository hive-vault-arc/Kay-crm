# Iconsax migration — actual verification

2026-10-16. UI-only source migration complete. Final compiled frontend build:
`RwDP2Y1QOEhxHVxEwM5Zg`. [Coverage and integration](migration.md),
[machine-readable source/evidence index](coverage.json), [asset provenance](assets.json).
Human product acceptance and deployment are not implied.

## Commands and results

Run npm commands from `frontend/`. For compiled browser runs, temporarily set
`KAY_E2E_PRODUCTION=1` and `KAY_ICON_REVIEW=1`, restore both prior environment
values in finally, and propagate the real runner exit code. Test writers run
serially with the existing exclusive isolated-database lease; private reporter,
traces off, explicit safe screenshots and synthetic actors remain enabled.

| Actual check | Result |
|---|---|
| `npm run lint` (includes `node scripts/icon-inventory.mjs --check`) | Final exit0;27 exports/21 consumers/40 sites/3 chart SVG roots excluded/0 violations; ESLint0 warnings |
| `npm run typecheck` | Final exit0; Next route generation and TypeScript pass |
| `npm run build` | Exit0; compiled and prerendered successfully; current build ID above |
| `node scripts/icon-inventory.mjs` and `node scripts/ui-coverage.mjs` |21 consumers/40 icon sites,29 routes/168 contextual/111 region sites; no interface SVG outside layer |
| Dependency/lock/installed-folder inspection | Lucide absent from dependency manifest, lockfile and installed packages; official browser-only Iconsax runtime not installed |
| First production headed run below |16/17 pass,1 failed,0 skipped,8.8m; no application regression: newly added minimum-icon assertion rejected the icon-free password-change screen |
| Corrected production rerun below |3/3 pass,0 skipped,1.5m; failed V3 case + both icon-specific cases rerun fresh |
| Development-only foundation below |1/1 pass,0 skipped,26.1s total; actual loading/error boundary/invalid/retry/shared icons |
| Exact consumer-source comparison |All21 match their pre-edit source after only import paths and imported icon identifiers are replaced; no field/copy/action/layout changes |
| SHA-256 preservation checks |279 baseline backend Python files unchanged;58 Bklit files +4 existing public media/favicon files +9 branding files unchanged |
| `node scripts/scan-client-secrets.mjs` | Final exit0;4 roots/321 browser JS files/0 facade-secret matches/1 configured signing key/0 signing-key matches; no secret printed |
| PNG signature/dimension checks |58 migration-folder PNGs valid;0 malformed/undersized frames |
| Guarded cleanup and shutdown |1 synthetic row and1 synthetic orphan object removed;66 test record tables empty/bootstrap unset. Development read-only unchanged/empty/default policy. Project listeners0, task-started ClamAV stopped/cache retained; shared PostgreSQL preserved |

First compiled command:

```powershell
npm run test:chrome -- tests/review/iconsax.chrome.spec.ts tests/review/v3.chrome.spec.ts tests/e2e/shell.spec.ts tests/review/requirements.chrome.spec.ts tests/review/finance.chrome.spec.ts tests/review/inventory.chrome.spec.ts tests/review/reports.chrome.spec.ts tests/review/schedule.chrome.spec.ts tests/review/work.chrome.spec.ts tests/review/intake.chrome.spec.ts tests/review/leads.chrome.spec.ts --max-failures=2
```

Fresh corrected compiled command:

```powershell
npm run test:chrome -- tests/review/v3.chrome.spec.ts tests/review/iconsax.chrome.spec.ts --grep 'nine compositions|Iconsax:' --max-failures=1
```

Development-only command (temporarily `KAY_E2E_PRODUCTION=0`, restored afterward):

```powershell
npm run test:chrome -- tests/e2e/foundation.spec.ts --grep 'live shadcn' --max-failures=1
```

There are **18 unique passing cases across these corrected commands**, not one
clean18-case invocation. Initial false-positive failure is retained at
`frontend/output/playwright/iconsax/first-run-failure/v3-error-context.md`.
An initial typecheck also caught an omitted SearchIcon export, and a later lint
caught the inventory script's reserved module variable; both were corrected and
the final lint/typecheck rerun. No failed check is relabelled a pass.

## Browser and surface evidence

Actual visible isolated Google Chrome155.0.8059.79, headed, serial, real compiled
Next/FastAPI/PostgreSQL/ClamAV stack with disposable synthetic actors. The55 V3
composition/context captures are separate from earlier V3 evidence:
`frontend/output/playwright/iconsax/captures.json` records each capture's visible
semantic names and0 unexpected browser errors/0 external icon requests.24 of27
semantic names appear in these actual page captures; password-hide is exercised
by the real login toggle, error glyph by the real development boundary, and the
generic empty-folder branch by the isolated component fixture. All27 are also
rendered and inspected in the synthetic offline fixture. The generic empty-folder
branch currently has no feature caller; it is not a newly invented workflow.

The static server test renders every export with decorative and labelled props,
checks exact path counts/viewBoxes, no IDs/scripts/use/image/external references,
and accessible roles/names. The browser checks nonempty painted paths, dimensions,
inherited computed stroke colors, decorative aria-hidden/unfocusable behavior,
and absence of old Lucide SVGs. Every glyph renders offline with0 requests.
Real Next response HTML contains login and authenticated shell SVGs before JS;
login icons remain visible with JavaScript disabled. Hydration/toggles and normal
session sign-in/out continue to work. No web-component loader or JSON/CDN asset
path is required, so there is no remote-icon loading/failure dependency to mask.

The route/context case covers all nine V3 families plus contact tabs, import,
exports, audit, lead/deal create/edit, project/property create/edit, staff forms,
working hours, finance form, task form, project tabs, search and notifications.
The native cases additionally cover visit details, current requirement checkmarks,
column checkboxes, denied/archive/conflict/retained-error/retry states, real
protected clean image loading and synthetic intake. The development-only route
and error boundary are separately exercised. All29 route-source families have
source and running-family coverage; this is not every business permission/state
permutation or an extra screenshot for each of168 nested sites.

Responsive checks use320/360/390/768/1024/1440px, touch and keyboard, mobile Sheet
containment/Escape/focus return, readable inherited colors, no page/dialog
horizontal overflow, existing44px targets and actual native200% Chrome zoom
(DPR2→4, viewport1427→713). V3 case also checks reduced motion. Native report
checks exercise Bklit keyboard/touch interactions without changing chart geometry.

Main-agent visual inspection covered the complete27-glyph fixture and
representative V3/login/dashboard/list/form/record/calendar/card/admin and
unpictured finance/task/project/search/notification/mobile/development frames.
Existing V3 composition, neutral forms, status colors and stacked records are
retained; system font/original logo remain the prior approved-scope adaptations.
The first raw full-page CDP capture showed a transient unpainted logo; the capture
helper now uses Playwright's native screenshot stabilization, and the final Lead
form was reopened with the real logo painted. No logo/UI source was changed.
All55 final composition files were refreshed; no screenshot is used as UI code.

## Scope/security and remaining limits

No backend, migrations, APIs, business rules, permissions, authentication contract,
real-data operation, deployed service, production access or external send changed.
Only selected verified Free asset paths are embedded, with notices retained; no
icon package was fetched/executed at runtime and no premium entitlement is claimed.
The test supervisor cleans its exact services; final listeners3100/8100/8101/8102/
8200/3310 are0. Shared PostgreSQL5432 and unrelated Docker resources are untouched.

This task freshly verifies Chrome only, not a new cross-browser/full134-case
acceptance/load/recovery run, physical-phone/soft-keyboard behavior or formal
screen-reader certification. Existing nonfatal Windows Proactor10054 disconnect
warnings appeared during service restarts; affected cases still passed. The Next
development error badge in the deliberate crash capture is framework UI, not an
application-owned icon to migrate. Wider DESIGN.md merge and human product review
remain separate. No unresolved missing icon, SSR/hydration or layout failure was
found within the tested migration scope. Antislop/system guidance kept this a
semantic icon replacement; no unselected AFTER-only aesthetic finding was applied.
