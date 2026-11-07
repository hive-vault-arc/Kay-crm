import { z } from "zod";
import { confirmSchema, editOfferingSchema, newOfferingSchema, ownersSchema } from "./contracts";
import { archiveDevelopmentSchema, editDevelopmentSchema, structureFieldsSchema, typeFieldsSchema } from "./development-contracts";
import type { InventoryRecord } from "./record-scope";

export type RecordCommandScope = { root: "properties" | "developments"; id: string; version: number } & (
  { kind: "owners" } |
  { kind: "development-facts" } |
  { kind: "lifecycle"; operation: "archive" | "restore" } |
  { kind: "offering"; campaign: "sale" | "rental" | "holiday"; offeringId?: string; availability?: boolean } |
  { kind: "structure"; element: "blocks" | "floors" | "unit-types"; parent: string; itemId?: string }
);
export type RecordCommandIntent = { path: `/api/v1/${string}`; method: "POST" | "PATCH" | "PUT"; expectedVersion: number } & (
  { kind: "owners"; body: z.infer<typeof ownersSchema> } |
  { kind: "development-facts"; body: z.infer<typeof editDevelopmentSchema> } |
  { kind: "lifecycle"; body: z.infer<typeof archiveDevelopmentSchema> } |
  { kind: "offering-create"; body: z.infer<typeof newOfferingSchema> } |
  { kind: "offering-edit"; body: z.infer<typeof editOfferingSchema> } |
  { kind: "availability"; body: z.infer<typeof confirmSchema> } |
  { kind: "structure"; body: z.infer<typeof structureFieldsSchema> | z.infer<typeof typeFieldsSchema> }
);
export function recordCommandIntent(scope: RecordCommandScope, path: `/api/v1/${string}`, value: unknown, method: "POST" | "PATCH" | "PUT"): RecordCommandIntent | undefined {
  if (!["properties", "developments"].includes(scope.root) || !z.uuid().safeParse(scope.id).success || !Number.isSafeInteger(scope.version) || scope.version < 1) return;
  const common = { path, method };
  if (scope.kind === "lifecycle" && ["archive", "restore"].includes(scope.operation) && path === `/api/v1/${scope.root}/${scope.id}/${scope.operation}` && method === "POST") {
    const body = archiveDevelopmentSchema.safeParse(value); if (body.success) return { ...common, kind: "lifecycle", body: body.data, expectedVersion: body.data.expected_version };
  }
  if (scope.kind === "development-facts" && scope.root === "developments" && path === `/api/v1/developments/${scope.id}` && method === "PATCH") {
    const body = editDevelopmentSchema.safeParse(value); if (body.success) return { ...common, kind: "development-facts", body: body.data, expectedVersion: body.data.expected_version };
  }
  if (scope.kind === "owners" && path === `/api/v1/${scope.root}/${scope.id}/owners` && method === "PUT") {
    const body = ownersSchema.safeParse(value); if (body.success) return { ...common, kind: "owners", body: body.data, expectedVersion: body.data.expected_version };
  }
  if (scope.kind === "offering") {
    if (scope.root === "developments" && scope.campaign === "holiday" || scope.offeringId && !z.uuid().safeParse(scope.offeringId).success) return;
    if (scope.availability && scope.offeringId && path === `/api/v1/${scope.root}/${scope.id}/confirm-availability` && method === "POST") {
      const body = confirmSchema.safeParse(value); if (body.success && body.data.offering_id === scope.offeringId) return { ...common, kind: "availability", body: body.data, expectedVersion: body.data.expected_version };
    } else if (!scope.availability && scope.offeringId && path === `/api/v1/offerings/${scope.offeringId}` && method === "PATCH") {
      const body = editOfferingSchema.safeParse(value);
      if (body.success) { const version = scope.root === "properties" ? body.data.expected_property_version : body.data.expected_development_version, foreign = scope.root === "properties" ? body.data.expected_development_version : body.data.expected_property_version; if (version && foreign === undefined) return { ...common, kind: "offering-edit", body: body.data, expectedVersion: version }; }
    } else if (!scope.availability && !scope.offeringId && path === "/api/v1/offerings" && method === "POST") {
      const body = newOfferingSchema.safeParse(value);
      if (body.success && body.data.kind === scope.campaign) { const version = scope.root === "properties" ? body.data.expected_property_version : body.data.expected_development_version, own = scope.root === "properties" ? body.data.property_id : body.data.development_id, foreignId = scope.root === "properties" ? body.data.development_id : body.data.property_id, foreignVersion = scope.root === "properties" ? body.data.expected_development_version : body.data.expected_property_version; if (version && own === scope.id && !foreignId && foreignVersion === undefined) return { ...common, kind: "offering-create", body: body.data, expectedVersion: version }; }
    }
  }
  if (scope.kind === "structure" && scope.root === "developments" && z.uuid().safeParse(scope.parent).success && (scope.element === "floors" || scope.parent === scope.id)) {
    const expectedPath = scope.itemId ? `/api/v1/${scope.element}/${scope.itemId}` : `/api/v1/${scope.element === "floors" ? "blocks" : "developments"}/${scope.parent}/${scope.element}`;
    if (path !== expectedPath || method !== (scope.itemId ? "PATCH" : "POST") || scope.itemId && !z.uuid().safeParse(scope.itemId).success) return;
    const body = scope.element === "unit-types" ? typeFieldsSchema.safeParse(value) : structureFieldsSchema.safeParse(value);
    if (body.success && (!("development_id" in body.data) || body.data.development_id === scope.id)) return { ...common, kind: "structure", body: body.data, expectedVersion: body.data.expected_version };
  }
}

export function lifecycleReview(scope: { root: "properties" | "developments"; id: string; operation: "archive" | "restore" }, record: InventoryRecord): "ready" | "changed" | "stock" {
  if (record.id !== scope.id || (scope.root === "developments") !== ("unit_count" in record) || Boolean(record.archived_at) !== (scope.operation === "restore")) return "changed";
  if (scope.operation === "archive" && (record.offerings.some(offering => offering.is_current) || scope.root === "developments" && "unit_count" in record && record.unit_count > 0)) return "stock";
  return "ready";
}
