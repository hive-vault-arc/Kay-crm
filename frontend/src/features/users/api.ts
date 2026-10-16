import { z } from "zod";
import { apiGet } from "@/lib/api/client";
import { meSchema } from "@/lib/auth/contracts";

export async function userCommand<T>(path: `/api/v1/${string}`, body: unknown, schema: z.ZodType<T>, key: string, method: "POST" | "PATCH" = "POST") {
  const identity = await apiGet("/api/v1/auth/me", meSchema);
  return apiGet(path, schema, undefined, { body, csrf: identity.csrf_token, key, method });
}
