import { z } from "zod";
import { frenchApiError } from "./errors";

const errorEnvelope = z.object({
  error: z.object({ code: z.string(), request_id: z.string().optional() }),
  responsible_agent: z.object({ display_name: z.string().max(160) }).strict().optional(),
  contacts: z.array(z.object({ id: z.uuid(), name: z.string().max(160) }).strict()).max(10).optional(),
  current: z.unknown().optional(),
});

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly requestId?: string,
    public readonly details?: z.infer<typeof errorEnvelope>,
  ) {
    super(frenchApiError(code));
    this.name = "ApiError";
  }
}

export async function apiGet<T>(
  path: `/api/v1/${string}`,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
  mutation?: { body: unknown; csrf?: string; method?: "POST" | "PATCH" | "PUT" | "DELETE"; key?: string; timeoutMs?: number },
): Promise<T> {
  const pathname = path.split("?", 1)[0];
  if (!/^\/api\/v1\/[a-zA-Z0-9/?=&_.%-]+$/.test(path) || !pathname || pathname.includes(".."))
    throw new TypeError("INVALID_API_PATH");
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      method: mutation ? mutation.method ?? "POST" : "GET",
      body: mutation ? JSON.stringify(mutation.body) : undefined,
      cache: "no-store",
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(mutation?.timeoutMs ?? 10_000)])
        : AbortSignal.timeout(mutation?.timeoutMs ?? 10_000),
      headers: { Accept: "application/json", ...(mutation ? { "Content-Type": "application/json" } : {}), ...(mutation?.csrf ? { "X-CSRF-Token": mutation.csrf } : {}), ...(mutation?.key ? { "Idempotency-Key": mutation.key } : {}) },
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = errorEnvelope.safeParse(body);
    if (parsed.success && parsed.data.error.code === "UNAUTHENTICATED" && typeof window !== "undefined")
      window.dispatchEvent(new Event("kay:session-expired"));
    throw new ApiError(
      parsed.success ? parsed.data.error.code : "DEPENDENCY_UNAVAILABLE",
      response.status,
      parsed.success ? parsed.data.error.request_id : undefined,
      parsed.success ? parsed.data : undefined,
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError("INVALID_RESPONSE", response.status);
  return parsed.data;
}

export function apiPost<T>(path: `/api/v1/${string}`, body: unknown, schema: z.ZodType<T>, csrf?: string) {
  return apiGet(path, schema, undefined, { body, csrf });
}
