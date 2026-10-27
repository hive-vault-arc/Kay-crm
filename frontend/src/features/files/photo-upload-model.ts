import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { documentSchema, maxFileBytes, type ProtectedDocument } from "./contracts";
import { requestFilePermit, uploadBytes } from "./transfers";

export const photoLimit = 10;
const sourceTypes = new Map([["jpg", "image/jpeg"], ["jpeg", "image/jpeg"], ["png", "image/png"], ["webp", "image/webp"]]);
export const photoDenied = (error: ApiError) => [401, 403, 404].includes(error.status);
export function photoSelectionError(file: File) {
  if (file.size <= 0 || file.size > maxFileBytes) return new ApiError("FILE_TOO_LARGE", 413);
  if (sourceTypes.get(file.name.split(".").at(-1)?.toLowerCase() ?? "") !== file.type) return new ApiError("UNSUPPORTED_MEDIA_TYPE", 415);
}

export async function convertPropertyPhoto(file: File): Promise<File> {
  const invalid = photoSelectionError(file); if (invalid) throw invalid;
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new ApiError("PHOTO_CONVERSION_FAILED", 415); }
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 25_000_000) throw new ApiError("PHOTO_CONVERSION_FAILED", 415);
    const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height)), canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d"); if (!context) throw new ApiError("PHOTO_CONVERSION_FAILED", 415);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new ApiError("PHOTO_CONVERSION_FAILED", 415)), "image/webp", 0.82));
    if (blob.type !== "image/webp" || !blob.size || blob.size > maxFileBytes) throw new ApiError("PHOTO_CONVERSION_FAILED", 415);
    const stem = file.name.replace(/\.[^.]+$/, "").replace(/[\\/:"<>|?*\p{C}]/gu, "-").trim().slice(0, 175) || "photo";
    return new File([blob], `${stem}.webp`, { type: "image/webp" });
  } finally { bitmap.close(); }
}

export type PhotoAttempt = { key: string; documentId: string; started: boolean; context?: string; source?: File; converted?: File };
export const newPhotoAttempt = (): PhotoAttempt => ({ key: "", documentId: "", started: false });
export type PhotoPhase = "preparing" | "authorizing" | "uploading";
export function photoCanResume(photo: ProtectedDocument, writable: boolean) {
  return !photo.archived && (photo.can_upload === true || photo.can_upload === undefined && writable) && (!photo.versions[0] || photo.versions[0].state === "awaiting_upload");
}

// An attempt owns its exact converted bytes/key until success or explicit discard.
export async function sendPhoto({ attempt, file, parentKind, parentId, resume, writable, signal, progress, phase, reserved }: {
  attempt: PhotoAttempt; file: File; parentKind: "property" | "development"; parentId: string; resume?: ProtectedDocument; writable: boolean;
  signal: AbortSignal; progress: (value: number) => void; phase: (value: PhotoPhase) => void; reserved: () => void;
}) {
  signal.throwIfAborted(); const invalid = photoSelectionError(file); if (invalid) throw invalid;
  const context = JSON.stringify({ parentKind, parentId, resume: resume?.id ?? "" });
  if (attempt.context && attempt.context !== context) throw new ApiError("INVALID_RESPONSE", 502);
  attempt.context = context;
  if (attempt.source && attempt.source !== file) throw new ApiError("FILE_SIZE_MISMATCH", 422);
  attempt.source = file; phase("preparing");
  // Historical JPEG/PNG metadata must be resumed with its original exact file,
  // never silently replaced by a WebP with a different name/type/size.
  const legacy = resume && resume.mime_type !== "image/webp";
  const converted = attempt.converted ?? (legacy ? file : await convertPropertyPhoto(file));
  attempt.converted = converted; signal.throwIfAborted();
  const matches = (photo: ProtectedDocument) => photo.filename === converted.name && photo.mime_type === converted.type && photo.size_bytes === converted.size && photo.purpose === (resume?.purpose ?? "photo");
  if (resume && !matches(resume)) throw new ApiError("FILE_SIZE_MISMATCH", 422);
  phase("authorizing");
  const existingId = resume?.id ?? attempt.documentId;
  let current: ProtectedDocument;
  if (existingId) {
    current = await apiGet(`/api/v1/documents/${existingId}`, documentSchema, signal);
    if (current.id !== existingId) throw new ApiError("INVALID_RESPONSE", 502);
  } else {
    if (!attempt.key) attempt.key = crypto.randomUUID(); attempt.started = true; reserved();
    current = await apiCommand("/api/v1/documents", { parent_kind: parentKind, parent_id: parentId, purpose: "photo", filename: converted.name, mime_type: converted.type, size_bytes: converted.size }, documentSchema, attempt.key, "POST", undefined, signal);
    if (!matches(current)) throw new ApiError("INVALID_RESPONSE", 502);
    attempt.documentId = current.id; signal.throwIfAborted();
    // A replayed creation receipt may predate another transfer or role change.
    const receiptId = current.id;
    current = await apiGet(`/api/v1/documents/${receiptId}`, documentSchema, signal);
    if (current.id !== receiptId) throw new ApiError("INVALID_RESPONSE", 502);
  }
  if (!matches(current)) throw new ApiError("FILE_SIZE_MISMATCH", 422);
  attempt.documentId = current.id; attempt.started = true; reserved(); signal.throwIfAborted();
  if (current.archived) throw new ApiError("NOT_FOUND", 404);
  const latest = current.versions[0];
  // A previous transfer may have committed despite a lost acknowledgement.
  // Observe its real state instead of appending duplicate bytes/versions.
  if (latest && latest.state !== "awaiting_upload") return { documentId: current.id, state: latest.state, recovered: true };
  // Older responses omit the optional capability. Only this form's own accepted
  // creation may continue to the authoritative permit without that flag.
  if (current.can_upload === false || !writable && resume && current.can_upload !== true) throw new ApiError("FORBIDDEN", 403);
  const permit = await requestFilePermit({ action: "upload", document_id: current.id, expected_version: current.version }, signal);
  signal.throwIfAborted(); phase("uploading"); await uploadBytes(permit, converted, progress, signal); signal.throwIfAborted();
  return { documentId: current.id, state: "pending_scan" as const, recovered: false };
}
