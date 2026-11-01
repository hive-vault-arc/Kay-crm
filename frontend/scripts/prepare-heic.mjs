import { createHash } from "node:crypto";
import { mkdir, readFile, copyFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vendor = path.join(frontend, "vendor/photo-codecs");
const sources = path.resolve(frontend, "../docs/reference/photo-codecs/2026-11-01");

// Remove only our superseded generated copies from an earlier local build.
for (const obsolete of ["heic/heic-to-1.6.7.js", "webp/webp_enc-1.5.0.js", "webp/webp-1.5.0.wasm", "webp/meta-1.5.0.js", "licenses/heic/heic-to.txt", "licenses/webp/jsquash.txt"]) {
  await rm(path.join(frontend, "public", obsolete), { force: true });
}

// Retain independently replaceable libraries and their complete LGPL sources.
for (const [source, target, hash] of [
  [path.join(vendor, "libheif-1.23.7-de265-1.1.3.js"), "heic/libheif-1.23.7-de265-1.1.3.js", "cb9d8f72d8dbb4161b860fcdeb4ad711e43b4c287531959e2c88289e89a34ca5"],
  [path.join(vendor, "libwebp-1.6.0.js"), "webp/libwebp-1.6.0.js", "76beccba007b8d7378cdcfaca0b9bbcd73fb29c49e9e86c3eb0748624d83982d"],
  [path.join(vendor, "libwebp-1.6.0.wasm"), "webp/libwebp-1.6.0.wasm", "920b5ffe91c516c1cfb864312f4cf552db92e6884f182d168a885b331f5f5ef3"],
  [path.join(sources, "libheif-1.23.7.tar.gz"), "licenses/heic/libheif-1.23.7.tar.gz", "f7483e818503ea6224c8863e4a56ac02c7089021a98472c811c12aa19faf2475"],
  [path.join(sources, "libde265-1.1.3.tar.gz"), "licenses/heic/libde265-1.1.3.tar.gz", "554228bd17788c99a7e63b37ab5634722190e6e2bf60c1dcb01cef328e133905"],
]) {
  const bytes = await readFile(source);
  if (createHash("sha256").update(bytes).digest("hex") !== hash) throw new Error("PHOTO_CODEC_INTEGRITY_MISMATCH");
  const destination = path.join(frontend, "public", target);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}
