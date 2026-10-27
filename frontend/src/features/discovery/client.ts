import { apiGet, ApiError } from "@/lib/api/client";
import { meSchema } from "@/lib/auth/contracts";
import { permitSchema } from "./contracts";
import { transferError } from "@/features/files/transfers";

export async function downloadExport(id: string, signal?: AbortSignal) {
  const identity = await apiGet("/api/v1/auth/me", meSchema, signal);
  const permit = await apiGet(`/api/v1/exports/${id}/download-permit`, permitSchema, signal, { body: {}, csrf: identity.csrf_token });
  if (signal?.aborted) throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503);
  if (permit.export_id !== id) throw new ApiError("INVALID_RESPONSE", 502);
  let response: Response;
  try { response = await fetch(permit.transfer_url, { credentials: "omit", cache: "no-store", headers: { "X-File-Permit": permit.token, "X-File-Session": identity.csrf_token }, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000) }); }
  catch { throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503); }
  if (!response.ok) throw transferError(await response.json().catch(() => null), response.status);
  if (!response.headers.get("Content-Type")?.startsWith("text/csv") || Number(response.headers.get("Content-Length")) > 20971520) throw new ApiError("INVALID_RESPONSE", 502);
  const blob = await response.blob();
  if (signal?.aborted) throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503);
  if (blob.size > 20971520) throw new ApiError("INVALID_RESPONSE", 502);
  const url = URL.createObjectURL(blob), anchor = document.createElement("a");
  anchor.href = url; anchor.download = `kay-export-${id}.csv`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
