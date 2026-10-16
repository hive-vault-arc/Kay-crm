# Approved V3 route and surface coverage

2026-10-16. Current read-only AST inventory: **29 route source files and 168
contextual sites**. Before implementation:29/166. The two added sites are the
shell's existing inbox displayed in a real notification Sheet, not a new business
feature. All existing routes were included, not only the nine pictured screens.
The supplementary index accounts for111 overlapping context-region/disclosure
sites in71 files, including components not named Panel. Counts are source sites,
not distinct screens or a claim of one screenshot per nested state.

A checked row means its V3/shared presentation was implemented and reviewed in
the source inventory. The evidence column identifies actual family captures or
workflow tests, **not an assertion that every dialog, state and permission
permutation received an individual screenshot or that every test command
passed**. Captures are synthetic. See [execution.md](execution.md) for exact
results, corrected failures and remaining limitations. Screenshots are under
`frontend/output/playwright/v3/`; `captures.json` lists all55 final frames.
The current cumulative77-case result is recorded in execution, not inferred here.

## Routes

| Applied | Route | Source (frontend/) | V3 pattern | Running evidence |
|---|---|---|---|---|
| [x] | `/[section]` | `src/app/(workspace)/[section]/page.tsx` | 02-dashboard | `02-dashboard`; native reports; shell fallback check |
| [x] | `/contacts/[id]` | `src/app/(workspace)/contacts/[id]/page.tsx` | 05-lead-details | `contact-record`, `contact-tab-*`, `task-form`; SP06/SP10/SP15 |
| [x] | `/deals/[id]` | `src/app/(workspace)/deals/[id]/page.tsx` | 05-lead-details | `deal-record`, `finance-empty`, `commission-form`; native SP11/SP16; SP12/SP13 |
| [x] | `/deals/new` | `src/app/(workspace)/deals/new/page.tsx` | 04-create-or-edit-lead | `deal-create`; native SP11 |
| [x] | `/deals` | `src/app/(workspace)/deals/page.tsx` | 03-leads-and-deals-list | `03-deals`; native SP11 |
| [x] | `/leads/[id]/edit` | `src/app/(workspace)/leads/[id]/edit/page.tsx` | 04-create-or-edit-lead | `lead-edit`; native Leads |
| [x] | `/leads/[id]` | `src/app/(workspace)/leads/[id]/page.tsx` | 05-lead-details | `05-lead-record`, `lead-record-mobile`; native Leads |
| [x] | `/leads/new` | `src/app/(workspace)/leads/new/page.tsx` | 04-create-or-edit-lead | `04-lead-form`, `lead-form-mobile`; native Leads |
| [x] | `/leads` | `src/app/(workspace)/leads/page.tsx` | 03-leads-and-deals-list | `03-leads`, `contacts-list`, `contact-import`, `exports`; SP18/SP19 |
| [x] | `/projects/[id]/edit` | `src/app/(workspace)/projects/[id]/edit/page.tsx` | 04-create-or-edit-lead | `project-edit`; SP08 |
| [x] | `/projects/[id]` | `src/app/(workspace)/projects/[id]/page.tsx` | 08-project-details | `08-project-record`, `08-project-units`, `project-tab-*`; SP08 |
| [x] | `/projects/new` | `src/app/(workspace)/projects/new/page.tsx` | 04-create-or-edit-lead | `project-create`; SP08 |
| [x] | `/projects` | `src/app/(workspace)/projects/page.tsx` | 07-projects | `07-projects`, `inventory-mobile`; native SP07 |
| [x] | `/projects/properties/[id]/edit` | `src/app/(workspace)/projects/properties/[id]/edit/page.tsx` | 04-create-or-edit-lead | `property-edit`; native SP07 |
| [x] | `/projects/properties/[id]` | `src/app/(workspace)/projects/properties/[id]/page.tsx` | 08-project-details | `property-record`; native SP07 |
| [x] | `/projects/properties/new` | `src/app/(workspace)/projects/properties/new/page.tsx` | 04-create-or-edit-lead | `property-create`; native SP07 |
| [x] | `/settings` | `src/app/(workspace)/settings/page.tsx` | 09-all-users | `settings`; shared administration |
| [x] | `/settings/users/[id]/edit` | `src/app/(workspace)/settings/users/[id]/edit/page.tsx` | 09-all-users | `staff-edit`; SP04 |
| [x] | `/settings/users/new` | `src/app/(workspace)/settings/users/new/page.tsx` | 09-all-users | `staff-create`; SP04 |
| [x] | `/settings/users` | `src/app/(workspace)/settings/users/page.tsx` | 09-all-users | `09-users`; SP04; accessible e-mail description |
| [x] | `/settings/working-hours` | `src/app/(workspace)/settings/working-hours/page.tsx` | 09-all-users | `working-hours`; native SP14 |
| [x] | `/ui-checks` | `src/app/(workspace)/ui-checks/page.tsx` | 02-dashboard | development-only foundation case (1/1) |
| [x] | `/visits/[id]` | `src/app/(workspace)/visits/[id]/page.tsx` | 04-create-or-edit-lead | native SP14 reschedule/cancel/outcome; SP14 matrix |
| [x] | `/visits/new` | `src/app/(workspace)/visits/new/page.tsx` | 04-create-or-edit-lead | `visit-create`; native SP14 |
| [x] | `/visits` | `src/app/(workspace)/visits/page.tsx` | 06-visits-calendar | `06-calendar`, `calendar-dense-overlap`; native SP14 |
| [x] | `/change-password` | `src/app/change-password/page.tsx` | 01-login | `change-password`; AT26/39 authentication |
| [x] | `/login` | `src/app/login/page.tsx` | 01-login | `01-login`; password visibility; AT26/39 authentication |
| [x] | `/` | `src/app/page.tsx` | 02-dashboard | authentication/root redirect; shell entry check |
| [x] | `/website-simulator` | `src/app/website-simulator/page.tsx` | 04-create-or-edit-lead | native SP20 synthetic form/receipt/error; SP20 matrix |

`/[section]` resolves the existing dashboard plus guarded fallback. `/`
redirects. Query surfaces include Leads contacts/import/exports/archive and
Dashboard audit. Contact task deep links remain contextual. API facade routes
are unchanged and are not visual pages. No new business route was invented.

## Contextual surfaces

Source lines below are the final source inventory, not the old baseline lines.
Repeated components at different call sites are intentionally recorded. Dynamic
data does not create new routes or grant access. These sites inherit the same
shared control/state system; the referenced tests exercise representative allowed,
denied, invalid, conflict, interruption and retry paths for their domain.

| Applied | Source (frontend/) and line | Surface | Labels | V3 pattern | Family evidence |
|---|---|---|---|---|---|
| [x] | `src/features/auth/change-password-form.tsx:37` | form |  | 01-login | V3 auth / AT26/39 |
| [x] | `src/features/auth/login-form.tsx:34` | form |  | 01-login | V3 auth / AT26/39 |
| [x] | `src/features/checks/foundation-check.tsx:48` | form |  | 05-lead-details | development foundation |
| [x] | `src/features/contacts/column-chooser.tsx:33` | SheetContent |  | 03-leads-and-deals-list | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/column-chooser.tsx:34` | fieldset |  | 03-leads-and-deals-list | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-directory.tsx:24` | form |  | 03-leads-and-deals-list | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-editor.tsx:32` | form |  | 04-create-or-edit-lead | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-editor.tsx:33` | fieldset |  | 04-create-or-edit-lead | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-fields.tsx:35` | fieldset |  | 04-create-or-edit-lead | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-fields.tsx:47` | fieldset |  | 04-create-or-edit-lead | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-fields.tsx:57` | fieldset |  | 04-create-or-edit-lead | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-history.tsx:40` | form |  | 05-lead-details | contact tabs / SP06 |
| [x] | `src/features/contacts/contact-history.tsx:43` | fieldset |  | 05-lead-details | contact tabs / SP06 |
| [x] | `src/features/contacts/contact-record.tsx:47` | TabsTrigger | identity | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-record.tsx:48` | TabsTrigger | enquiries | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-record.tsx:49` | TabsTrigger | timeline | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-record.tsx:50` | TabsTrigger | assignments | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-record.tsx:51` | TabsTrigger | documents | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-record.tsx:52` | TabsTrigger | requirements | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-record.tsx:53` | TabsTrigger | deals | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-record.tsx:54` | TabsTrigger | tasks | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-record.tsx:56` | TabsContent | identity | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-record.tsx:64` | TabsContent | enquiries | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-record.tsx:65` | TabsContent | timeline | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-record.tsx:66` | TabsContent | assignments | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-record.tsx:67` | TabsContent | documents | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-record.tsx:67` | FilePanel |  | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-record.tsx:68` | TabsContent | requirements | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-record.tsx:68` | RequirementPanel |  | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-record.tsx:69` | TabsContent | deals | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-record.tsx:70` | TabsContent | tasks | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/contact-record.tsx:70` | TaskPanel |  | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/enquiry-assignment.tsx:33` | form |  | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/enquiry-assignment.tsx:34` | fieldset |  | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/lead-create.tsx:67` | form |  | 04-create-or-edit-lead | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/lead-create.tsx:68` | fieldset |  | 04-create-or-edit-lead | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/lead-create.tsx:72` | fieldset |  | 04-create-or-edit-lead | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/lead-editor.tsx:35` | form |  | 04-create-or-edit-lead | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/lead-editor.tsx:37` | fieldset |  | 04-create-or-edit-lead | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/lead-list.tsx:45` | form | Recherche et filtres des Leads | 03-leads-and-deals-list | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/lead-list.tsx:46` | fieldset |  | 03-leads-and-deals-list | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/lead-record.tsx:33` | RequirementPanel |  | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/contacts/ownership-controls.tsx:69` | form |  | 05-lead-details | contact tabs / SP06 |
| [x] | `src/features/contacts/ownership-controls.tsx:72` | fieldset |  | 05-lead-details | contact tabs / SP06 |
| [x] | `src/features/contacts/ownership-controls.tsx:86` | AlertDialogContent |  | 05-lead-details | contact tabs / SP06 |
| [x] | `src/features/contacts/record-states.tsx:18` | AlertDialogContent |  | 05-lead-details | V3 contact/Lead + native Leads |
| [x] | `src/features/deals/columns.tsx:26` | SheetContent |  | 03-leads-and-deals-list | native SP11 + SP12/SP13 |
| [x] | `src/features/deals/columns.tsx:26` | fieldset |  | 03-leads-and-deals-list | native SP11 + SP12/SP13 |
| [x] | `src/features/deals/customer-offers.tsx:30` | form | {value ? "Modifier une proposition client" : "Nouvelle proposition client"} | 05-lead-details | native SP11 + SP12/SP13 |
| [x] | `src/features/deals/customer-offers.tsx:30` | fieldset |  | 05-lead-details | native SP11 + SP12/SP13 |
| [x] | `src/features/deals/deal-create.tsx:18` | fieldset |  | 04-create-or-edit-lead | native SP11 + SP12/SP13 |
| [x] | `src/features/deals/deal-form.tsx:39` | form | {value ? "Modifier l’affaire" : "Nouvelle affaire"} | 04-create-or-edit-lead | native SP11 + SP12/SP13 |
| [x] | `src/features/deals/deal-form.tsx:39` | fieldset |  | 04-create-or-edit-lead | native SP11 + SP12/SP13 |
| [x] | `src/features/deals/deal-list.tsx:36` | form | Recherche et filtres des affaires | 03-leads-and-deals-list | native SP11 + SP12/SP13 |
| [x] | `src/features/deals/deal-list.tsx:36` | fieldset |  | 03-leads-and-deals-list | native SP11 + SP12/SP13 |
| [x] | `src/features/deals/deal-record.tsx:49` | ReservationPanel |  | 05-lead-details | native SP11 + SP12/SP13 |
| [x] | `src/features/deals/deal-record.tsx:50` | OutcomePanel |  | 05-lead-details | native SP11 + SP12/SP13 |
| [x] | `src/features/deals/deal-record.tsx:52` | TaskPanel |  | 05-lead-details | native SP11 + SP12/SP13 |
| [x] | `src/features/deals/deal-record.tsx:53` | FilePanel |  | 05-lead-details | native SP11 + SP12/SP13 |
| [x] | `src/features/deals/outcome-panel.tsx:70` | AlertDialogContent |  | 05-lead-details | native SP11 + SP12/SP13 |
| [x] | `src/features/deals/outcome-panel.tsx:74` | form |  | 05-lead-details | native SP11 + SP12/SP13 |
| [x] | `src/features/deals/outcome-panel.tsx:75` | fieldset |  | 05-lead-details | native SP11 + SP12/SP13 |
| [x] | `src/features/deals/pipeline.tsx:15` | form | Changer d’étape | 05-lead-details | native SP11 + SP12/SP13 |
| [x] | `src/features/deals/pipeline.tsx:15` | fieldset |  | 05-lead-details | native SP11 + SP12/SP13 |
| [x] | `src/features/deals/reservation-panel.tsx:65` | AlertDialogContent |  | 05-lead-details | native SP11 + SP12/SP13 |
| [x] | `src/features/discovery/audit-panel.tsx:17` | form |  | 03-leads-and-deals-list | native SP19 |
| [x] | `src/features/discovery/audit-panel.tsx:17` | fieldset |  | 03-leads-and-deals-list | native SP19 |
| [x] | `src/features/discovery/lifecycle-panel.tsx:10` | form |  | 03-leads-and-deals-list | native SP19 |
| [x] | `src/features/discovery/search-trigger.tsx:20` | SheetContent |  | 03-leads-and-deals-list | native SP19 |
| [x] | `src/features/discovery/search-trigger.tsx:21` | form |  | 03-leads-and-deals-list | native SP19 |
| [x] | `src/features/files/file-panel.tsx:72` | form |  | 05-lead-details | protected-files SP09 + thumbnail |
| [x] | `src/features/files/file-panel.tsx:73` | fieldset |  | 05-lead-details | protected-files SP09 + thumbnail |
| [x] | `src/features/files/file-panel.tsx:125` | AlertDialogContent |  | 05-lead-details | protected-files SP09 + thumbnail |
| [x] | `src/features/finance/confirmation.tsx:8` | AlertDialogContent |  | 05-lead-details | V3 finance + native SP16 |
| [x] | `src/features/finance/finance-panel.tsx:18` | TabsTrigger | dossier | 05-lead-details | V3 finance + native SP16 |
| [x] | `src/features/finance/finance-panel.tsx:18` | TabsTrigger | finance | 05-lead-details | V3 finance + native SP16 |
| [x] | `src/features/finance/finance-panel.tsx:18` | TabsContent | dossier | 05-lead-details | V3 finance + native SP16 |
| [x] | `src/features/finance/finance-panel.tsx:18` | TabsContent | finance | 05-lead-details | V3 finance + native SP16 |
| [x] | `src/features/finance/finance-panel.tsx:18` | FinancePanel |  | 05-lead-details | V3 finance + native SP16 |
| [x] | `src/features/finance/receipt-form.tsx:25` | form | {original ? "Correction d’encaissement" : "Nouvel encaissement"} | 04-create-or-edit-lead | V3 finance + native SP16 |
| [x] | `src/features/finance/terms-form.tsx:23` | form | {value ? "Correction de commission" : "Nouvelle commission"} | 04-create-or-edit-lead | V3 finance + native SP16 |
| [x] | `src/features/imports/batch-review.tsx:63` | fieldset |  | 03-leads-and-deals-list | native SP18 |
| [x] | `src/features/imports/batch-review.tsx:70` | fieldset |  | 03-leads-and-deals-list | native SP18 |
| [x] | `src/features/imports/batch-review.tsx:71` | AlertDialogContent |  | 03-leads-and-deals-list | native SP18 |
| [x] | `src/features/imports/import-panel.tsx:39` | form | Fichier CSV de contacts | 03-leads-and-deals-list | native SP18 |
| [x] | `src/features/imports/import-panel.tsx:42` | fieldset |  | 03-leads-and-deals-list | native SP18 |
| [x] | `src/features/intake/website-form.tsx:61` | form | Demande synthétique | 04-create-or-edit-lead | native SP20 |
| [x] | `src/features/intake/website-form.tsx:62` | fieldset |  | 04-create-or-edit-lead | native SP20 |
| [x] | `src/features/inventory/development-directory.tsx:20` | form | Filtres des programmes | 07-projects | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-directory.tsx:20` | fieldset |  | 07-projects | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-editor.tsx:33` | form | {development ? "Modifier le programme" : "Créer un programme"} | 04-create-or-edit-lead | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-editor.tsx:36` | fieldset |  | 04-create-or-edit-lead | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-record.tsx:35` | fieldset |  | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-record.tsx:35` | TabsTrigger | facts | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-record.tsx:35` | TabsTrigger | units | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-record.tsx:35` | TabsTrigger | hierarchy | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-record.tsx:35` | TabsTrigger | types | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-record.tsx:35` | TabsTrigger | briefing | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-record.tsx:35` | TabsTrigger | owners | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-record.tsx:35` | TabsTrigger | offerings | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-record.tsx:35` | TabsTrigger | history | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-record.tsx:36` | TabsContent | facts | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-record.tsx:36` | FilePanel |  | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-record.tsx:36` | LifecyclePanel |  | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-record.tsx:37` | TabsContent | units | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-record.tsx:38` | TabsContent | hierarchy | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-record.tsx:38` | HierarchyPanel |  | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-record.tsx:39` | TabsContent | types | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-record.tsx:39` | HierarchyPanel |  | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-record.tsx:40` | TabsContent | briefing | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-record.tsx:41` | TabsContent | owners | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-record.tsx:42` | TabsContent | offerings | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/development-record.tsx:43` | TabsContent | history | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/external-outcome.tsx:46` | AlertDialogContent |  | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/external-outcome.tsx:48` | form |  | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/external-outcome.tsx:48` | fieldset |  | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/hierarchy-editor.tsx:28` | form | {`${item ? "Modifier" : "Créer"} un ${noun}`} | 04-create-or-edit-lead | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/hierarchy-editor.tsx:28` | fieldset |  | 04-create-or-edit-lead | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/offering-editor.tsx:32` | form | {`${offering ? "Modifier" : "Créer"} la campagne ${kindLabels[kind].toLowerCase()}`} | 04-create-or-edit-lead | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/offering-editor.tsx:33` | fieldset |  | 04-create-or-edit-lead | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/offering-editor.tsx:59` | form | {`Disponibilité ${kindLabels[offering.kind].toLowerCase()}`} | 04-create-or-edit-lead | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/owner-editor.tsx:24` | fieldset |  | 04-create-or-edit-lead | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/property-directory.tsx:28` | TabsTrigger | standalone | 07-projects | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/property-directory.tsx:28` | TabsTrigger | developments | 07-projects | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/property-directory.tsx:29` | TabsContent | developments | 07-projects | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/property-directory.tsx:30` | TabsContent | standalone | 07-projects | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/property-directory.tsx:32` | form | Filtres des biens | 07-projects | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/property-directory.tsx:32` | fieldset |  | 07-projects | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/property-editor.tsx:34` | form | {property ? "Modifier le bien" : developmentId ? "Créer une unité physique" : "Créer un bien indépendant"} | 04-create-or-edit-lead | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/property-editor.tsx:37` | fieldset |  | 04-create-or-edit-lead | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/property-editor.tsx:44` | fieldset |  | 04-create-or-edit-lead | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/property-record.tsx:32` | fieldset |  | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/property-record.tsx:32` | TabsTrigger | facts | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/property-record.tsx:32` | TabsTrigger | owners | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/property-record.tsx:32` | TabsTrigger | offerings | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/property-record.tsx:32` | TabsTrigger | history | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/property-record.tsx:33` | TabsContent | facts | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/property-record.tsx:35` | FilePanel |  | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/property-record.tsx:35` | LifecyclePanel |  | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/property-record.tsx:37` | TabsContent | owners | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/property-record.tsx:38` | TabsContent | offerings | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/property-record.tsx:39` | TabsContent | history | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/unit-directory.tsx:25` | form | Filtres des unités | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/inventory/unit-directory.tsx:25` | fieldset |  | 08-project-details | V3 project tabs + native SP07 / SP08 |
| [x] | `src/features/reports/report-dashboard.tsx:46` | form | Période des indicateurs | 02-dashboard | V3 dashboard + native SP17 |
| [x] | `src/features/requirements/offering-search.tsx:32` | form | Filtres des offres | 05-lead-details | contact searches / SP10 |
| [x] | `src/features/requirements/offering-search.tsx:32` | fieldset |  | 05-lead-details | contact searches / SP10 |
| [x] | `src/features/requirements/requirement-form.tsx:43` | form | {value ? "Modifier la recherche" : "Nouvelle recherche"} | 04-create-or-edit-lead | contact searches / SP10 |
| [x] | `src/features/requirements/requirement-form.tsx:44` | fieldset |  | 04-create-or-edit-lead | contact searches / SP10 |
| [x] | `src/features/requirements/requirement-panel.tsx:68` | form | {`Avis pour ${offering.target?.reference ?? "l’offre"}`} | 05-lead-details | contact searches / SP10 |
| [x] | `src/features/schedule/visit-form.tsx:51` | form | {value ? "Modifier la visite" : "Nouvelle visite"} | 06-visits-calendar | native SP14 |
| [x] | `src/features/schedule/visit-form.tsx:51` | fieldset |  | 06-visits-calendar | native SP14 |
| [x] | `src/features/schedule/visit-form.tsx:56` | fieldset |  | 06-visits-calendar | native SP14 |
| [x] | `src/features/schedule/visit-record.tsx:48` | AlertDialogContent |  | 06-visits-calendar | native SP14 |
| [x] | `src/features/schedule/visit-record.tsx:48` | form |  | 06-visits-calendar | native SP14 |
| [x] | `src/features/schedule/visit-record.tsx:48` | fieldset |  | 06-visits-calendar | native SP14 |
| [x] | `src/features/schedule/working-hours.tsx:45` | form | Horaires de travail | 09-all-users | native SP14 |
| [x] | `src/features/schedule/working-hours.tsx:45` | fieldset |  | 09-all-users | native SP14 |
| [x] | `src/features/shell/app-shell.tsx:103` | SheetContent |  | 05-lead-details | V3 mobile navigation / notification sheet |
| [x] | `src/features/shell/app-shell.tsx:149` | SheetContent |  | 05-lead-details | V3 mobile navigation / notification sheet |
| [x] | `src/features/shell/app-shell.tsx:149` | NotificationPanel |  | 05-lead-details | V3 mobile navigation / notification sheet |
| [x] | `src/features/users/user-actions.tsx:53` | AlertDialogContent |  | 09-all-users | V3 administration + SP04 |
| [x] | `src/features/users/user-form.tsx:49` | form |  | 09-all-users | V3 administration + SP04 |
| [x] | `src/features/users/user-form.tsx:50` | fieldset |  | 09-all-users | V3 administration + SP04 |
| [x] | `src/features/work/task-form.tsx:60` | form | {value ? "Modifier la tâche" : "Créer une tâche"} | 04-create-or-edit-lead | V3 task/inbox + SP15 |
| [x] | `src/features/work/task-form.tsx:62` | fieldset |  | 04-create-or-edit-lead | V3 task/inbox + SP15 |
| [x] | `src/features/work/task-record.tsx:63` | AlertDialogContent |  | 05-lead-details | V3 task/inbox + SP15 |
| [x] | `src/features/work/work-dashboard.tsx:17` | NotificationPanel |  | 02-dashboard | V3 task/inbox + SP15 |

## Supplementary context regions and disclosures

The same inventory also enumerates111 section/aside/disclosure or
explicit region sites in71 files. They overlap the forms/panels above;
they are not new product surfaces or additional screenshot certifications.
This closes the naming gap for components such as CredentialNotice, report
drill-downs/exceptions, version comparisons, stock effects and calendar free/busy
that do not end in `Panel`. Checked means the shared presentation applies and
the source context is accounted for; family test/state limits above still apply.
Temporary credential handoff is verified live by SP04, deliberately not captured
with a visible secret. The dense calendar grid is a named local scroll region.

| Applied | Source (frontend/) | Source sites / existing labels | V3 pattern |
|---|---|---|---|
| [x] | `src/components/shared/data-state.tsx` | `21` section (shared section); `43` section (shared section) | 05-lead-details |
| [x] | `src/features/auth/auth-frame.tsx` | `13` section (shared section) | 01-login |
| [x] | `src/features/contacts/column-chooser.tsx` | `35` section: Ordre des colonnes | 03-leads-and-deals-list |
| [x] | `src/features/contacts/contact-editor.tsx` | `35` section: Comparaison du contact | 04-create-or-edit-lead |
| [x] | `src/features/contacts/contact-history.tsx` | `56` section (shared section); `78` section (shared section) | 05-lead-details |
| [x] | `src/features/contacts/contact-record.tsx` | `57` section (shared section); `57` section (shared section); `58` section (shared section); `59` section (shared section); `60` section (shared section) | 05-lead-details |
| [x] | `src/features/contacts/enquiry-assignment.tsx` | `32` section (shared section) | 05-lead-details |
| [x] | `src/features/contacts/lead-create.tsx` | `69` section (shared section); `88` aside: Résumé de la saisie | 04-create-or-edit-lead |
| [x] | `src/features/contacts/lead-editor.tsx` | `42` section: Comparaison de la demande | 04-create-or-edit-lead |
| [x] | `src/features/contacts/lead-list.tsx` | `50` details (shared section); `53` details (shared section) | 03-leads-and-deals-list |
| [x] | `src/features/contacts/lead-record.tsx` | `27` section (shared section); `28` section (shared section) | 05-lead-details |
| [x] | `src/features/contacts/ownership-controls.tsx` | `67` section: Gestion du contact | 05-lead-details |
| [x] | `src/features/contacts/ownership-impact.tsx` | `7` section (shared section) | 05-lead-details |
| [x] | `src/features/deals/columns.tsx` | `26` section: Ordre des colonnes | 03-leads-and-deals-list |
| [x] | `src/features/deals/context-picker.tsx` | `17` section: Recherche liée; `22` section: Offre d’inventaire liée; `23` details (shared section) | 05-lead-details |
| [x] | `src/features/deals/customer-offers.tsx` | `24` section: Propositions client | 05-lead-details |
| [x] | `src/features/deals/deal-create.tsx` | `18` section (shared section) | 04-create-or-edit-lead |
| [x] | `src/features/deals/deal-form.tsx` | `39` section (shared section); `46` section: Version actuelle de l’affaire | 04-create-or-edit-lead |
| [x] | `src/features/deals/deal-history.tsx` | `11` section: Historique de l’affaire | 05-lead-details |
| [x] | `src/features/deals/deal-list.tsx` | `40` details (shared section); `43` details (shared section) | 03-leads-and-deals-list |
| [x] | `src/features/deals/deal-record.tsx` | `45` section (shared section); `45` section: Cible actuelle de l’affaire; `48` section: Échec de la modification | 05-lead-details |
| [x] | `src/features/deals/outcome-history.tsx` | `13` section: Résultats et réouvertures | 05-lead-details |
| [x] | `src/features/deals/outcome-panel.tsx` | `65` section: Clôture et réouverture | 05-lead-details |
| [x] | `src/features/deals/pipeline.tsx` | `15` section: Pipeline de l’affaire | 05-lead-details |
| [x] | `src/features/deals/reservation-panel.tsx` | `59` section: Réservation de l’affaire | 05-lead-details |
| [x] | `src/features/discovery/export-action.tsx` | `23` section: Export contrôlé | 03-leads-and-deals-list |
| [x] | `src/features/discovery/lifecycle-panel.tsx` | `10` section: Cycle de vie de l’inventaire | 03-leads-and-deals-list |
| [x] | `src/features/files/file-panel.tsx` | `69` section: Pièces jointes | 05-lead-details |
| [x] | `src/features/finance/commission-record.tsx` | `28` section: Commission sélectionnée; `35` section: Encaissements et corrections; `36` section: Historique financier | 05-lead-details |
| [x] | `src/features/finance/finance-panel.tsx` | `27` section: Finance de l’affaire | 05-lead-details |
| [x] | `src/features/finance/mutation.tsx` | `34` section: Reprise de l’action financière; `34` section: Version financière actuelle | 05-lead-details |
| [x] | `src/features/finance/receipt-form.tsx` | `44` section: Pièce justificative facultative | 04-create-or-edit-lead |
| [x] | `src/features/imports/batch-review.tsx` | `54` section: Aperçu et résultat du lot | 03-leads-and-deals-list |
| [x] | `src/features/imports/import-panel.tsx` | `37` section: Import de contacts; `41` details (shared section) | 03-leads-and-deals-list |
| [x] | `src/features/imports/import-rows.tsx` | `13` details (shared section) | 03-leads-and-deals-list |
| [x] | `src/features/intake/website-form.tsx` | `54` section: receipt-title | 04-create-or-edit-lead |
| [x] | `src/features/inventory/campaign.tsx` | `13` section: {kindLabels[kind]} | 08-project-details |
| [x] | `src/features/inventory/development-directory.tsx` | `20` details (shared section) | 07-projects |
| [x] | `src/features/inventory/development-record.tsx` | `47` section (shared section) | 08-project-details |
| [x] | `src/features/inventory/hierarchy-panel.tsx` | `24` section: {`Étages du bloc ${block.code}`} | 08-project-details |
| [x] | `src/features/inventory/inventory-card.tsx` | `23` section (shared section) | 07-projects |
| [x] | `src/features/inventory/inventory-history.tsx` | `16` section (shared section); `17` section (shared section) | 08-project-details |
| [x] | `src/features/inventory/property-directory.tsx` | `32` details (shared section) | 07-projects |
| [x] | `src/features/inventory/property-record.tsx` | `34` section (shared section) | 08-project-details |
| [x] | `src/features/inventory/states.tsx` | `23` section: Version actuelle du bien; `27` section: Version actuelle du programme | 08-project-details |
| [x] | `src/features/inventory/stock-review.tsx` | `7` section: Effets sur le stock | 08-project-details |
| [x] | `src/features/inventory/unit-directory.tsx` | `25` details (shared section) | 08-project-details |
| [x] | `src/features/reports/drill-down.tsx` | `16` section: Dossiers de l’indicateur | 02-dashboard |
| [x] | `src/features/reports/exceptions.tsx` | `15` section: Alertes à examiner | 02-dashboard |
| [x] | `src/features/reports/metric-chart.tsx` | `28` section: {metric.label} | 02-dashboard |
| [x] | `src/features/reports/pipeline-overview.tsx` | `19` section: Pipeline des prospects; `22` section: Pipeline des affaires | 02-dashboard |
| [x] | `src/features/reports/report-dashboard.tsx` | `39` section: Indicateurs CRM; `59` section: Autres indicateurs | 02-dashboard |
| [x] | `src/features/requirements/offering-search.tsx` | `31` section: Choisir une offre exacte; `39` details (shared section) | 05-lead-details |
| [x] | `src/features/requirements/requirement-form.tsx` | `52` section: Critères de recherche; `61` section: Comparaison de la recherche | 04-create-or-edit-lead |
| [x] | `src/features/requirements/requirement-panel.tsx` | `26` section: Recherches du contact; `27` section: Recherches du contact; `59` section: Recherche sélectionnée; `60` section: Sélection de la recherche | 05-lead-details |
| [x] | `src/features/schedule/visit-calendar.tsx` | `33` details (shared section); `53` section: {dayLabel(day)}; `59` section: Disponibilités CRM du collègue | 06-visits-calendar |
| [x] | `src/features/schedule/visit-create.tsx` | `14` section (shared section) | 06-visits-calendar |
| [x] | `src/features/schedule/visit-form.tsx` | `57` section (shared section); `59` section: Disponibilité du créneau; `63` section (shared section) | 06-visits-calendar |
| [x] | `src/features/schedule/visit-record.tsx` | `29` section (shared section); `52` section (shared section) | 06-visits-calendar |
| [x] | `src/features/schedule/week-grid.tsx` | `23` div: Grille horaire de la semaine, défilement horizontal et vertical | 06-visits-calendar |
| [x] | `src/features/schedule/working-hours.tsx` | `46` section: {day}; `47` section (shared section); `49` section: Impact du changement | 09-all-users |
| [x] | `src/features/shell/app-shell.tsx` | `72` aside (shared section) | 05-lead-details |
| [x] | `src/features/shell/service-status.tsx` | `33` section: service-heading | 05-lead-details |
| [x] | `src/features/users/credential-notice.tsx` | `20` section: Remise du mot de passe temporaire | 09-all-users |
| [x] | `src/features/users/user-actions.tsx` | `45` section: Accès du compte | 09-all-users |
| [x] | `src/features/users/user-list.tsx` | `36` div: Tableau des utilisateurs, défilement horizontal si nécessaire | 09-all-users |
| [x] | `src/features/work/notification-panel.tsx` | `27` section: Notifications internes | 02-dashboard |
| [x] | `src/features/work/task-form.tsx` | `70` section: Échec de la tâche; `71` section: Version actuelle de la tâche | 04-create-or-edit-lead |
| [x] | `src/features/work/task-panel.tsx` | `20` section: Tâches du dossier | 05-lead-details |
| [x] | `src/features/work/task-record.tsx` | `35` section: Tâche sélectionnée; `69` section: Historique de la tâche | 05-lead-details |
| [x] | `src/features/work/work-dashboard.tsx` | `17` div: Travail quotidien, défilement vertical; `17` div: Notifications, défilement vertical; `23` section: Travail à faire; `31` section: Visites à renseigner | 02-dashboard |


## Shared and boundary checklist

- [x] Charcoal sidebar, mobile navigation, real search, session controls and real inbox Sheet.
- [x] Central tokens; shadcn buttons, fields, tables, badges, tabs, Sheet and confirmations; numbered pages.
- [x] Compact primary filters plus working advanced disclosures; no removed business fields.
- [x] City dashboard, semantic KPIs and real scoped Bklit pipelines/charts; exact drill-downs retained.
- [x] Faded-villa login/forced password change; no invented recovery/support links.
- [x] Neutral form/project-card bodies; private authorized image previews or honest fallbacks.
- [x] Vertical record details, actual record identities, supported read-only status strips.
- [x] Desktop week grid, dense overlap scroll and mobile agenda; existing scheduling authority unchanged.
- [x] Loading/empty/invalid/error/denied/not-found/conflict/confirmation patterns reviewed and family-tested.
- [x] Six widths320/360/390/768/1024/1440; keyboard/touch, real200% zoom and reduced-motion checks.
- [x] All nine rendered composition families compared with supplied originals; all55 final captures reviewed independently.
- [x] Unpictured imports, exports, audit, finance, files, requirements, tasks, working hours and synthetic simulator included.
- [x]17 original form sources/87 field-site signatures preserved;272 backend source hashes unchanged.
- [x] Antislop applied during implementation as explicitly requested; separate unselected AFTER-only findings not auto-applied.

## Verification limits

The fresh finish review cleared its scored correction batch, not every possible
workflow or human product acceptance. Browser emulation is not a physical-device
or actual Safari certification. The focused matrix is not a replacement claim for
the failed134-case attempt or a fresh complete backend/load suite. No deployment.
The existing system font and opaque supplied logo are deliberate licensed-asset
adaptations. DESIGN.md merge remains awaiting the user's documentation choice;
the implementation is described separately in
[implemented-system.md](implemented-system.md).

