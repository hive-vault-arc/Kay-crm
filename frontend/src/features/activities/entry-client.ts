import { apiGet, ApiError } from "@/lib/api/client";
import { meSchema } from "@/lib/auth/contracts";
import type { StaffRole } from "@/features/contacts/contracts";
import { entryResultSchema, type EntryBody, type EntryTarget } from "./entry-command";

export type EntryIdentity = { actorId?: string; role?: StaffRole };
export async function entryIdentity(target: EntryTarget, binding: EntryIdentity, signal: AbortSignal) {
  const identity = await apiGet("/api/v1/auth/me", meSchema, signal);
  signal.throwIfAborted();
  if (identity.must_change_password) throw new ApiError("PASSWORD_CHANGE_REQUIRED", 403);
  if (binding.actorId && identity.user.id !== binding.actorId || binding.role && identity.user.role !== binding.role || target.kind === "assignment" && identity.user.role === "agent") throw new ApiError("FORBIDDEN", 403);
  binding.actorId ??= identity.user.id; binding.role ??= identity.user.role;
  return identity;
}
export async function entryRequest(target: EntryTarget, body: EntryBody, key: string, binding: EntryIdentity, signal: AbortSignal, dispatched: () => void) {
  const identity = await entryIdentity(target, binding, signal);
  dispatched();
  const result = await apiGet(target.path, entryResultSchema, signal, { method: "POST", body, csrf: identity.csrf_token, key });
  if (!signal.aborted && typeof window !== "undefined") window.dispatchEvent(new Event("kay:command-saved"));
  return result;
}
