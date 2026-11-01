# Browser photo codec builds

libheif1.23.7 + libde2651.1.3 decode HEIC/HEIF. libwebp1.6.0 provides the
Safari encoder fallback. These independently served libraries are loaded only
when native browser capabilities are missing. The decoder's previous prebuilt
npm package contained libde2651.0.16; the previous encoder contained libwebp1.1.0.
Do not restore those packages based only on their npm audit result.

Official complete source archives and SHA256s are retained in
[source provenance](../../../docs/reference/photo-codecs/2026-11-01/README.md).
The decoder sources are also distributed with the built site under
`/licenses/heic/`. Full licences/notices remain in `public/licenses/heic/`
and `public/licenses/webp/`. The source libraries are unmodified; our build
exports version inspection and adds one WebP heap accessor to the generated
module. The application and workers retain their own existing licence boundary.

Rebuild from the repository root using the pinned Linux/amd64 toolchain:

```powershell
docker run --rm --mount "type=bind,source=$PWD/docs/reference/photo-codecs/2026-11-01,target=/sources,readonly" --mount "type=bind,source=$PWD/frontend/scripts/build-photo-codecs.sh,target=/build-codecs.sh,readonly" --mount "type=bind,source=$PWD/frontend/vendor/photo-codecs,target=/output" emscripten/emsdk@sha256:835a0e39f40a84d0b754d946d70c2da62239dad2c9cd5d9316f246a12f399f42 bash /build-codecs.sh
```

The container receives only reviewed source archives, the build script and its
output directory; private workspace configuration is not mounted. This runs
Emscripten4.0.23 with the exact settings in the build script, no
runtime image service/CDN. HEIC uses a CSP-compatible asm.js module with no
dynamic JavaScript evaluation, no nested worker, a512MiB heap ceiling and
25MP primary-image limit before decoding pixels. WebP uses WASM, no threads,
a256MiB heap ceiling and bounded2560px canvas RGBA input. The separately served
modules can be replaced without rebuilding KAY's application code.

Build/dev verifies reviewed artifact hashes before copying them into `public`;
when intentionally rebuilding/upgrading, review version exports and hashes,
update `scripts/prepare-heic.mjs`, then run the real HEIC/HEIF/WebP browser tests.
Native source advisories must be reviewed separately from package-manager audits.
