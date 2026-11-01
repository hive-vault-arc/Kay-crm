# Photo codec source provenance, 2026-11-01

Exact upstream source archives, without modifications:

| Library | Upstream source | SHA256 |
|---|---|---|
| libheif1.23.7 | https://github.com/strukturag/libheif/releases/download/v1.23.7/libheif-1.23.7.tar.gz | `f7483e818503ea6224c8863e4a56ac02c7089021a98472c811c12aa19faf2475` |
| libde2651.1.3 | https://github.com/strukturag/libde265/releases/download/v1.1.3/libde265-1.1.3.tar.gz | `554228bd17788c99a7e63b37ab5634722190e6e2bf60c1dcb01cef328e133905` |
| libwebp1.6.0 | https://storage.googleapis.com/downloads.webmproject.org/releases/webp/libwebp-1.6.0.tar.gz | `e4ab7009bf0629fd11982d4c2aa83964cf244cffba7347ecd39019a9e38c4564` |

libheif/libde265 use LGPL-3.0; their full corresponding source is retained here
and distributed with the decoder. libwebp uses its upstream BSD licence and
patent grant. Full upstream notices ship with the libraries. Build settings,
the pinned Emscripten container and replacement instructions are in
[the browser codec directory](../../../../frontend/vendor/photo-codecs/README.md).
These archives do not license KAY application code or contain customer photos.
