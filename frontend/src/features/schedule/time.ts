import { apiGet } from "@/lib/api/client";
import { queryPath } from "@/features/contacts/use-query";
import { localTimeSchema } from "./contracts";

export async function resolveLocal(local: string) {
  return apiGet(queryPath("calendar/local-time", { local }), localTimeSchema);
}
export function civilDay(value: string, offset = 0) {
  const day = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().slice(0, 10);
}
export function localLabel(value: string) {
  const [date, rest] = value.split("T");
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year} à ${rest.slice(0, 5)} (UTC${rest.endsWith("Z") ? "+00:00" : rest.slice(-6)})`;
}
export function dayLabel(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00Z`));
}
