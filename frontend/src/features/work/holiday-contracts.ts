import { z } from "zod";
import { formatBusinessDate } from "@/lib/format";

const instant = z.iso.datetime({ offset: true });
const civilDate = z.iso.date();
const version = z.number().int().positive();
const officialSource = z.url({ protocol: /^https$/, hostname: /^(?:www\.)?(?:habous\.gov\.ma|maroc\.ma)$/ }).max(2048);
const holiday = z.object({
  id: z.uuid(), year: z.number().int(), name: z.string().min(1).max(160),
  category: z.enum(["national", "amazigh", "religious"]),
  status: z.enum(["pending", "estimated", "fixed", "confirmed", "manual"]),
  start_on: civilDate.nullable(), end_on: civilDate.nullable(),
  source_url: z.url({ protocol: /^https$/, hostname: /^(?:www\.)?(?:habous\.gov\.ma|maroc\.ma|moroccoapi\.dev|agendamaroc\.com)$/ }),
  version,
}).strict();
const sync = z.object({
  provider: z.enum(["moroccoapi", "agenda"]),
  year: z.number().int(), attempted_at: instant, succeeded_at: instant.nullable(),
  error_code: z.enum(["UNSUPPORTED_YEAR", "FEED_UNAVAILABLE", "INVALID_FEED"]).nullable(),
}).strict();

export const holidaySettingsSchema = z.object({
  enabled: z.boolean(), items: z.array(holiday), sync: z.array(sync),
}).strict();
export const holidayConfirmationSchema = z.object({
  expected_version: version, start_on: civilDate, end_on: civilDate, source_url: officialSource,
}).strict();
export type Holiday = z.infer<typeof holiday>;

export function holidaySpan(start: string, end: string) {
  return start === end ? formatBusinessDate(start) : `${formatBusinessDate(start)} – ${formatBusinessDate(end)}`;
}

export function holidayNotice(item: { start_on: string; end_on: string; estimated: boolean; corrected: boolean }) {
  return [
    holidaySpan(item.start_on, item.end_on),
    item.corrected ? "Date corrigée" : null,
    item.estimated ? "Date prévisionnelle" : null,
  ].filter(Boolean).join(" · ");
}
