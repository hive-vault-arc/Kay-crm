import { z } from "zod";
import { apiGet, ApiError } from "@/lib/api/client";
import { meSchema } from "@/lib/auth/contracts";

export async function userCommand<T>(path: `/api/v1/${string}`, body: unknown, schema: z.ZodType<T>, key: string, method: "POST" | "PATCH" | "DELETE", options: { actorId: string; signal: AbortSignal; dispatched: () => void }) {
  const identity = await apiGet("/api/v1/auth/me", meSchema, options.signal);
  options.signal.throwIfAborted();
  if (identity.user.id !== options.actorId || identity.user.role !== "administrator") throw new ApiError("FORBIDDEN", 403);
  if (identity.must_change_password) throw new ApiError("PASSWORD_CHANGE_REQUIRED", 403);
  options.dispatched();
  return apiGet(path, schema, options.signal, { body, csrf: identity.csrf_token, key, method });
}
