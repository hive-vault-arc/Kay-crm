import Link from "next/link";
import { CarIcon, ContactsIcon, DevelopmentIcon, CompletedIcon, ClockIcon, CloseIcon, type KayIconComponent } from "@/components/icons";
import { statusLabels, typeLabels, type Visit } from "./contracts";
import { localLabel } from "./time";

export const visitIcons: Record<Visit["type"], KayIconComponent> = { office: DevelopmentIcon, without_company_car: ContactsIcon, company_car: CarIcon };
export function VisitStatus({ status }: { status: Visit["status"] }) {
  const Icon = status === "confirmed" || status === "completed" ? CompletedIcon : status === "cancelled" ? CloseIcon : ClockIcon;
  return <span className="calendar-status" data-status={status}><Icon aria-hidden="true" className="size-4" /><span>{status === "draft" ? "Brouillon" : statusLabels[status]}</span></span>;
}
export function CalendarVisit({ visit }: { visit: Visit }) {
  const Icon = visitIcons[visit.type];
  return <Link href={`/visits/${visit.id}`} data-visit-kind={visit.type} className="calendar-agenda-visit grid min-w-0 gap-2 rounded-md border p-4 hover:bg-accent/30">
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-2"><span className="flex min-w-0 items-center gap-2"><Icon aria-hidden="true" className="size-5 shrink-0 text-link" /><span className="min-w-0 wrap-anywhere font-semibold">{visit.title}</span></span><VisitStatus status={visit.status} /></div>
    <p className="text-sm wrap-anywhere">{visit.contact_name}</p>
    <p className="text-sm">{localLabel(visit.start_local)} à {localLabel(visit.end_local)}</p>
    <p className="text-sm text-muted-foreground">{typeLabels[visit.type]}</p>
    {visit.review_code ? <p className="text-sm text-warning">Règles de planification à revoir</p> : null}
  </Link>;
}
