import { policyEditSchema, policyPreviewSchema, policySaveSchema, type PolicyEdit } from "./contracts";
import type { z } from "zod";

export type PolicySaveBody = z.infer<typeof policySaveSchema>;
export const policyEditSignature = (body: PolicyEdit) => JSON.stringify(policyEditSchema.parse(body));
export function policyPreviewReceipt(body: PolicyEdit | PolicySaveBody, value: unknown) {
  const parsed = policyPreviewSchema.safeParse(value); if (!parsed.success) return;
  const result = parsed.data, expected = { company_car_capacity_per_hour: body.company_car_capacity_per_hour, working_windows: body.working_windows, lunch_breaks: body.lunch_breaks };
  const current = { company_car_capacity_per_hour: result.policy.company_car_capacity_per_hour, working_windows: result.policy.working_windows, lunch_breaks: result.policy.lunch_breaks };
  if (result.policy.version !== body.expected_version + 1 || JSON.stringify(expected) !== JSON.stringify(current)) return;
  if ("preview_hash" in body && body.preview_hash !== result.preview_hash) return;
  if (result.affected.length !== Math.min(result.affected_total, 100) || new Set(result.affected.map(row => row.id)).size !== result.affected.length || result.affected.some(row => !row.code || Date.parse(row.start_at) >= Date.parse(row.end_at))) return;
  return result;
}
