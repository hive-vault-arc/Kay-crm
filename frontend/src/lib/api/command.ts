import { z } from "zod";
import { apiGet } from "./client";
import { meSchema } from "@/lib/auth/contracts";

export async function apiCommand<T>(path: `/api/v1/${string}`, body: unknown, schema: z.ZodType<T>, key: string, method: "POST" | "PATCH" | "PUT" | "DELETE" = "POST", timeoutMs?: number) {
  const identity = await apiGet("/api/v1/auth/me", meSchema);
  const form = typeof document !== "undefined" ? document.activeElement?.closest<HTMLElement>("form, [role=dialog], [role=alertdialog]") : null;
  const result = await apiGet(path, schema, undefined, { body, csrf: identity.csrf_token, key, method, timeoutMs });
  if (form && !path.startsWith("/api/v1/realtime/")) {
    delete form.dataset.liveDirty;
    window.dispatchEvent(new Event("kay:command-saved"));
  }
  return result;
}
