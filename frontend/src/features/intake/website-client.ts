import { z } from "zod";

export const receiptSchema = z.object({ receipt_id: z.uuid(), state: z.enum(["queued", "processed", "failed"]) }).strict();
export type Receipt = z.infer<typeof receiptSchema>;

export async function websiteRequest(path: "/submit" | "/receipt", body: string, signal: AbortSignal) {
  const response = await fetch(path, { method: "POST", credentials: "omit", cache: "no-store", redirect: "error", referrerPolicy: "no-referrer", headers: { "Content-Type": "application/json" }, body, signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]) });
  if (!response.ok) throw new Error(String(response.status));
  return receiptSchema.parse(await response.json());
}
