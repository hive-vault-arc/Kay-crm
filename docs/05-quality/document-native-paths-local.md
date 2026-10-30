# Document native-path reconciliation

Prepared source checkpoint,2026-10-30. AT-06/26/35. Actual browser/SQL/worker/
scanner/private-transfer acceptance remains pending. Production UI and backend
are unchanged. Base: `ef4292c`.

| Former target | Selected current target |
| --- | --- |
| Contact Documents root tab | Voir les documents → Documents du contact drawer |
| Inline inventory attachments | Header Documents → Documents drawer |
| Always-inline file input | Ajouter un document → inner Ajouter un document drawer → Fichier |
| Transfer retry outside uploader | Retained inner uploader → Réessayer; return to existing list after publication |
| Scan retry by obsolete visible accessible name | Exact filename-qualified Réessayer l’analyse de… row action |
| Old chooser absence for read-only records | Actual Ajouter un document absence inside the scoped file region |
| Unscoped archive confirmation | Named Archiver cette pièce jointe ? confirmation; close and row disappearance |

The shared helper now exposes explicit document-home opening and file selection.
`uploadFile` requires an already visible Pièces jointes region, opens its actual
uploader and waits for return to that existing list. It does not guess a record
type, restore a removed tab, seed a successful response or invent a clean verdict.
The original synthetic-byte fixture and SHA-256 download helper are unchanged.

The two `tests/e2e/files.spec.ts` cases retain actual worker stop/start/unavailable
controls; the 90-second fenced lease recovery allowance; private contact versus
shared inventory; copied-permit/session403; private-document404; agent upload403;
clean/rejected quarantine and disabled downloads; exact transfer200; retry-scan
200/409 and FILE_SCAN_IN_PROGRESS; image preview; archived read-only download;
archive; and downloaded-byte equality. Image preview stays on the private contact;
shared inventory uses its original DOCX fixture. All original direct business,
service-control, request, response-wait, timeout and fixture calls are AST-identical.
Captures are explicitly disabled for these prepared E2E cases.

Focused ESLint, full frontend typecheck and source invariants pass. These checks
do not run, list or import Playwright scenarios. Prior994 frontend and573
connection-forbidden backend unit results and production gates are retained,
not rerun for test-path edits. No app/browser/CUA/CDP/HTTP access, DB/accounts,
configuration, worker/scanner/service control, transfer, migration, push/merge or
deployment occurred.

Three other direct consumers of the shared upload/download helpers remain:
visible files Chrome, visible deals Chrome and the historical V3 inventory-image
review. Their broader paths and old assumptions are not certified by this change
or compilation. In particular inventory photos use their selected photo workflow,
not attachment upload. The recovery helper also has an older Contact Documents
tab path. These sources and actual native/device/zoom/focus/permission/security/
CI/AFTER/product checks remain open. See the
[evidence](../03-planning/design-migration-evidence/document-native-paths-2026-10-30.json).


## Visible/recovery caller follow-through,2026-10-30

The file entrances of those three direct consumers and the recovery helper are
now reconciled. Visible files Chrome opens Contact/inventory documents explicitly,
including fresh pages for loading/error/zoom/capture; uses nested upload, retained
retry, picker keyboard return and scoped readonly controls. Private contact PNG
keeps real image preview/focus/digest checks. Inventory attachment uses a separate
synthetic DOCX of the same long-name purpose; its real digest, quarantine, scanner,
archive, touch and 200% assertions remain. Interrupted uploader focus must stay
inside its open drawer rather than target the inert parent heading.

The Deal caller opens Documents for attachment upload and returns to Activités/
its existing history disclosure. Recovery opens Documents du contact. Historical
V3 inventory-image checking now uses Galerie → Ajouter une photo, actual WebP
conversion/AV, purpose=photo metadata, current property-card link identity and
photo viewer. It requires no image while quarantined and an actual decoded image
after clean scanning; the metadata wait is narrowed to photo and its lazy card
scrolled into view. No successful response or clean state is mocked.

Scoped lint/full types pass. Source AST retains4 scenario titles, all timeouts
and45 of46 protected business/service/request/fault calls exactly; the single
intentional change narrows the V3 metadata response predicate to purpose=photo.
No native, capture, zoom, outage, service or private-transfer execution occurred.
The broader deals/V3/recovery journeys and the separate property-photo scenarios
still contain older selected-layout assumptions and remain unaccepted. The
original checkpoint above is historical; these specific entry corrections do not
certify every caller. [Caller evidence](../03-planning/design-migration-evidence/document-review-paths-2026-10-30.json).


## Property/programme photo scenarios,2026-10-30

Two original photo cases now use Galerie → Photos du dossier, its distinct
Galerie du dossier and Ajouter une photo forms, Photo à ajouter and explicit
Ajouter la photo/retained Réessayer controls. A focused shared helper opens,
selects, submits and closes those real homes. Preview uses the distinct Fermer
la photo control to identify the nested viewer sharing the drawer title; Escape
must close the viewer and restore the original photo trigger. Current image alt
text and right-rail cover replace obsolete Photos du bien/header-image targets.
Reload reopens the gallery; it closes before programme structure/unit creation.

The second title drops historical automatically wording to describe the selected
explicit submission; production behavior is unchanged. Agent document absence
now checks actual Ajouter un document inside the readonly Documents drawer,
then returns to Photos. Current programme name locates the header for geometry.
Original2 timeouts,4 worker controls,6 direct business commands,2 route faults,
2 route removals,2 protected reads and7 screenshot calls are AST-identical.
Original WebP/MIME/byte/ten-slot409/unsupported415/private403, real AV, archive,
interruption/frozen selection, actual viewer failure/retry/navigation and
320/390px geometry assertions remain. No clean success is substituted.

Scoped ESLint/full types pass. These sources and screenshot requests were not
executed, listed or imported via Playwright; no capture or actual account/DB/
service/AV/private transfer occurred. Prior994 frontend/573 backend units and
production gates retained, not rerun. Actual device/zoom/focus/security/CI/AFTER/
product and broader historical journeys remain pending.
[Photo evidence](../03-planning/design-migration-evidence/photo-native-paths-2026-10-30.json)
and [photo contract](../04-design/photo-workspace-local.md).
