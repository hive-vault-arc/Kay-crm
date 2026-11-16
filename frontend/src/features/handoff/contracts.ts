import { z } from "zod";

export const coverageKind = z.enum(["enquiries", "deals"]);
export type CoverageKind = z.infer<typeof coverageKind>;
export const coverageProof = z.string().regex(/^[a-f0-9-]{36}\.[a-f0-9-]{36}\.\d{10}\.[a-f0-9]{64}$/);
const instant = z.iso.datetime({ offset: true });
const entry = z.object({ id: z.uuid(), author_name: z.string().max(160), body: z.string().max(4000), created_at: instant }).strict();
export const handoffNote = entry.extend({ seen_at: instant.nullable() });
export type HandoffNote = z.infer<typeof handoffNote>;
export const coverageNotes = z.object({ can_mark_seen: z.boolean(), items: z.array(handoffNote).max(50) }).strict();
export const coverageView = z.object({
  kind: coverageKind, id: z.uuid(), contact: z.string().max(160), title: z.string().max(160),
  responsible: z.string().max(160), status: z.string().max(24), rating: z.enum(["cold", "warm", "hot"]),
  budget: z.string().max(160).nullable(), context: z.string().max(4000), detail: z.string().max(4000),
  updated_at: instant, activities: z.array(entry).max(10), items: z.array(handoffNote).max(50),
}).strict();
export const coverLookup = z.object({
  kind: coverageKind, id: z.uuid(), label: z.string().max(160), responsible: z.string().max(160),
  href: z.string().max(230),
}).strict().refine(item => {
  const [path, proof, extra] = item.href.split("#");
  return path === `/handoff/${item.kind}/${item.id}` && !extra && coverageProof.safeParse(proof).success;
});
export const coverLookupList = z.array(coverLookup).max(50);
export const noteBody = z.string().trim().min(1).max(4000).regex(/^[^\x00]+$/);
export const noteReceipt = z.object({ id: z.uuid() }).strict();
export const noteSeen = z.object({ read: z.literal(true) }).strict();
