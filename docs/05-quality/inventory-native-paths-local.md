# Standalone inventory native-path reconciliation

Prepared source checkpoint,2026-10-29. AT-06/08/23/27/31/39; browser execution and
actual-stack acceptance pending. This changes test paths, not production UI,
contracts, fixtures or permissions. Base is `98f77ab`.

## Current selected homes

| Old target | Current selected path |
| --- | --- |
| Standalone Aperçu tab | Single Informations du bien region; no visible one-tab switch |
| Offres tab and separate Vente/Location regions | Offres section, retained sale/rental prices and annual comparison, exact action labels per kind |
| Create campaign surface | Créer une offre de vente/location drawer; price, original period/conditions and existing create command |
| Inline availability reason/action | Exact per-kind action, Confirmer la disponibilité drawer and Motif de confirmation |
| Propriétaires tab/editor | Right Propriétaires section, Modifier, Propriétaires légaux drawer and labelled tonal entries |
| Historique tab | Actions then Historique drawer; current/retired campaigns and immutable facts stay visible |
| Prix demandés overview | Current Offres section and its exact money values |
| Property edit link | Header Modifier link, separate from owner/offer edit buttons |
| Category checkboxes | Current single-category radios; all category choices still checked for presence before selecting Local commercial |
| Property wizard sequential-only helper | Selected clickable stepper, current-step attribute; save still performs full production validation |
| Interrupted edit with editable replacement fields | Frozen review/recovery marker and disabled step controls; original-operation retry action |
| Automatic conflict snapshot region | Explicit fresh compare, current version section and retained draft/keep choice |
| Attached documents in overview | Header Documents drawer and current empty-state copy |

`tests/helpers/inventory.ts` targets these actual components rather than
restoring old tabs. `openProperty`'s optional section name is a test navigation
target, not an assertion that a tab exists. Original API-created empty-property
fixture purpose remains: campaign lifecycle tests need no initial offering. The
selected standalone creation wizard has separate coverage.

Seven `tests/e2e/inventory.spec.ts` scenarios retain their session/logout,
hold/release, legal owner, exact sale/rental/annual money, unrelated agent privacy,
403/404, category/incomplete draft, positive-price, exactly-once history,
real-outage and conflict/role-revocation assertions. Missing-owner/price failures
stay in their own availability drawers; leaving typed failed forms explicitly
confirms discard before the next action. No successful command response or new
timeout is substituted. The one held-owner test title now says drawer controls
instead of tabs because those standalone tabs were intentionally removed.

## Evidence and limits

Focused ESLint and full frontend typecheck pass. A TypeScript AST source check
confirms all3 direct `staffCommand` calls with their exact arguments, all6
`test.setTimeout` settings and all3 `apiProcess` calls are unchanged. Seven tests
remain; only the specified purpose title changes. No old standalone Offres/
Propriétaires/Historique/Aperçu tab/tabpanel target remains in this file.

These are source checks only. No Playwright listing/import/execution, real
account, DB/service/outage control, browser capture, worker/file transfer,
migration, main edit, push/merge/deployment or alternate access occurred.
Production unchanged; prior977 frontend units/lint/build/history and573 backend
connection-forbidden units are retained, not rerun. Frontend typechecking is
rerun for the changed native source.

The shared inventory helper has8 direct consumer files: development, files,
inventory, owners, project permissions, property edit wizard, visible files
Chrome and visible inventory Chrome. This checkpoint prepares the standalone
inventory file and helper functions only. Other consumers' old selectors,
development helpers, actual device/zoom/focus/SQL/CI/security/AFTER/product checks
and full field/job/alias reconciliation remain pending; none is certified by
compilation. [Evidence](../03-planning/design-migration-evidence/inventory-native-paths-2026-10-29.json).


## Agent permission follow-through,2026-10-29

Two project-permission source cases now use current Modifier links and actual
Offres/Propriétaires action names. Absence checks scope the real create-offer and
owner-edit controls, avoiding a pass against obsolete labels. Unit editing uses
the distinct Modifier l’unité form/save label through the shared helper. Locked
placement is checked at its first-step home, including exactly3 disabled selectors,
before navigating to editable surface. Existing stock/hierarchy equality and
private developer/404 assertions remain. Two titles,2 direct business commands
and2 timeouts are AST-identical to base094fa5f. Focused ESLint/full types pass;
actual native/SQL/permission verification remains unrun. Production and prior
977 frontend/573 backend evidence unchanged. Other helper consumers remain open.
[Evidence](../03-planning/design-migration-evidence/inventory-permission-paths-2026-10-29.json).
