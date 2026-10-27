import type { z } from "zod";
import { apiGet, ApiError } from "@/lib/api/client";
import { meSchema } from "@/lib/auth/contracts";
import { transferError } from "@/features/files/transfers";
import { batchPageSchema, batchSchema, createSchema, permitSchema } from "./contracts";

export async function importCommand<T>(path: `/api/v1/imports${string}`, body: unknown, schema: z.ZodType<T>, key?: string, signal?: AbortSignal) {
  if (signal?.aborted) throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503);
  const identity = await apiGet("/api/v1/auth/me", meSchema, signal);
  if (signal?.aborted) throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503);
  return apiGet(path, schema, signal, { body, key, csrf: identity.csrf_token, timeoutMs: 70_000 });
}
export async function uploadImport(file: File, attempt: { key: string; batchId: string }, progress: (value: number) => void, signal: AbortSignal) {
  if (!createSchema.safeParse({ filename: file.name, size_bytes: file.size }).success) throw new ApiError("IMPORT_FILE_INVALID", 422);
  if (signal.aborted) throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503);
  const identity = await apiGet("/api/v1/auth/me", meSchema, signal);
  if (!attempt.batchId) attempt.batchId = (await importCommand("/api/v1/imports", { filename: file.name, size_bytes: file.size }, batchSchema, attempt.key, signal)).id;
  const batch = await apiGet(`/api/v1/imports/${attempt.batchId}?page_size=1`, batchPageSchema, signal);
  if (batch.id !== attempt.batchId) throw new ApiError("INVALID_RESPONSE", 502);
  if (batch.filename !== file.name || batch.size_bytes !== file.size) throw new ApiError("IMPORT_FILE_INVALID", 422);
  if (!["awaiting_upload", "uploading"].includes(batch.state)) return attempt.batchId;
  const permit = await apiGet(`/api/v1/imports/${attempt.batchId}/upload-permit`, permitSchema, signal, { body: {}, csrf: identity.csrf_token });
  if (permit.batch_id !== attempt.batchId) throw new ApiError("INVALID_RESPONSE", 502);
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
