import { ApiError } from "@/lib/api/client";
import { maxFileBytes } from "./contracts";

export const photoAccept = "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";
const extensions = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);
const mimeTypes = new Set(["", "application/octet-stream", "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);

export function photoSourceKind(name: string, mime: string, header: Uint8Array): "raster" | "heif" {
  if (!extensions.has(name.split(".").at(-1)?.toLowerCase() ?? "") || !mimeTypes.has(mime.toLowerCase())) throw new ApiError("UNSUPPORTED_MEDIA_TYPE", 415);
  const ascii = (start: number, end: number) => String.fromCharCode(...header.slice(start, end));
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return "raster";
  if (header[0] === 0x89 && ascii(1, 4) === "PNG" && header[4] === 13 && header[5] === 10 && header[6] === 26 && header[7] === 10) return "raster";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "raster";
  if (ascii(4, 8) === "ftyp" && ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(ascii(8, 12))) return "heif";
  throw new ApiError("PHOTO_CONVERSION_FAILED", 415);
}

type DecodedPhoto = { source: CanvasImageSource; width: number; height: number; close: () => void };
const interrupted = () => new ApiError("FILE_TRANSFER_INTERRUPTED", 503);
let nativeWebp: Promise<boolean> | undefined;

function supportsNativeWebp() {
  return nativeWebp ??= new Promise<boolean>(resolve => {
    const probe = document.createElement("canvas"); probe.width = probe.height = 1;
    probe.toBlob(blob => { resolve(blob?.type === "image/webp"); probe.width = probe.height = 1; }, "image/webp");
  });
}

function bitmapPhoto(file: File, signal: AbortSignal): Promise<DecodedPhoto> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(interrupted()); return; }
    let settled = false;
    const cancel = () => { settled = true; reject(interrupted()); };
    signal.addEventListener("abort", cancel, { once: true });
    Promise.resolve().then(() => createImageBitmap(file)).then(bitmap => {
      signal.removeEventListener("abort", cancel);
      if (settled || signal.aborted) { bitmap.close(); reject(interrupted()); return; }
      settled = true;
      resolve({ source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() });
    }, reason => { signal.removeEventListener("abort", cancel); reject(reason); });
  });
}

function imagePhoto(file: File, signal: AbortSignal): Promise<DecodedPhoto> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(interrupted()); return; }
    const image = new Image();
    const url = URL.createObjectURL(file);
    const close = () => { image.src = ""; URL.revokeObjectURL(url); };
    const finish = () => { clearTimeout(timer); signal.removeEventListener("abort", cancel); image.onload = image.onerror = null; };
    const fail = () => { finish(); close(); reject(signal.aborted ? interrupted() : new ApiError("PHOTO_CONVERSION_FAILED", 415)); };
    const cancel = () => fail();
    const timer = setTimeout(fail, 20_000);
    signal.addEventListener("abort", cancel, { once: true });
    image.onerror = fail;
    image.onload = () => { finish(); resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight, close }); };
    image.src = url;
  });
}

export async function convertPropertyPhoto(file: File, signal: AbortSignal = new AbortController().signal): Promise<File> {
  if (signal.aborted) throw interrupted();
  if (file.size <= 0 || file.size > maxFileBytes) throw new ApiError("FILE_TOO_LARGE", 413);
  const kind = photoSourceKind(file.name, file.type, new Uint8Array(await file.slice(0, 32).arrayBuffer()));
  let decoded: DecodedPhoto;
  try { decoded = await bitmapPhoto(file, signal); }
  catch {
    if (signal.aborted) throw interrupted();
    try { decoded = await imagePhoto(file, signal); }
    catch {
      if (signal.aborted) throw interrupted();
      if (kind !== "heif") throw new ApiError("PHOTO_CONVERSION_FAILED", 415);
      const { decodeHeic } = await import("./decode-heic");
      const bitmap = await decodeHeic(file, signal);
      decoded = { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    }
  }
  const canvas = document.createElement("canvas");
  try {
    if (signal.aborted) throw interrupted();
    if (!decoded.width || !decoded.height || decoded.width * decoded.height > 25_000_000) throw new ApiError("PHOTO_CONVERSION_FAILED", 415);
    const scale = Math.min(1, 2560 / Math.max(decoded.width, decoded.height));
    canvas.width = Math.max(1, Math.round(decoded.width * scale));
    canvas.height = Math.max(1, Math.round(decoded.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new ApiError("PHOTO_CONVERSION_FAILED", 415);
    context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
    let blob: Blob;
    if (await supportsNativeWebp()) blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new ApiError("PHOTO_CONVERSION_FAILED", 415)), "image/webp", 0.82));
    else {
      const { encodeWebp } = await import("./encode-webp");
      blob = await encodeWebp(context.getImageData(0, 0, canvas.width, canvas.height), signal);
    }
    if (signal.aborted) throw interrupted();
    if (blob.type !== "image/webp" || !blob.size || blob.size > maxFileBytes) throw new ApiError("PHOTO_CONVERSION_FAILED", 415);
    const stem = file.name.replace(/\.[^.]+$/, "").replace(/[\\/:"<>|?*\p{C}]/gu, "-").trim().slice(0, 175) || "photo";
    return new File([blob], `${stem}.webp`, { type: "image/webp" });
  } finally { decoded.close(); canvas.width = canvas.height = 1; }
}
