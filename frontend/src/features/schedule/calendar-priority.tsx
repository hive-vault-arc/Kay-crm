import Link from "next/link";
import { ClockIcon, TaskIcon } from "@/components/icons";
import type { CalendarWorkItem } from "@/features/work/contracts";
import { dayLabel, localLabel } from "./time";

export function CalendarPriority({ item, tile = false }: { item: CalendarWorkItem; tile?: boolean }) {
  const reminder = item.kind === "reminder";
  const Icon = reminder ? ClockIcon : TaskIcon;
  const label = reminder ? "Rappel important" : "Tâche importante";
  const path = item.deal_id ? `/deals/${item.deal_id}` : item.enquiry_id ? `/leads/${item.enquiry_id}` : `/contacts/${item.contact_id}`;
  return <article className={`calendar-agenda-visit kay-calendar-entry${tile ? " kay-calendar-tile" : ""}`} data-calendar-priority>
    <Link href={`${path}?task=${item.id}`} className="kay-calendar-entry-link"
      aria-label={`${label} · ${item.title} · ${localLabel(item.due_local)}`}>
      <span className="kay-calendar-entry-main">
        <span className="kay-calendar-entry-time">{tile ? item.due_local.slice(11, 16) : `${dayLabel(item.due_local.slice(0, 10))} · ${item.due_local.slice(11, 16)}`}</span>
        <strong><Icon size={16} aria-hidden="true" /><span>{item.title}</span></strong>
        <span>{label}</span>
      </span>
    </Link>
  </article>;
}
