import Link from "next/link";
import { CarIcon, ContactsIcon, DevelopmentIcon, CompletedIcon, ClockIcon, CloseIcon, type KayIconComponent } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { CrmStatusBadge } from "@/components/shared/crm-presentation";
import { statusLabels, typeLabels, type Visit } from "./contracts";
import { dayLabel, localLabel } from "./time";
import { VisitAction } from "./visit-record";

export const visitIcons: Record<Visit["type"], KayIconComponent> = { office: DevelopmentIcon, without_company_car: ContactsIcon, company_car: CarIcon };
export function VisitStatus({ status }: { status: Visit["status"] }) {
  const Icon = status === "confirmed" || status === "completed" ? CompletedIcon : status === "cancelled" || status === "not_completed" ? CloseIcon : ClockIcon;
  return <CrmStatusBadge state={status} dot={false}><Icon aria-hidden="true" size={12} /><span>{status === "draft" ? "Brouillon" : statusLabels[status]}</span></CrmStatusBadge>;
}
export function CalendarVisit({ visit, onChanged, onCancel, tile = false, day }: { visit: Visit; onChanged?: () => void; onCancel?: (visit: Visit) => void; tile?: boolean; day?: string }) {
  const Icon = visitIcons[visit.type];
  const cancellable = !visit.contact_archived && !["completed", "not_completed", "cancelled"].includes(visit.status);
  const details = `${visit.title} · ${visit.contact_name} · ${typeLabels[visit.type]} · ${statusLabels[visit.status]} · ${localLabel(visit.start_local)} à ${localLabel(visit.end_local)}`;
  return <article data-visit-kind={visit.type} data-crm-state={visit.status} className={`calendar-agenda-visit kay-calendar-entry${tile ? " kay-calendar-tile" : ""}`}>
    <Link href={`/visits/${visit.id}`} title={details} aria-label={details} className="kay-calendar-entry-link">
      <span className="kay-calendar-entry-main">{tile ? <><span className="kay-calendar-entry-time">{day && visit.start_local.slice(0, 10) < day ? "Suite" : visit.start_local.slice(11, 16)}</span><strong><Icon aria-hidden="true" size={16} /><span>{visit.title}</span></strong><span>{visit.contact_name}</span></> : <><strong><Icon aria-hidden="true" size={16} /><span>{visit.start_local.slice(11, 16)} · {visit.title}</span></strong><span>{dayLabel(visit.start_local.slice(0, 10))} · {visit.contact_name}</span><span className="kay-calendar-entry-type">{typeLabels[visit.type]}</span></>}{visit.review_code ? <span className="text-warning">Règles de planification à revoir</span> : null}</span>
      <VisitStatus status={visit.status} />
    </Link>
    {cancellable && onCancel ? <Button action="cancelRecord" type="button" variant="quiet" size="icon" aria-label={`Annuler la visite : ${visit.title}`} onClick={() => onCancel(visit)}><span className="sr-only">Annuler</span></Button> : cancellable && onChanged ? <VisitAction value={visit} action="cancel" saved={onChanged} /> : null}
  </article>;
}
