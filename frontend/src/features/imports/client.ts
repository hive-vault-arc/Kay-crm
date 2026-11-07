import type { z } from "zod";
import { apiGet, ApiError } from "@/lib/api/client";
import { meSchema } from "@/lib/auth/contracts";
import { transferError } from "@/features/files/transfers";
import { batchPageSchema, batchSchema, createSchema, permitSchema } from "./contracts";

export type ImportActorBinding = { actorId?: string };
export type ImportUploadAttempt = ImportActorBinding & { key: string; batchId: string; metadataDispatched?: boolean };
async function importer(signal?: AbortSignal, binding?: ImportActorBinding) {
  if (signal?.aborted) throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503);
  const identity = await apiGet("/api/v1/auth/me", meSchema, signal);
  if (signal?.aborted) throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503);
  if (identity.user.role === "agent" || binding?.actorId && binding.actorId !== identity.user.id) throw new ApiError("FORBIDDEN", 403);
  if (identity.must_change_password) throw new ApiError("PASSWORD_CHANGE_REQUIRED", 403);
  if (binding) binding.actorId ??= identity.user.id;
  return identity;
}
export async function importCommand<T>(path: `/api/v1/imports${string}`, body: unknown, schema: z.ZodType<T>, key?: string, signal?: AbortSignal, options?: { binding: ImportActorBinding; dispatched?: () => void }) {
  const identity = await importer(signal, options?.binding);
  options?.dispatched?.();
  return apiGet(path, schema, signal, { body, key, csrf: identity.csrf_token, timeoutMs: 70_000 });
}
export async function uploadImport(file: File, attempt: ImportUploadAttempt, progress: (value: number) => void, signal: AbortSignal) {
  if (!createSchema.safeParse({ filename: file.name, size_bytes: file.size }).success) throw new ApiError("IMPORT_FILE_INVALID", 422);
  if (signal.aborted) throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503);
  await importer(signal, attempt);
  if (!attempt.batchId) {
    const created = await importCommand("/api/v1/imports", { filename: file.name, size_bytes: file.size }, batchSchema, attempt.key, signal, { binding: attempt, dispatched: () => { attempt.metadataDispatched = true; } });
    if (signal.aborted) throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503);
    if (created.filename !== file.name || created.size_bytes !== file.size) throw new ApiError("INVALID_RESPONSE", 502);
    attempt.batchId = created.id;
  }
  const batch = await apiGet(`/api/v1/imports/${attempt.batchId}?page_size=1`, batchPageSchema, signal);
  if (batch.id !== attempt.batchId) throw new ApiError("INVALID_RESPONSE", 502);
  if (batch.filename !== file.name || batch.size_bytes !== file.size) throw new ApiError("IMPORT_FILE_INVALID", 422);
  if (signal.aborted) throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503);
  if (!["awaiting_upload", "uploading"].includes(batch.state)) return attempt.batchId;
  const identity = await importer(signal, attempt);
  const permit = await apiGet(`/api/v1/imports/${attempt.batchId}/upload-permit`, permitSchema, signal, { body: {}, csrf: identity.csrf_token });
  if (permit.batch_id !== attempt.batchId) throw new ApiError("INVALID_RESPONSE", 502);
  if (signal.aborted) throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503);
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest(), cancel = () => xhr.abort(), clear = () => signal.removeEventListener("abort", cancel);
    xhr.open("PUT", permit.transfer_url); xhr.withCredentials = false; xhr.timeout = 90_000;
    xhr.setRequestHeader("Content-Type", "text/csv"); xhr.setRequestHeader("X-File-Permit", permit.token); xhr.setRequestHeader("X-File-Session", identity.csrf_token);
    xhr.upload.onprogress = event => { if (event.lengthComputable) progress(Math.round(event.loaded * 100 / event.total)); };
    xhr.onload = () => { clear(); let body: unknown; try { body = JSON.parse(xhr.responseText); } catch { body = null; } if (xhr.status !== 200) reject(transferError(body, xhr.status)); else if (!body || typeof body !== "object" || !("batch_id" in body) || body.batch_id !== permit.batch_id || !("state" in body) || body.state !== "uploaded") reject(new ApiError("INVALID_RESPONSE", 502)); else resolve(); };
    xhr.onerror = xhr.ontimeout = xhr.onabort = () => { clear(); reject(new ApiError("FILE_TRANSFER_INTERRUPTED", 503)); };
    signal.addEventListener("abort", cancel, { once: true }); if (signal.aborted) { clear(); reject(new ApiError("FILE_TRANSFER_INTERRUPTED", 503)); } else xhr.send(file);
  });
  return attempt.batchId;
}
