import { apiGet, ApiError } from "@/lib/api/client";
import { meSchema } from "@/lib/auth/contracts";
import { exportSchema } from "./contracts";
import type { ExportReview } from "./export-review";

export async function createExportJob(body: ExportReview["body"], key: string, binding: { actorId?: string }, signal: AbortSignal, dispatched: () => void) {
  const identity = await apiGet("/api/v1/auth/me", meSchema, signal);
  signal.throwIfAborted();
  if (identity.user.role === "agent" || binding.actorId && binding.actorId !== identity.user.id) throw new ApiError("FORBIDDEN", 403);
  if (identity.must_change_password) throw new ApiError("PASSWORD_CHANGE_REQUIRED", 403);
  binding.actorId ??= identity.user.id;
  dispatched();
  const result = await apiGet("/api/v1/exports", exportSchema, signal, { body, csrf: identity.csrf_token, key, method: "POST" });
  if (result.kind !== body.kind) throw new ApiError("INVALID_RESPONSE", 503);
  if (!signal.aborted && typeof window !== "undefined") window.dispatchEvent(new Event("kay:command-saved"));
  return result;
}
