import { z } from "zod";
import { periodQuery, pageQuery } from "./contracts";

export const workspaceMetric = z.enum(["enquiries", "active_deals", "upcoming_visits", "follow_ups"]);
export const workspaceQuery = periodQuery.safeExtend({ assigned_agent_id: z.uuid().optional() }).refine(value => !value.start_on || !value.end_on || (value.start_on >= "1900-01-01" && value.end_on <= "2100-12-31"));
export const workspaceRecordsQuery = workspaceQuery.safeExtend({ ...pageQuery, metric: workspaceMetric });
export const workspaceAgentsQuery = z.object({ ...pageQuery, q: z.string().trim().max(160).optional() }).strict();
const count = z.number().int().nonnegative();
const instant = z.iso.datetime({ offset: true });
const meta = {
  now: instant, today: z.iso.date(), time_zone: z.literal("Africa/Casablanca"),
  start_on: z.iso.date(), end_on: z.iso.date(), scope: z.enum(["agency", "assigned_or_shared"]),
  assigned_agent_id: z.uuid().nullable(),
};
const total = z.object({ total: count }).strict();
const compared = total.extend({ previous_total: count.nullable() });
const campaign = z.object({
  id: z.uuid(), kind: z.enum(["sale", "rental", "holiday"]),
  state: z.enum(["draft", "available", "reserved", "sold", "rented", "review"]),
  price_mad: z.string().regex(/^\d{1,16}\.\d{2}$/).nullable(),
  price_period: z.enum(["day", "week", "month", "year"]).nullable(),
}).strict();
const property = z.object({
  id: z.uuid(), kind: z.enum(["property", "development"]), reference: z.string().min(1).max(80),
  label: z.string().min(1).max(160), category: z.enum(["villa", "house", "apartment", "land", "commercial", "riad", "room", "office", "farm", "mixed"]),
  location: z.string().max(500).nullable(), deal_count: z.number().int().positive(), campaigns: z.array(campaign).max(3),
}).strict();
const visit = z.object({
  id: z.uuid(), title: z.string().min(1).max(160), type: z.enum(["company_car", "without_company_car", "office"]),
  status: z.enum(["scheduled", "confirmed"]), start_at: instant, end_at: instant, start_local: instant, end_local: instant,
  location: z.string().max(1000), property_id: z.uuid().nullable(), contact_name: z.string().max(160), organizer_name: z.string().max(160),
}).strict();
const followUp = z.object({ id: z.uuid(), name: z.string().max(160), agent_name: z.string().max(160), received_at: instant }).strict();
const taskHref = z.string().regex(/^\/(?:contacts|leads|deals)\/[a-f0-9-]{36}\?task=[a-f0-9-]{36}$/);
const task = z.object({ id: z.uuid(), title: z.string().min(1).max(160), owner_name: z.string().max(160), due_at: instant, due_local: instant, href: taskHref }).strict();
const teamMember = z.object({ id: z.uuid(), display_name: z.string().max(160), enquiries: count, deals: count }).strict();
const preview = <T extends z.ZodType>(item: T, maximum: number) => total.extend({ items: z.array(item).max(maximum) });

export const workspaceSchema = z.object({
  ...meta,
  previous_period: z.object({ start_on: z.iso.date(), end_on: z.iso.date() }).strict().nullable(),
  kpis: z.object({ enquiries: compared, active_deals: total, upcoming_visits: total, follow_ups: compared }).strict(),
  pipeline: z.object({ new: count, visit: count, negotiation: count, documents: count, reserved: count }).strict(),
  outcomes: z.object({ won: count, lost: count, cancelled: count }).strict(),
  visits: preview(visit, 2), follow_ups: preview(followUp, 3), inventory: preview(property, 3),
  tasks: preview(task, 3).extend({ overdue_total: count }), team: preview(teamMember, 3),
}).strict().superRefine((value, context) => {
  const invalid = Object.values(value.pipeline).reduce((sum, current) => sum + current, 0) !== value.kpis.active_deals.total
    || value.visits.total !== value.kpis.upcoming_visits.total || value.follow_ups.total !== value.kpis.follow_ups.total
    || value.tasks.overdue_total > value.tasks.total
    || [value.visits, value.follow_ups, value.inventory, value.tasks, value.team].some(part => part.items.length > part.total)
    || [value.kpis.enquiries, value.kpis.follow_ups].some(metric => Boolean(value.previous_period) !== (metric.previous_total !== null));
  if (invalid) context.addIssue({ code: "custom", message: "INCONSISTENT_WORKSPACE_TOTALS" });
});
const pages = { total: count, page: z.number().int().positive(), page_size: z.number().int().min(1).max(100), has_next: z.boolean(), has_previous: z.boolean() };
export const workspaceRecordsSchema = z.object({ ...meta, ...pages, metric: workspaceMetric, items: z.array(z.object({
  id: z.uuid(), label: z.string().max(160), kind: z.enum(["enquiry", "deal", "visit"]),
  href: z.string().regex(/^\/(?:leads|deals|visits)\/[a-f0-9-]{36}$/), attribution_label: z.string().max(160).nullable(),
}).strict()).max(100) }).strict();
export const workspaceAgentsSchema = z.object({ ...pages, items: z.array(z.object({ id: z.uuid(), display_name: z.string().max(160) }).strict()).max(100) }).strict();
export type Workspace = z.infer<typeof workspaceSchema>;
export type WorkspaceMetric = z.infer<typeof workspaceMetric>;
