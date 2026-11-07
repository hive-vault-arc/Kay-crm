import { ApiError } from "@/lib/api/client";

export function encodeWebp(image: ImageData, signal: AbortSignal): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new ApiError("FILE_TRANSFER_INTERRUPTED", 503)); return; }
    const worker = new Worker("/webp/encoder-worker.js", { type: "module" });
    let settled = false;
    const finish = () => { clearTimeout(timer); signal.removeEventListener("abort", cancel); worker.terminate(); };
    const fail = (code: string) => { if (settled) return; settled = true; finish(); reject(new ApiError(code, code === "FILE_TRANSFER_INTERRUPTED" ? 503 : 415)); };
    const cancel = () => fail("FILE_TRANSFER_INTERRUPTED");
    const timer = setTimeout(() => fail("PHOTO_CONVERSION_FAILED"), 45_000);
    worker.onmessage = (event: MessageEvent<{ buffer?: ArrayBuffer }>) => {
      if (settled) return;
      settled = true; finish();
      if (!(event.data.buffer instanceof ArrayBuffer) || !event.data.buffer.byteLength) reject(new ApiError("PHOTO_CONVERSION_FAILED", 415));
      else resolve(new Blob([event.data.buffer], { type: "image/webp" }));
    };
    worker.onerror = event => { event.preventDefault(); fail("PHOTO_CONVERSION_FAILED"); };
    signal.addEventListener("abort", cancel, { once: true });
    try { worker.postMessage(image, [image.data.buffer]); }
    catch { fail("PHOTO_CONVERSION_FAILED"); }
  });
}
