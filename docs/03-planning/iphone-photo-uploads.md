# iPhone photo selection and batch uploads

Owner request,2026-11-01: support iPhone HEIC/HEIF photos, select several photos,
test the workflow and publish through a PR/verified merge. Scope:C04/C14 inventory
photos on programmes and physical properties, including agent-owned uploads.
The owner subsequently confirmed all photo upload areas, including protected
contact/Lead/Deal attachments. PDF/DOCX/XLSX retain their original formats.

Preserve the original dirty checkout; implement in the clean managed checkout
on `codex/iphone-photo-uploads`, based on main e0bdc09. The upload change introduces no schema migration. The redesign integration is
released separately and includes its own visit-note and development-phase migrations.

## Acceptance and technical choices

- Native file chooser uses explicit image MIME/extension hints and `multiple`,
  without forcing camera capture. Resume chooses one original source. Reject an
  oversized selection with remaining capacity; never silently drop extra files.
- After confirmation in the redesign's upload drawer, sequential conversion and upload preserve the ten-photo server limit,
 20MiB source limit,25-megapixel decoder guard and2560px WebP resize. Native
  decoding is preferred; HEIC fallback loads only when needed, runs off the UI
  thread and is terminated on abort, timeout or completion. Only converted WebP
  bytes use existing private permits, scan/quarantine and storage.
- Keep queued source files and the current document/idempotency identity after
  failure/interruption. Resume from that file, without re-uploading successes.
  Surface current-file/whole-selection progress and truthful scan-pending feedback.
  No background upload after leaving the record; no persistent browser photo cache.
- Private attachment selection accepts up to10 files per batch (a client work
  bound, not a lifetime document limit). The existing explicit Send action stays;
  HEIC/HEIF becomes WebP, while existing JPEG/PNG/WebP and document bytes stay
  unchanged. Resume still selects one matching source. No broader file authority.
- Cover real synthetic HEIC/HEIF decoding, empty MIME and Safari-transcoded names,
  primary HEIF image, mixed batches, failure/cancel/retry, cap/concurrent denial,
  agent permissions, unchanged PDF/DOCX and desktop/narrow/touch/WebKit behavior.
- Physical iPhone picker/OS codecs need a real device for final device acceptance;
  desktop WebKit/mobile emulation must not be described as physical iPhone proof.

## UX and skills

Reuse Riviera, shadcn controls, Iconsax and current photo-gallery hierarchy.
CRM UX, design-system-ops and React guidance apply to progress, bounded sequential
work, recoverable selection, keyboard focus and narrow layouts. No redesign,
chart or new spatial token is needed. Legacy antislop/design-taste skill paths
in the repo no longer exist in either installed skill root; do not claim those
skills were run or install replacements. Preserve the owner's AFTER-only audit
boundary and avoid unrelated aesthetic changes. Current evidence goes in QA.

## Research

[WebKit HEIC support](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/)
documents native Safari17 support; [WebKit file transcoding](https://bugs.webkit.org/show_bug.cgi?id=292350)
explains MIME-based selection. [MDN file inputs](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/file)
defines multiple selection. Inspection of the newest `heic-to`1.6.7 binary
reports libde2651.0.16 despite its recent libheif1.23.7 update. The native
[libde265 advisory](https://github.com/strukturag/libde265/security/advisories/GHSA-ccfw-29x7-rrx3)
requires a patched decoder. Do not rely only on npm advisory metadata.

Source-build libheif1.23.7/libde2651.1.3 with pinned Emscripten4.0.23, retaining
complete upstream source archives, licences and rebuild/replacement instructions.
The separately served asm.js library needs no JavaScript eval or nested worker.
Its disposable worker checks the actual codec version exports and the primary
image's25MP limit before pixel decoding; maximum library heap512MiB. Build/dev
checks reviewed artifact/source hashes and removes superseded generated copies.
Safari's canvas WebP limitation needs a second lazy disposable encoder worker.
The earlier npm WebP encoder reports libwebp1.1.0, so source-build libwebp1.6.0
with only encoder/memory exports, a256MiB heap ceiling and bounded2560px RGBA
input. A tiny cached capability probe selects it when native WebP export is
unavailable. Only the encoder worker permits WASM compilation through
wasm-unsafe-eval; neither permits JavaScript unsafe-eval or external hosts.
WebKit applies worker-src to module imports, so self remains permitted there.
See [source/build provenance](../../frontend/vendor/photo-codecs/README.md).
No CDN, image-conversion provider, VAPID or server codec dependency is introduced.

Release auditing also requires the compatible pypdf6.21.4 security patch; only
that Python version/hashes change. Development-tool advisories for minimatch and
deepmerge remain a failed gate until fixed or explicitly excepted by the owner.
No new exception is inferred from the feature publication request.

The full-ten batch test is extended to open every image immediately afterward.
It exposed duplicate viewer downloads exhausting the existing permit budget.
Thumbnail/viewer bytes now deduplicate by immutable clean version inside one
gallery lifetime; retries remain fresh authorized reads. Removed/version-changed
entries are pruned and navigation/logout unmount clears the map. No global or
persistent image cache is introduced. Hosted report regressions also need their
current-time fixtures separated from deliberately historical October periods;
the backend reporting rules and original assertions are preserved.
