import { z } from "zod";
import { createPropertySchema, editPropertySchema } from "./contracts";

export type PropertyListingScope = { id?: string; developmentId?: string; version?: number };
export type PropertyListingIntent = { path: `/api/v1/${string}` } & (
  { mode: "create"; method: "POST"; body: z.infer<typeof createPropertySchema> } |
  { mode: "edit"; method: "PATCH"; id: string; body: z.infer<typeof editPropertySchema> }
);
export function propertyListingIntent(scope: PropertyListingScope, path: `/api/v1/${string}`, value: unknown, method: "POST" | "PATCH"): PropertyListingIntent | undefined {
  if (scope.developmentId !== undefined && !z.uuid().safeParse(scope.developmentId).success || scope.id !== undefined && !z.uuid().safeParse(scope.id).success || scope.id === undefined && scope.version !== undefined) return;
  if (scope.id) {
    if (!z.uuid().safeParse(scope.id).success || !Number.isSafeInteger(scope.version) || (scope.version ?? 0) < 1 || path !== `/api/v1/properties/${scope.id}` || method !== "PATCH") return;
    const parsed = editPropertySchema.safeParse(value); if (parsed.success && (parsed.data.development_id ?? null) === (scope.developmentId ?? null)) return { path, method, mode: "edit", id: scope.id, body: parsed.data };
  } else if (path === "/api/v1/properties" && method === "POST") {
    const parsed = createPropertySchema.safeParse(value); if (parsed.success && (parsed.data.development_id ?? null) === (scope.developmentId ?? null)) return { path, method, mode: "create", body: parsed.data };
  }
}
