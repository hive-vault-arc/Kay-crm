import type { z } from "zod";
import { apiGet, ApiError } from "@/lib/api/client";
import { meSchema } from "@/lib/auth/contracts";
import type { StaffRole } from "./contracts";
import type { ChangeIntent, Operation } from "./ownership-contracts";

export type OwnershipIdentity = { actorId?: string; role: StaffRole };
export async function ownershipIdentity(binding: OwnershipIdentity, signal: AbortSignal, operation?: Operation) {
  const identity = await apiGet("/api/v1/auth/me", meSchema, signal);
  signal.throwIfAborted();
  if (identity.user.role !== binding.role || binding.actorId && identity.user.id !== binding.actorId || operation && operation !== "merge" && identity.user.role === "agent") throw new ApiError("FORBIDDEN", 403);
  if (identity.must_change_password) throw new ApiError("PASSWORD_CHANGE_REQUIRED", 403);
  binding.actorId ??= identity.user.id;
  return identity;
}

export async function ownershipRequest<T>(sourceId: string, action: Operation | "preview", body: ChangeIntent & { preview_token?: string }, schema: z.ZodType<T>, key: string, binding: OwnershipIdentity, signal: AbortSignal, dispatched?: () => void) {
  const identity = await ownershipIdentity(binding, signal, body.operation);
  dispatched?.();
  const result = await apiGet(`/api/v1/contacts/${sourceId}/${action}`, schema, signal, { body, csrf: identity.csrf_token, key, method: action === "collaborators" ? "PUT" : "POST" });
  if (action !== "preview" && !signal.aborted && typeof window !== "undefined") window.dispatchEvent(new Event("kay:command-saved"));
  return result;
}
