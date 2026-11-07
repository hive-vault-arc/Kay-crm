import { randomUUID } from "node:crypto";

export function creationKeyResponse(dealId) {
  const issuedAt = Date.UTC(2026, 9, 29, 12), random = randomUUID().replaceAll("-", ""), hex = issuedAt.toString(16).padStart(12, "0") + "7" + random.slice(13);
  return { deal_id: dealId, key: `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`, expires_at: new Date(issuedAt + 300_000).toISOString() };
}
