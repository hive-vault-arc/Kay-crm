import { z } from "zod";
import { dashboardSchema, metricKey, periodQuery, type Metric, type MetricKey } from "./contracts";
import type { Selection } from "./drill-down";
import type { drillSchema, exceptionsSchema } from "./contracts";

export const reportGroups = [
  { title: "Activité commerciale", icon: "activity", keys: ["enquiries", "active_deals", "won", "lost", "cancelled", "activities"] },
  { title: "Portefeuille et inventaire", icon: "inventory", keys: ["contacts", "developments", "standalone", "units", "property_offerings", "development_offerings"] },
  { title: "Finance", icon: "finance", keys: ["collections"] },
] as const;

export const reportTitles: Record<MetricKey, string> = {
  contacts: "Contacts actifs", enquiries: "Demandes reçues", active_deals: "Affaires actives",
  won: "Affaires gagnées", lost: "Affaires perdues", cancelled: "Affaires annulées",
  activities: "Activités consignées", developments: "Programmes", standalone: "Biens indépendants",
  units: "Unités physiques", property_offerings: "Offres des biens et unités",
  development_offerings: "Offres des programmes", collections: "Encaissements",
};
export const attributionTitles = {
  contacts: "Contacts · responsable actuel", won: "Gagnées · responsable à la clôture", activities: "Activités · auteur",
} as const;
export type AttributionMetric = keyof typeof attributionTitles;
export type ReportPeriod = { start_on?: string; end_on?: string };
const periodKeys: MetricKey[] = ["enquiries", "won", "lost", "cancelled", "activities", "collections"];

export const reportPeriodQuery = periodQuery.refine(value =>
  (!value.start_on || value.start_on >= "1900-01-01") && (!value.end_on || value.end_on <= "2100-12-31"));

export function coherentMetric(value: Metric) {
  const financial = value.key === "collections", attributed = value.key in attributionTitles;
  return value.unit === (financial ? "MAD" : "count") && value.basis === (periodKeys.includes(value.key) ? "period" : "current")
    && (financial ? /^\d+\.\d{2}$/.test(value.value) : value.value === String(value.total))
    && new Set(value.series.map(point => point.id)).size === value.series.length
    && (attributed ? value.series.reduce((total, point) => total + point.value, 0) === value.total : value.series.length === 0);
}

export const selectedReportSchema = dashboardSchema.superRefine((value, context) => {
  const expected = metricKey.options.filter(key => key !== "collections" || value.scope === "agency");
  if (value.metrics.length !== expected.length || new Set(value.metrics.map(item => item.key)).size !== expected.length
    || !expected.every(key => value.metrics.some(item => item.key === key)) || !value.metrics.every(coherentMetric)
    || !reportPeriodQuery.safeParse({ start_on: value.start_on, end_on: value.end_on }).success) {
    context.addIssue({ code: "custom", message: "REPORT_PROJECTION_MISMATCH" });
  }
});

export function matchesReportPeriod(value: Required<ReportPeriod>, period: ReportPeriod) {
  return (!period.start_on || period.start_on === value.start_on) && (!period.end_on || period.end_on === value.end_on);
}

function coherentPage(value: { page: number; page_size: number; total: number; has_next: boolean; has_previous: boolean; items: { id: string }[] }, page: number) {
  return value.page === page && value.page_size === 10
    && value.has_previous === (page > 1) && value.has_next === (page * 10 < value.total)
    && value.items.length === Math.min(10, Math.max(0, value.total - (page - 1) * 10))
    && new Set(value.items.map(item => item.id)).size === value.items.length;
}

const rowKinds: Record<MetricKey, string> = {
  contacts: "contact", enquiries: "enquiry", active_deals: "deal", won: "outcome", lost: "outcome", cancelled: "outcome",
  activities: "activity", developments: "development", standalone: "property", units: "property",
  property_offerings: "property", development_offerings: "development", collections: "receipt",
};
function coherentLink(item: { kind: string; href: string }) {
  const prefix: Record<string, string> = { contact: "contacts", enquiry: "leads", deal: "deals", outcome: "deals", activity: "contacts", development: "projects", property: "projects/properties", receipt: "deals" };
  return !!prefix[item.kind] && new RegExp(`^/${prefix[item.kind]}/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}${item.kind === "receipt" ? "\\?tab=finance" : ""}$`).test(item.href);
}

export function matchesDrill(value: z.infer<typeof drillSchema>, selection: Selection, page: number) {
  return coherentPage(value, page) && matchesReportPeriod(value, selection)
    && value.metric.key === selection.metric && value.metric.total === value.total && coherentMetric(value.metric)
    && (selection.metric !== "collections" || value.scope === "agency")
    && value.items.every(item => item.kind === rowKinds[selection.metric] && coherentLink(item)
      && (!["contacts", "enquiries", "active_deals", "developments", "standalone", "units"].includes(selection.metric) || item.href.endsWith(`/${item.id}`))
      && (selection.metric !== "collections" || /^\d+(?:\.\d{1,2})?$/.test(item.value)));
}

export function matchesExceptions(value: z.infer<typeof exceptionsSchema>, kind: "stale_inventory" | "inactive_deals", page: number) {
  const threshold = kind === "stale_inventory" ? 30 : 14;
  return coherentPage(value, page) && value.kind === kind && value.threshold_days === threshold
    && value.items.every(item => item.age_days >= threshold && coherentLink(item)
      && (kind === "inactive_deals" ? item.kind === "deal" : ["property", "development"].includes(item.kind)));
}
