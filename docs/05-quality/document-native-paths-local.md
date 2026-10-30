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
