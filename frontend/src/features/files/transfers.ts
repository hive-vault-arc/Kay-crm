import { z } from "zod";
import { apiGet, ApiError } from "@/lib/api/client";
import { meSchema } from "@/lib/auth/contracts";
import { permitSchema, type TransferPermit } from "./contracts";

type BoundPermit = TransferPermit & { binding: string };
export async function requestFilePermit(body: { action: "upload" | "download"; document_id: string; expected_version: number; version_id?: string }): Promise<BoundPermit> {
  const identity = await apiGet("/api/v1/auth/me", meSchema);
  const permit = await apiGet("/api/v1/files/permits", permitSchema, undefined, { body, csrf: identity.csrf_token });
  return { ...permit, binding: identity.csrf_token };
}

const errorSchema = z.object({ error: z.object({ code: z.string().max(60) }) });
export function transferError(body: unknown, status: number): ApiError {
  const parsed = errorSchema.safeParse(body);
  if (status === 401) window.dispatchEvent(new Event("kay:session-expired"));
  return new ApiError(parsed.success ? parsed.data.error.code : "FILE_TRANSFER_INTERRUPTED", status);
}

export function uploadBytes(permit: BoundPermit, file: File, progress: (value: number) => void, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const cancel = () => xhr.abort();
    xhr.open("PUT", permit.transfer_url);
    xhr.withCredentials = false;
    xhr.timeout = 90_000;
    xhr.setRequestHeader("X-File-Permit", permit.token);
    xhr.setRequestHeader("X-File-Session", permit.binding);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = event => { if (event.lengthComputable) progress(Math.round(event.loaded * 100 / event.total)); };
    const clear = () => signal.removeEventListener("abort", cancel);
    xhr.onload = () => {
      clear();
      let body: unknown;
      try { body = JSON.parse(xhr.responseText); } catch { body = null; }
      if (xhr.status !== 200) { reject(transferError(body, xhr.status)); return; }
      const result = z.object({ state: z.literal("pending_scan"), version_id: z.uuid() }).strict().safeParse(body);
      if (!result.success || result.data.version_id !== permit.version_id) reject(new ApiError("INVALID_RESPONSE", 502));
      else resolve();
    };
    xhr.onerror = xhr.ontimeout = () => { clear(); reject(new ApiError("FILE_TRANSFER_INTERRUPTED", 503)); };
    xhr.onabort = () => { clear(); reject(new ApiError("FILE_TRANSFER_INTERRUPTED", 503)); };
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) { clear(); reject(new ApiError("FILE_TRANSFER_INTERRUPTED", 503)); return; }
    xhr.send(file);
  });
}

export async function downloadBytes(permit: BoundPermit): Promise<Blob> {
  let result: Response;
  try { result = await fetch(permit.transfer_url, { credentials: "omit", cache: "no-store", headers: { "X-File-Permit": permit.token, "X-File-Session": permit.binding }, signal: AbortSignal.timeout(90_000) }); }
  catch { throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503); }
  if (!result.ok) throw transferError(await result.json().catch(() => null), result.status);
  return result.blob();
}
