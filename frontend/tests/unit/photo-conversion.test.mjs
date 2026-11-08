import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { loadServer } from "./load-server.mjs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

class PhotoError extends Error { constructor(code) { super(code); this.code = code; } }
const { photoSourceKind, photoAccept } = loadServer("src/features/files/photo-conversion.ts", { modules: {
  "@/lib/api/client": { ApiError: PhotoError },
  "./contracts": { maxFileBytes: 20 * 1024 * 1024 },
} });

test("real HEIC/HEIF headers accept uppercase names and missing Files MIME", () => {
  for (const filename of ["synthetic-grid.heic", "synthetic-primary.heif"]) {
    const bytes = readFileSync(`tests/fixtures/iphone-photos/${filename}`).subarray(0, 32);
    for (const mime of ["", "application/octet-stream", "image/heic", "image/heif"]) assert.equal(photoSourceKind(filename.toUpperCase(), mime, bytes), "heif");
  }
  assert(photoAccept.startsWith("image/jpeg,"));
  assert(photoAccept.includes("image/heic"));
});

test("Safari-transcoded HEIC names use actual JPEG bytes rather than the extension", () => {
  assert.equal(photoSourceKind("IMG_0001.HEIC", "image/jpeg", new Uint8Array([255, 216, 255, 224])), "raster");
  assert.equal(photoSourceKind("IMG_0001.PNG", "", new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])), "raster");
});

test("picker hints never admit arbitrary files, PDFs or videos as photos", () => {
  const jpeg = new Uint8Array([255, 216, 255]);
  for (const [name, mime, bytes] of [["script.svg", "image/svg+xml", jpeg], ["video.mov", "video/quicktime", jpeg], ["report.HEIC", "application/pdf", jpeg], ["fake.heic", "image/heic", new TextEncoder().encode("%PDF-1.7")], ["fake.png", "image/png", new Uint8Array(32)]]) {
    assert.throws(() => photoSourceKind(name, mime, bytes), PhotoError);
  }
});

function decoderHarness() {
  const exports = {};
  const workers = [];
  let timeout;
  class SyntheticWorker {
    terminated = false;
    constructor() { workers.push(this); }
    postMessage(blob) { this.blob = blob; }
    terminate() { this.terminated = true; }
  }
  const source = ts.transpileModule(readFileSync("src/features/files/decode-heic.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(source, { exports, require: () => ({ ApiError: PhotoError }), Worker: SyntheticWorker, setTimeout: callback => { timeout = callback; return 1; }, clearTimeout() {} });
  return { decode: exports.decodeHeic, worker: () => workers[0], timeout: () => timeout() };
}

test("HEIF cancellation terminates decoding and closes a late bitmap", async () => {
  const harness = decoderHarness(), controller = new AbortController();
  const result = harness.decode(new Blob(["synthetic"]), controller.signal);
  const rejected = assert.rejects(result, error => error.code === "FILE_TRANSFER_INTERRUPTED");
  controller.abort(); await rejected;
  assert(harness.worker().terminated);
  let closed = false;
  harness.worker().onmessage({ data: { bitmap: { close() { closed = true; } } } });
  assert(closed);
});

test("HEIF timeouts fail closed and successful decoding releases its worker", async () => {
  const timed = decoderHarness();
  const result = timed.decode(new Blob(["synthetic"]), new AbortController().signal);
  const rejected = assert.rejects(result, error => error.code === "PHOTO_CONVERSION_FAILED");
  timed.timeout(); await rejected; assert(timed.worker().terminated);
  const success = decoderHarness(), bitmap = { width: 96, height: 64 };
  const decoded = success.decode(new Blob(["synthetic"]), new AbortController().signal);
  success.worker().onmessage({ data: { bitmap } });
  assert.equal(await decoded, bitmap); assert(success.worker().terminated);
});
