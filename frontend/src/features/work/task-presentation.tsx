"use client";

import Link from "next/link";
import { CalendarIcon, ChevronDownIcon, ClockIcon, CompletedIcon, CloseIcon, ContactIcon, TaskIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { RecordEntry } from "@/components/shared/record-entry";
import { CrmStatusBadge } from "@/components/shared/crm-presentation";
import { localLabel } from "@/features/schedule/time";
import { taskStatusLabels, type Task } from "./contracts";
import { taskDueState } from "./task-time";
export function TaskStatus({ status }: { status: Task["status"] }) {
  const Icon = status === "completed" ? CompletedIcon : status === "cancelled" ? CloseIcon : ClockIcon;
  return <CrmStatusBadge state={status} dot={false}><Icon size={12} aria-hidden="true" />{taskStatusLabels[status]}</CrmStatusBadge>;
}
export function TaskListCard({ task, clock, href, open, selected, disabled }: {
  task: Task; clock: { now: string; today: string }; href?: string; open?: () => void; selected?: boolean; disabled?: boolean;
}) {
  const due = taskDueState(task, clock);
  const title = href ? <Link href={href}>{task.title}</Link> : <Button action="task" type="button" variant="quiet" className="kay-entry-open" aria-pressed={selected} disabled={disabled} onClick={open}>{task.title}</Button>;
  const context = task.deal_id ? { href: "/deals/" + task.deal_id, label: "Affaire" } : task.enquiry_id ? { href: "/leads/" + task.enquiry_id, label: "Prospect" } : { href: "/contacts/" + task.contact_id, label: "Contact" };
  return <RecordEntry title={title} icon={href ? TaskIcon : undefined} status={<TaskStatus status={task.status} />} meta={[
    { label: "Échéance", icon: CalendarIcon, value: <span className="kay-task-due" data-overdue={due === "overdue"}>{localLabel(task.due_local)}{due ? <small>{due === "overdue" ? "En retard" : "Aujourd’hui"}</small> : null}</span> },
    { label: "Responsable", icon: ContactIcon, value: task.owner_name },
  ]}><div className="kay-task-context"><Link href={context.href}>{context.label} · {task.contact_name}</Link>{task.property_id ? <Link href={"/projects/properties/" + task.property_id}>Bien lié</Link> : null}</div>{task.notes ? <details className="kay-entry-note"><summary>Consignes<ChevronDownIcon size={12} aria-hidden="true" /></summary><p>{task.notes}</p></details> : null}{task.outcome ? <details className="kay-entry-note"><summary>Compte rendu<ChevronDownIcon size={12} aria-hidden="true" /></summary><p>{task.outcome}</p></details> : null}</RecordEntry>;
}
