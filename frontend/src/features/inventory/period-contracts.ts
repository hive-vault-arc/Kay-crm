import { z } from "zod";

const day = z.iso.date();
const version = z.number().int().positive();
const kind = z.enum(["booking", "closure"]);
export const periodLabels = { booking: "Réservation", closure: "Fermeture" } as const;
export const periodFirstDay = "2000-01-01";
export const periodLastBoundary = "2101-01-01";
const month = day.refine(value => value.endsWith("-01") && value >= periodFirstDay && value < periodLastBoundary);

export const propertyCalendarQuerySchema = z.object({ month }).strict();
const period = z.object({ id: z.uuid(), kind, start_on: day, end_on: day, note: z.string().max(500).nullable() }).strict();
export const propertyCalendarSchema = z.object({
  property_id: z.uuid(), version, month, today: day,
  undated_block: z.enum(["hold", "sold", "rented"]).nullable(),
  items: z.array(period).max(31),
}).strict().refine(value => {
  const next = new Date(value.month + "T12:00:00Z");
  next.setUTCMonth(next.getUTCMonth() + 1);
  const end = next.toISOString().slice(0, 10);
  return new Set(value.items.map(item => item.id)).size === value.items.length && value.items.every((item, index) =>
    item.start_on >= periodFirstDay && item.end_on <= periodLastBoundary && item.start_on < item.end_on &&
    item.start_on < end && item.end_on > value.month && (index === 0 || value.items[index - 1].end_on <= item.start_on));
});
export const savePropertyPeriodSchema = z.object({
  expected_version: version, kind, start_on: day, end_on: day, note: z.string().trim().max(500),
}).strict().refine(value => value.start_on >= periodFirstDay && value.end_on <= periodLastBoundary && value.start_on < value.end_on);
export const cancelPropertyPeriodSchema = z.object({ expected_version: version, reason: z.string().trim().min(1).max(500) }).strict();
export type PropertyPeriod = z.infer<typeof period>;
