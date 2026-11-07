import { z } from "zod";
import { commandResultSchema, enquiryAssignmentSchema, noteSchema } from "@/features/contacts/ownership-contracts";
import { activityResultSchema, newActivitySchema } from "./contracts";

export type EntryTarget = { path: `/api/v1/${string}`; kind: "activity" | "note" | "assignment"; id: string; contactId?: string };
export type EntryBody = z.infer<typeof newActivitySchema> | z.infer<typeof noteSchema> | z.infer<typeof enquiryAssignmentSchema>;
export const entryResultSchema = z.union([activityResultSchema, commandResultSchema]);
export type EntryResult = z.infer<typeof entryResultSchema>;
export function entryTarget(path: `/api/v1/${string}`, contactId?: string): EntryTarget | undefined {
  const parts = path.split("/");
  if (parts.length !== 6 || parts[0] !== "" || parts[1] !== "api" || parts[2] !== "v1" || !z.uuid().safeParse(parts[4]).success) return;
  if (["enquiries", "deals"].includes(parts[3]) && parts[5] === "activities") return { path, kind: "activity", id: parts[4] };
  if (parts[3] === "contacts" && parts[5] === "notes") return { path, kind: "note", id: parts[4], contactId: parts[4] };
  if (parts[3] === "enquiries" && parts[5] === "assign" && z.uuid().safeParse(contactId).success) return { path, kind: "assignment", id: parts[4], contactId };
}
export function entryBody(target: EntryTarget, value: unknown): EntryBody {
  return (target.kind === "activity" ? newActivitySchema : target.kind === "note" ? noteSchema : enquiryAssignmentSchema).parse(value);
}
export function entryResultMatches(target: EntryTarget, result: EntryResult) {
  return target.kind === "activity" ? "id" in result : "contact_id" in result && result.contact_id === target.contactId && result.operation === (target.kind === "note" ? "notes" : "enquiry-assign");
}
