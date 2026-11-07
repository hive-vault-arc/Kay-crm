import type { Enquiry, StaffRole } from "@/features/contacts/contracts";
import type { Deal } from "@/features/deals/contracts";

export type LifecycleKind = "enquiries" | "deals";
export type LifecycleRecord = Enquiry | Deal;
export type LifecycleOperation = "archive" | "restore";
export type LifecycleScope = { kind: LifecycleKind; id: string; operation: LifecycleOperation };

export { lifecycleReceiptMatches } from "@/features/contacts/contracts";

export function recordLifecycleReview(scope: LifecycleScope, record: LifecycleRecord, actorId: string, role: StaffRole) {
  if (record.id !== scope.id || (scope.kind === "enquiries") !== ("assigned_agent" in record)) return "changed";
  if (record.contact.archived_at) return "contact";
  if (role === "agent" && ("assigned_agent" in record ? record.assigned_agent?.id : record.contact.primary_agent.id) !== actorId) return "authority";
  if (Boolean(record.archived_at) !== (scope.operation === "restore")) return "changed";
  return "ready";
}
