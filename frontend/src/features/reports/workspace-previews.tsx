"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarIcon, ClockIcon, DevelopmentIcon, ForwardIcon, LocationIcon, PhoneIcon, TaskIcon } from "@/components/icons";
import { ContactAvatar, CrmStatusBadge } from "@/components/shared/crm-presentation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InventoryThumbnail } from "@/features/files/inventory-thumbnail";
import { categoryLabels, stateLabels } from "@/features/inventory/contracts";
import { localLabel } from "@/features/schedule/time";
import { taskDueState } from "@/features/work/task-time";
import { formatMAD } from "@/lib/format";
import type { Workspace } from "./workspace-contracts";

const number = (value: number) => value.toLocaleString("fr-MA");
const campaignLabels = { sale: "Vente", rental: "Location", holiday: "Vacances" };
const pricePeriods = { day: "jour", week: "semaine", month: "mois", year: "an" };

export function visitDate(value: string) {
  // start_local already contains the authoritative Casablanca civil date/time.
  const date = new Date(value.slice(0, 10) + "T12:00:00Z");
  return { weekday: new Intl.DateTimeFormat("fr-MA", { weekday: "short", timeZone: "UTC" }).format(date), day: value.slice(8, 10), month: new Intl.DateTimeFormat("fr-MA", { month: "short", timeZone: "UTC" }).format(date), time: value.slice(11, 16) };
}

function Heading({ title, action }: { title: string; action?: ReactNode }) {
  return <header className="kay-dash-head"><h2>{title}</h2>{action}</header>;
}
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return <div className="kay-dash-empty"><TaskIcon size={32} aria-hidden="true" /><strong>{title}</strong><p>{children}</p></div>;
}

export function WorkspaceProperties({ value }: { value: Workspace["inventory"] }) {
  return <section className="kay-dash-card kay-dash-showcase" aria-label="Biens en discussion"><Heading title="Biens en discussion" action={<Button action="forward" variant="quiet" asChild><Link href="/projects">Catalogue</Link></Button>} /><p className="kay-dash-note">{number(value.total)} biens ou programmes liés aux affaires actives</p>
    {value.items.length ? <ul className="kay-dash-gallery">{value.items.map(item => <li key={`${item.kind}:${item.id}`}><Link href={item.kind === "development" ? `/projects/${item.id}` : `/projects/properties/${item.id}`} className="kay-dash-property"><div className="kay-dash-property-photo"><InventoryThumbnail kind={item.kind} id={item.id} /><span className="kay-dash-photo-open" aria-hidden="true"><ForwardIcon size={16} /></span></div><div className="kay-dash-property-copy"><h3>{item.label}</h3><p>{item.location || item.reference}</p><div className="flex flex-wrap items-center gap-2"><Badge>{item.kind === "development" ? "Programme" : item.category === "mixed" ? "Bien" : categoryLabels[item.category]}</Badge><small>{number(item.deal_count)} affaire(s)</small></div>{item.campaigns.length ? <ul className="kay-dash-prices">{item.campaigns.map(campaign => <li key={campaign.id}><span className="flex flex-wrap items-center gap-2">{campaignLabels[campaign.kind]}<Badge variant={campaign.state === "reserved" ? "purple" : campaign.state === "available" || campaign.state === "sold" || campaign.state === "rented" ? "success" : campaign.state === "review" ? "warning" : "neutral"}>{stateLabels[campaign.state]}</Badge></span><strong>{campaign.price_mad === null ? "Prix non renseigné" : formatMAD(campaign.price_mad)}{campaign.price_period ? ` / ${pricePeriods[campaign.price_period]}` : ""}</strong></li>)}</ul> : null}</div></Link></li>)}</ul> : <Empty title="Aucun bien en discussion">Les biens et programmes liés à vos affaires actives s’afficheront ici.</Empty>}
  </section>;
}

export function WorkspaceVisits({ value }: { value: Workspace["visits"] }) {
  return <section className="kay-dash-card kay-dash-agenda" aria-label="Prochaines visites"><Heading title="Prochaines visites" action={<Button action="forward" variant="quiet" asChild><Link href="/visits">Calendrier</Link></Button>} /><p className="kay-dash-note">{number(value.total)} rendez-vous sur la période, en cours ou à venir</p>
    {value.items.length ? <ul>{value.items.map((visit, index) => { const date = visitDate(visit.start_local); return <li key={visit.id}><Link href={`/visits/${visit.id}`} className="kay-dash-visit" data-next={index === 0}><time dateTime={visit.start_local} className="kay-dash-date"><small>{date.weekday}</small><strong>{date.day}</strong><small>{date.month}</small></time><span className="kay-dash-visit-copy">{index === 0 ? <small>Prochain rendez-vous</small> : null}<strong>{visit.title}</strong><span className="kay-dash-visit-time"><ClockIcon size={16} aria-hidden="true" /><b>{date.time}</b><span>· {visit.organizer_name}</span></span>{index === 0 ? <><span>{visit.contact_name}</span>{visit.location ? <span className="flex items-start gap-1"><LocationIcon size={16} className="shrink-0" aria-hidden="true" />{visit.location}</span> : null}</> : null}<Badge variant={visit.status === "confirmed" ? "success" : "info"}>{visit.status === "confirmed" ? "Confirmée" : "Planifiée"}</Badge></span><span className="kay-dash-visit-visual" aria-hidden="true">{visit.property_id ? <InventoryThumbnail kind="property" id={visit.property_id} compact /> : visit.type === "office" ? <DevelopmentIcon size={24} /> : <CalendarIcon size={24} />}<span className="kay-dash-photo-open"><ForwardIcon size={16} /></span></span></Link></li>; })}</ul> : <><Empty title="Aucune visite à venir">Votre prochain rendez-vous dans cette période s’affichera ici.</Empty><Button action="create" variant="outline" asChild><Link href="/visits/new">Planifier une visite</Link></Button></>}
  </section>;
}

export function WorkspaceFollowUps({ value, open }: { value: Workspace["follow_ups"]; open: () => void }) {
  return <section className="kay-dash-card kay-dash-priorities" aria-label="Prospects à relancer"><Heading title="À relancer" action={<Button action="forward" variant="quiet" onClick={open}>Tout voir</Button>} /><p className="kay-dash-priority-summary"><strong>{number(value.total)}</strong><span>prospect(s) à relancer</span></p><p className="kay-dash-note">Demandes de la période, actuellement à relancer</p>
    {value.items.length ? <ul>{value.items.map(item => <li key={item.id}><Link className="kay-dash-row" href={`/leads/${item.id}`}><span className="kay-dash-symbol"><PhoneIcon size={20} aria-hidden="true" /></span><span className="kay-dash-copy"><strong>{item.name}</strong><small>{item.agent_name}</small></span><CrmStatusBadge state="follow_up" kind="enquiry">À relancer</CrmStatusBadge><ForwardIcon size={16} aria-hidden="true" /></Link></li>)}</ul> : <Empty title="Aucun prospect à relancer">Aucune demande de cette période n’est actuellement à relancer.</Empty>}
  </section>;
}

export function WorkspaceTasks({ value, clock, action }: { value: Workspace["tasks"]; clock: Pick<Workspace, "now" | "today">; action: ReactNode }) {
  return <section className="kay-dash-card kay-dash-tasks" aria-label="Tâches ouvertes"><Heading title="Tâches à suivre" action={action} /><p className="kay-dash-priority-summary"><strong>{number(value.total)}</strong><span>tâche(s) ouverte(s)</span>{value.overdue_total ? <small className="text-danger">{number(value.overdue_total)} en retard</small> : null}</p>
    {value.items.length ? <ul>{value.items.map(item => { const due = taskDueState({ ...item, status: "open" }, clock); return <li key={item.id}><Link className="kay-dash-row" href={item.href}><span className="kay-dash-symbol"><TaskIcon size={20} aria-hidden="true" /></span><span className="kay-dash-copy"><strong>{item.title}</strong><small>{item.owner_name}</small><time dateTime={item.due_at}>{localLabel(item.due_local)}</time></span><Badge variant={due === "overdue" ? "danger" : due === "today" ? "warning" : "neutral"}>{due === "overdue" ? "En retard" : due === "today" ? "Aujourd’hui" : "À faire"}</Badge><ForwardIcon size={16} aria-hidden="true" /></Link></li>; })}</ul> : <Empty title="Vous êtes à jour">Aucune tâche ouverte dans votre périmètre. Créez une tâche depuis le dossier concerné.</Empty>}
  </section>;
}

export function WorkspaceTeam({ value, action, audit }: { value: Workspace["team"]; action: ReactNode; audit: boolean }) {
  return <section className="kay-dash-card kay-dash-team" aria-label="Équipe"><Heading title="Équipe" action={action} /><p className="kay-dash-note">Responsabilité actuelle · demandes reçues et affaires créées sur la période</p>
    {value.items.length ? <ul>{value.items.map(item => <li key={item.id} className="kay-dash-team-row"><ContactAvatar name={item.display_name} /><strong>{item.display_name}</strong><span><b>{number(item.enquiries)}</b> demande(s)<br /><b>{number(item.deals)}</b> affaire(s)</span></li>)}</ul> : <Empty title="Aucun dossier sur cette période">Aucun dossier dans les cohortes affichées pour les responsables accessibles.</Empty>}
    {value.total > value.items.length ? <p className="kay-dash-note">{value.items.length} sur {number(value.total)} responsables. Les rapports détaillés conservent l’attribution à l’auteur réel.</p> : null}{audit ? <Button action="forward" variant="quiet" className="justify-self-end" asChild><Link href="/dashboard?view=audit">Journal d’audit</Link></Button> : null}
  </section>;
}
