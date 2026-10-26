import Link from "next/link";
import type { ReactNode } from "react";
import { ContactIcon, PhoneIcon, PropertyIcon, GripIcon } from "@/components/icons";

export function KanbanRecordCard({ title, href, phone, budget, agent, projects, action, rating, movable, offer }: {
  title: string; href: string; phone: string; budget: string | null; agent: string; projects?: string; action?: ReactNode; rating?: ReactNode; movable: boolean; offer?: string;
}) {
  return <article className="kay-kanban-record"><header><Link href={href} draggable={false}>{title}</Link>{action}</header><a className="kay-kanban-phone" href={"tel:" + phone} draggable={false}><PhoneIcon size={12} aria-hidden="true" />{phone}</a>{projects ? <p className="kay-kanban-projects" title={projects}><PropertyIcon size={12} aria-hidden="true" /><span>{projects}</span></p> : null}<strong className="kay-kanban-budget">{budget || "À qualifier"}</strong>{offer ? <p className="kay-kanban-projects"><PropertyIcon size={12} aria-hidden="true" />{offer}</p> : null}<footer><span><ContactIcon size={12} aria-hidden="true" />{agent}</span><span>{rating}{movable ? <span className="kay-kanban-grip" aria-hidden="true" title="Glisser pour déplacer"><GripIcon size={16} aria-hidden="true" /></span> : null}</span></footer></article>;
}
