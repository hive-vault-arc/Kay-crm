import { createHash } from "node:crypto";
import { mkdir, readFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const library = path.join(frontend, "node_modules/heic-to");
const source = path.join(library, "dist/csp/heic-to.min.js");
const metadata = JSON.parse(await readFile(path.join(library, "package.json"), "utf8"));
const bytes = await readFile(source);
if (metadata.version !== "1.6.7" || createHash("sha256").update(bytes).digest("hex") !== "e0a515585872c319c601c33551925c9d5fee31746caf0311291ed7e6364c592c") throw new Error("HEIC_LIBRARY_INTEGRITY_MISMATCH");
await mkdir(path.join(frontend, "public/heic"), { recursive: true });
await copyFile(source, path.join(frontend, "public/heic/heic-to-1.6.7.js"));
await mkdir(path.join(frontend, "public/licenses/heic"), { recursive: true });
await copyFile(path.join(library, "LICENSE"), path.join(frontend, "public/licenses/heic/heic-to.txt"));

const webp = path.join(frontend, "node_modules/@jsquash/webp");
const webpMetadata = JSON.parse(await readFile(path.join(webp, "package.json"), "utf8"));
if (webpMetadata.version !== "1.5.0") throw new Error("WEBP_LIBRARY_INTEGRITY_MISMATCH");
await mkdir(path.join(frontend, "public/webp"), { recursive: true });
for (const [file, target, hash] of [
  ["codec/enc/webp_enc.js", "webp_enc-1.5.0.js", "5fd62301662e37785aec38e38807926f72933d4c8b919018a43faf1b1ca760f6"],
  ["codec/enc/webp_enc.wasm", "webp-1.5.0.wasm", "b6085bb6702f144e9dc6016d58d230b34a84976bf0d080b7390b4b4b137d6ab7"],
  ["meta.js", "meta-1.5.0.js", "3d70163a00e6264fc5a8fa7c8f3b1fa21a50a00d910f4d2de3ef1bbd2fdc98ab"],
]) {
  const bytes = await readFile(path.join(webp, file));
  if (createHash("sha256").update(bytes).digest("hex") !== hash) throw new Error("WEBP_LIBRARY_INTEGRITY_MISMATCH");
  await copyFile(path.join(webp, file), path.join(frontend, "public/webp", target));
}
await mkdir(path.join(frontend, "public/licenses/webp"), { recursive: true });
await copyFile(path.join(webp, "LICENSE"), path.join(frontend, "public/licenses/webp/jsquash.txt"));
