# Programme structure and unit native-path reconciliation

Prepared source checkpoint,2026-10-29. AT-23/31/32/35/36/41; actual native/SQL and
product acceptance pending. Production and API/business contracts unchanged.
Base `32ec3ee`; no tests are executed through Playwright in this checkpoint.

## Selected source map

| Previous target | Selected home and prepared path |
| --- | --- |
| Reference as programme page heading | Programme name in h1, with reference retained in main record context |
| Plain visible step text | Accessible creation stepper current-step attribute across the same three stages |
| Exact Unités tab without count | Scoped programme tablist and counted Unités label |
| Inline unit availability/structure filters | Filtres des unités drawer, current Disponibilité/Bloc/Étage/Type réutilisable labels and Appliquer |
| Blocs et étages/Types réutilisables root tabs | Unités → Structure du programme drawer; internal Blocs et étages/Types tabs |
| Explorer block | Étages de the exact block; floor creation remains bound to it |
| Separate block/floor/type field labels | Scoped exact hierarchy form with Code/Libellé, surface defaults and Enregistrer |
| Leaving a saved hierarchy editor | Wait for form completion, then close Structure du programme before the next external action |
| Selecting another element while dirty | Retour, explicit discard confirmation, then select the new element; no silent draft replacement |
| Présentation and Offres du programme root tabs | Selected overview sections; offer creation and exact availability drawers |
| Modifier le programme page link | Header Modifier, retaining the existing full programme editor |
| Editable/re-sent unknown save | Retained disabled original fields and same-operation retry before and after the existing outage |
| Exception conflict snapshot region | Explicit current comparison, exact current version section and keep-draft choice |
| Old three-step physical unit creator | Current five-step Créer une unité drawer; apartment placement validation at first step |
| Unit breadcrumb | Rattachement au programme section and exact canonical programme link |

The programme helper preserves its reference/name/category fixture values and
returns the name in addition to existing ID/reference/path. Structure helpers
scope current form controls and close the drawer after success. The unit helper
retains existing block/floor/type selection, original price and per-unit surface;
no API fixture replaces the selected UI path. Historical optional section names
in `openDevelopment` describe test navigation destinations, not restored tabs.

Five existing development scenarios retain actual mixed-unit independence,
reusable defaults versus existing surfaces, availability/whole-programme stock,
safe optional plain-text briefing, private identities/404/403, role-authorized
hierarchy writes, exact counters/retry/outage, invalid focus and selected editor
identity. Incomplete apartment data stays visible until explicit cancellation;
the invalid type does not create an inventory row or a unit-type offering.

## Checks and limits

Focused ESLint and full frontend typecheck pass. TypeScript AST comparison
against the base confirms all5 titles, all3 direct `staffCommand` calls and
arguments, all4 explicit timeouts and all3 `apiProcess` calls unchanged. No
obsolete root structure/presentation/whole-offer tab target remains in that
scenario file. Source review also checks initial save → interrupted response →
same-operation retry ordering; a broad replacement mismatch was corrected before
the final gates, and compilation alone is not treated as sequence proof.

No new mirrored unit, mock write success, timeout increase, production edit or
actual service/outage operation. Prior977 frontend units/lint/build/history and
573 backend connection-forbidden units retained, not rerun. The changed native
source receives its own fresh lint/typecheck; it is prepared only.

The development helper has8 direct consumers: development, files, photo resume,
project permissions, property photos, record removal, visible acceptance Chrome
and visible development Chrome. Their wider paths are not certified. The shared
inventory helper's other consumers also remain pending. No Playwright listing/
import/execution, actual app/browser/HTTP/DB/account/private config/service/file/
worker/transfer or alternate access, migration/main/push/merge/deploy occurred.
Actual SQL/native/device/focus/zoom/security/CI/AFTER/product gates,
migrations0036/0037 and remaining exact field/job/alias/selector reconciliation
stay open. [Evidence](../03-planning/design-migration-evidence/development-native-paths-2026-10-29.json).


## Visible programme caller,2026-10-30

The existing SP08 visible review now follows the selected Structure du programme
drawer, its Blocs et étages/Types tabs, Étages de/Unités de links, scoped type
form and current labels/save/Retour. Floor linkage remains in the actual route.
Unit count tabs accept their count, filters use the real drawer/Disponibilité/
Appliquer and current result status. The row capture targets its original unit
link on desktop and the mobile card on phones. Programme editing verifies the
actual saved name and retained reference; filter/structure panels close before
subsequent actions. Keyboard, real200% zoom, overflow, author/agent briefing and
loading/error/retry requests remain. Capture preflight admits the hydrated
notification control behind its active modal.

All original17 protected fixture/route-fault/timeout/CDP calls and its title are
AST-identical. Focused ESLint/full types pass; production unchanged, no native
listing/import/execution/capture/zoom/account/DB/service control. Actual device/
SQL/security/CI/AFTER/product acceptance and wider historical paths remain open.
[Review evidence](../03-planning/design-migration-evidence/inventory-review-paths-2026-10-30.json).
