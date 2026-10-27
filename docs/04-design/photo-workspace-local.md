# Selected inventory photo workspace

Status: source integration proposal,2026-10-27. C04/C13/C14. Native/current-role/
transfer/scanner and product review remain pending. The existing
[file contract](api-contracts.md#sp-09-protected-file-wire-contract) and
[agent photo boundary](../03-planning/agent-inventory-photos.md) remain authoritative.

## Selected gallery and focused form

Frozen `photo-gallery.js`, `photo-recovery.css` and `photo-upload.js` supply the
composition: a compact Galerie/count header, explicit Ajouter une photo entry,
tonal image cards and a separate focused form. The current drawer keeps its
inset and scroll owner; a form replaces the gallery body instead of opening a
second uploader panel. Retour uses the shared discard guard and returns to that
same gallery. Choosing a file stages it; conversion/private transfer start only
with Ajouter la photo/Reprendre. This is the owner's selected intentional UX,
superseding the older immediate-on-selection interaction while retaining automatic
WebP preparation as part of the explicit send.

Cards use the selected3:2 image, inset radius, filenames, size, current protected
state and44px actions. The two-column gallery becomes one column inside a560px
container. The exact frozen Camera vector is added to the typed/hash-checked
registry and semantic photos action; no runtime icon dependency or package
change. No table, additional tab, empty pagination or reading-width cap is added.
Numbered pages remain available for any existing larger legacy collection.

Archive and scan retry retain manager authority; Agent upload remains separate.
Existing negotiated can_upload:false always prevents a new transfer. Resuming an
existing row as Agent requires explicit can_upload:true; M/A retain the legacy
capability fallback. For an older response without the optional flag, this form's
own successfully accepted creation may still request the authoritative permit,
preserving the previous new-upload flow. A read projection alone never supplies
that fallback. Current backend scope/role/session/permit checks still decide.

## Immutable attempt and acknowledgement recovery

An attempt owns its parent kind/ID, optional resumed document ID, source File,
converted File, creation key and known document ID in memory. Different context
or source cannot reuse it. Conversion validates MIME/extension/nonempty/20MiB,
caps decoded pixels at25million, scales the maximum side to2560 and uses WebP
quality0.82. Bitmap resources close on success and conversion failure. Original
metadata/EXIF are not copied by new-image canvas conversion.

The metadata boundary freezes selection before sending, including an unknown
response. Retrying preserves the same metadata/body/key and converted bytes.
The user can explicitly discard through Retour; the gallery then rereads any
reserved server record rather than creating another automatically. Unknown
creation does not claim a confirmed reservation in its copy. Existing attempt/
resume remains retryable when its reserved slot makes the total reach ten.

Creation receipt metadata is checked, then a fresh document read is required
before a permit. Existing attempts also reread current metadata. ID, purpose,
filename, MIME and size must match; archived/foreign/mismatched data cannot be
adopted. The current capability is checked before upload, even if role props are
stale. If the current latest version is pending_scan, clean or rejected, a lost
transfer acknowledgement is resolved by that real state without another upload
or version. Rejection remains rejection; only the normal scanner can yield clean.
Otherwise a fresh current-version permit is requested and bytes go directly to
the existing private transfer. No permit is reused.

Legacy JPEG/PNG metadata can be resumed by an authorized manager using its exact
original file/name/MIME/size. Those bytes are not silently recompressed or renamed
to WebP; new photo creation still permits WebP only. Historical stored content,
version history and source attribution remain unchanged.

## Managed drafts, cancellation and private previews

The selected file is managed draft state. Searching/opening the clean gallery is
not a draft. Conversion/metadata/permit/transfer busy state protects navigation;
Interrompre keeps a retryable attempt and does not claim backend rollback. Locks
prevent duplicate submit, including late handlers after success. On unmount,
reads/transfers abort and late completion cannot invoke the departed form's
success action. Definite401/403/404 clears the composer/preview context; retry
resets old selections before a fresh authorized gallery read.

The common apiCommand now accepts an optional trailing cancellation signal,
without changing earlier timeout arguments/callers. It preserves managed dirty
markers: metadata creation is not proof that the complete form succeeded. Legacy
unmanaged forms retain their success-marker behavior and existing live events
remain. Actual workflow success accepts the managed draft.

API and private download cancellation use a bounded AbortController composition,
without requiring AbortSignal.any. Existing10s/default and explicitly supplied
API timeouts, and90s private download/upload bounds, remain. Timers/listeners are
released after the body is consumed, including failed requests. Session/CSRF/
Origin, no-store, omitted transfer cookies and direct FastAPI delivery are intact.
This does not finish the separate older-browser history-navigation fallback.

Cards/viewer request a particular authorized clean version, including an older
clean version where the existing metadata contract exposes one. The badge still
describes the latest scan state. Pending/rejected bytes never become previewable.
Navigation/unmount aborts departed preview requests and revokes created blob URLs;
denial removes the gallery's previous private projection. Archive/scan commands
have a shared gallery busy boundary and retained retry identity. Archive and
viewer close can restore gallery focus when the original card has disappeared.

No file bytes, source File, proof, session token or private filename is stored in
browser storage, URLs, logs, fixtures or documentation. Only synthetic test data
is used. No backend/API route/schema, real record, worker/scanner/service,
database, migration or private configuration was changed or executed.

## Evidence and limits

Eighteen registered actual-module cases cover conversion/resources, both parent
kinds, exact retry/context/byte identity, capability and metadata binding,
interruption/acknowledgement recovery, legacy resume, managed markers, drawer
composition, stale preview cleanup, archive locks/focus and bounded request body
lifetime.352 frontend units, lint/typecheck and pinned Next16.4.2 build pass.
Initial checks corrected a hook dependency, a synthetic changing-parent fixture
(and strengthened the actual context guard), and missing crypto in a media test
loader. Failed attempts are not counted as passing verification.

Two isolated desktop-property/mobile-development browser journeys are prepared
in `frontend/tests/e2e/photo-workspace.spec.ts`, not run. Older photo/inventory
browser helpers still describe the prior inline automatic flow and remain
unmigrated. Source/compiled CSS and exact glyph/hash checks are indirect evidence,
not rendered geometry, keyboard/touch/zoom, visual or native transfer proof.
Original-machine mandatory skills remain unavailable/not claimed; dense CRM is
outside the marketing workflow, shared primitives/system guidance and AFTER timing
remain. Final real permission/worker/scan/slot concurrency/private-byte delivery,
full-stack/CI/native/AFTER/owner gates and other migration scope remain open.
[Evidence](../03-planning/design-migration-evidence/photo-workspace-2026-10-27.json).
