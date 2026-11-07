# Synthetic iPhone-format fixtures

No customer photos, EXIF, location, faces or private content. These small flat
colour images were generated with Pillow13.0.0/pillow-heif1.8.1, using a verified
official Windows wheel outside the application venv/dependencies. Generator
wheel SHA256:c583f2c08aa08848e7b97f4b416f5dce9f485182fd55efd39edba10f092ee651.

- synthetic-grid.heic:96x64 blue/gold/green rectangles,588 bytes;
  SHA256:3cf08fce928af490a8d63e14bd498a126990c20e1ad1e87ede5d030e7085197a.
- synthetic-primary.heif: two images; first is64x96 red, selected primary is
  96x64 blue,630 bytes;
  SHA256:9c8555c9949ff7349516a00bb730c3f97a547f78fd8a6a059609bbd3f2f23bb1.

Reproduction: create an RGB96x64 image in #245fb7, draw top-left48x32 in #e4b647
and bottom-right48x32 in #46a073, save as HEIF at quality80. For the primary
fixture save RGB64x96 #df3f3f with append_images=[RGB96x64 #245fb7], save_all=True,
primary_index=1, quality80. CI uses these committed bytes and needs no encoder.
