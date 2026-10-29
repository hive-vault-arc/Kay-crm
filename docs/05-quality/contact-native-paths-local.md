# Selected Contact browser paths

Date:2026-10-29. Branch:`codex/redesign`.
[Evidence](../03-planning/design-migration-evidence/contact-native-paths-2026-10-29.json).

These are source-migrated browser scenarios, not executed browser evidence.
Contact retains two tabs: Aperçu and Activités. Dossiers stay below responsibility;
attribution history is an Activités disclosure. No old tab is restored for a test.

| Existing scenario | Current selected path and retained assertion |
| --- | --- |
| Collaboration/transfer and enquiry assignment | Aperçu → Gérer le contact drawer → explicit impact; true author cells and assignment disclosure; prospect assignment drawer; former session404 and transferred access preserved |
| Lost note acknowledgement and outage | Activités → Ajouter une activité drawer; original disabled draft and explicit same-operation retry, one stored entry; next draft survives a preflight outage |
| Archive/restore | Existing legacy Contacts entry path, actual Archivage filter, Aperçu linked-prospect total, Activités authors; no relationship/permission assertion removed |
| Same-scope/cross-portfolio merge | Actual management drawer and confirmation; unchanged private404, stale-impact rejection, source/survivor provenance and collaborator withdrawal checks |
| Deal origin timeline | Contact Activités, visible Voir l’affaire links and exact destination/count; conversion history assertion retained |

Shared helpers now scope management, entry and confirmation controls to their
actual portals. Attribution disclosure opens idempotently. Visible timeline
content is counted across the selected responsive representations. The helper
has seven direct test/review consumers; this preparation does not certify their
other selectors or whole suites. Five ownership scenarios and one Contact segment
of the deal scenario are reconciled against actual current component source.

Focused ESLint and typecheck pass. Production source unchanged: prior961 frontend
units/build/history and573 connection-forbidden backend units are retained, not
rerun. No tests were listed/imported/executed in Playwright, and no app, database,
account, private configuration, service restart, screenshot or transfer was
accessed. Actual native/SQL/permission/concurrency/keyboard/touch/zoom/security/CI/
AFTER/product acceptance and other legacy selectors remain pending. Frozen254
inputs, main and unrelated work remain preserved; full goal remains active.
