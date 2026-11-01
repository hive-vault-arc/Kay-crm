import { ApiError } from "@/lib/api/client";

export function decodeHeic(file: Blob, signal: AbortSignal): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new ApiError("FILE_TRANSFER_INTERRUPTED", 503)); return; }
    const worker = new Worker("/heic/decoder-worker.js", { type: "module" });
    let settled = false;
    const finish = () => { clearTimeout(timer); signal.removeEventListener("abort", cancel); worker.terminate(); };
    const fail = (code: string) => { if (settled) return; settled = true; finish(); reject(new ApiError(code, code === "FILE_TRANSFER_INTERRUPTED" ? 503 : 415)); };
    const cancel = () => fail("FILE_TRANSFER_INTERRUPTED");
    const timer = setTimeout(() => fail("PHOTO_CONVERSION_FAILED"), 45_000);
    worker.onmessage = (event: MessageEvent<{ bitmap?: ImageBitmap }>) => {
      if (settled) { event.data.bitmap?.close(); return; }
      settled = true;
      finish();
      if (!event.data.bitmap) reject(new ApiError("PHOTO_CONVERSION_FAILED", 415));
      else resolve(event.data.bitmap);
    };
    worker.onerror = event => { event.preventDefault(); fail("PHOTO_CONVERSION_FAILED"); };
    signal.addEventListener("abort", cancel, { once: true });
    try { worker.postMessage(file.slice()); }
    catch { fail("PHOTO_CONVERSION_FAILED"); }
  });
}
