import { z } from "zod";
import { apiGet } from "./client";
import { meSchema } from "@/lib/auth/contracts";

export type CommandLifecycle = { beforeDispatch?: (identity: z.infer<typeof meSchema>) => void; dispatched?: () => void };
export async function apiCommand<T>(path: `/api/v1/${string}`, body: unknown, schema: z.ZodType<T>, key: string, method: "POST" | "PATCH" | "PUT" | "DELETE" = "POST", timeoutMs?: number, signal?: AbortSignal, lifecycle?: CommandLifecycle) {
  const identity = await apiGet("/api/v1/auth/me", meSchema, signal);
  signal?.throwIfAborted(); lifecycle?.beforeDispatch?.(identity);
  const form = typeof document !== "undefined" ? document.activeElement?.closest<HTMLElement>("form, [role=dialog], [role=alertdialog]") : null;
  lifecycle?.dispatched?.();
  const result = await apiGet(path, schema, signal, { body, csrf: identity.csrf_token, key, method, timeoutMs });
  if (form && !path.startsWith("/api/v1/realtime/")) {
    // A metadata reservation may be only one step of a managed form's command.
    // Its controller accepts the draft after the complete workflow succeeds.
    if (!form.hasAttribute("data-draft-managed")) delete form.dataset.liveDirty;
    window.dispatchEvent(new Event("kay:command-saved"));
  }
  return result;
}
