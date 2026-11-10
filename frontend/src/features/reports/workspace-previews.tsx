"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarIcon, CheckIcon, ClockIcon, ContactsIcon, DevelopmentIcon, ForwardIcon, LocationIcon, TaskIcon, type KayIconComponent } from "@/components/icons";
import { ContactAvatar, CrmStatusBadge } from "@/components/shared/crm-presentation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InventoryThumbnail } from "@/features/files/inventory-thumbnail";
import { categoryLabels, stateLabels } from "@/features/inventory/contracts";
import { localLabel } from "@/features/schedule/time";
import { taskDueState } from "@/features/work/task-time";
import { formatBusinessDate, formatInstant, formatMAD } from "@/lib/format";
import type { Workspace } from "./workspace-contracts";

const number = (value: number) => value.toLocaleString("fr-MA");
const counted = (value: number, singular: string, plural = singular + "s") => `${number(value)} ${value === 1 ? singular : plural}`;
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
function Empty({ title, icon: Icon, children }: { title: string; icon: KayIconComponent; children: ReactNode }) {
  return <div className="kay-dash-empty"><Icon className="size-[26px]" aria-hidden="true" /><strong>{title}</strong><p>{children}</p></div>;
}

export function WorkspaceProperties({ value }: { value: Workspace["inventory"] }) {
  return <section className="kay-dash-card kay-dash-showcase" aria-label="Biens à suivre">
    <Heading title="Biens à suivre" action={<Button action="forward" variant="quiet" asChild><Link href="/projects">Mes projets</Link></Button>} />
    <p className="kay-dash-note">Liés à vos affaires en cours{value.total > value.items.length ? ` · ${value.items.length} sur ${number(value.total)}` : ""}</p>
    {value.items.length ? <ul className="kay-dash-gallery">{value.items.map(item => {
      const category = item.kind === "development" ? "Programme" : item.category === "mixed" ? "Bien" : categoryLabels[item.category];
      const location = item.location || item.reference;
      return <li key={`${item.kind}:${item.id}`}>
        <Link href={item.kind === "development" ? `/projects/${item.id}` : `/projects/properties/${item.id}`} className="kay-dash-property">
          <div className="kay-dash-property-photo"><InventoryThumbnail kind={item.kind} id={item.id} /><span className="kay-dash-photo-open" aria-hidden="true"><ForwardIcon className="size-[17px]" /></span></div>
          <div className="kay-dash-property-copy">
            <h3 title={item.label}>{item.label}</h3>
            <p title={location}>{location}</p>
            <div className="flex flex-wrap items-center gap-2"><Badge>{category}</Badge><small>{counted(item.deal_count, "affaire")}</small></div>
            {item.campaigns.length ? <ul className="kay-dash-prices">{item.campaigns.map(campaign => <li key={campaign.id}>
              <span className="flex flex-wrap items-center gap-2">{campaignLabels[campaign.kind]}<Badge variant={campaign.state === "reserved" ? "purple" : campaign.state === "available" || campaign.state === "sold" || campaign.state === "rented" ? "success" : campaign.state === "review" ? "warning" : "neutral"}>{stateLabels[campaign.state]}</Badge></span>
              <strong>{campaign.price_mad === null ? "Prix non renseigné" : formatMAD(campaign.price_mad)}{campaign.price_period ? ` / ${pricePeriods[campaign.price_period]}` : ""}</strong>
            </li>)}</ul> : null}
          </div>
        </Link>
      </li>;
    })}</ul> : <Empty title="Aucun bien lié" icon={DevelopmentIcon}>Les biens et programmes liés à vos affaires actives s’afficheront ici.</Empty>}
  </section>;
}

export function WorkspaceVisits({ value }: { value: Workspace["visits"] }) {
  return <section className="kay-dash-card kay-dash-agenda" aria-label="Prochaines visites"><Heading title="Prochaines visites" action={<Button action="forward" variant="quiet" asChild><Link href="/visits">Calendrier</Link></Button>} /><p className="kay-dash-note">{number(value.total)} rendez-vous sur la période, en cours ou à venir</p>
    {value.items.length ? <ul>{value.items.map((visit, index) => {
      const date = visitDate(visit.start_local);
      return <li key={visit.id}><Link href={`/visits/${visit.id}`} className="kay-dash-visit" data-next={index === 0}>
        <time dateTime={visit.start_local} className="kay-dash-date"><small>{date.weekday}</small><strong>{date.day}</strong><small>{date.month.toUpperCase()}</small></time>
        <span className="kay-dash-visit-copy">
          {index === 0 ? <small>Prochain rendez-vous</small> : null}
          <strong title={visit.title}>{visit.title}</strong>
          <span className="kay-dash-visit-time"><ClockIcon className="size-[13px]" aria-hidden="true" /><b>{date.time}</b><span>· {visit.organizer_name}</span></span>
          {index === 0 ? <><span>{visit.contact_name}</span>{visit.location ? <span className="kay-dash-visit-location"><LocationIcon className="size-[13px] shrink-0" aria-hidden="true" /><span title={visit.location}>{visit.location}</span></span> : null}</> : null}
          <Badge variant={visit.status === "confirmed" ? "success" : "info"}>{visit.status === "confirmed" ? "Confirmée" : "Planifiée"}</Badge>
        </span>
        <div className="kay-dash-visit-visual" aria-hidden="true">
          {visit.property_id ? <InventoryThumbnail kind="property" id={visit.property_id} compact /> : visit.type === "office" ? <DevelopmentIcon size={24} /> : <CalendarIcon size={24} />}
          <span className="kay-dash-photo-open"><ForwardIcon className="size-[14px]" /></span>
        </div>
      </Link></li>;
    })}</ul> : <><Empty title="Aucune visite à venir" icon={CalendarIcon}>Votre prochain rendez-vous dans cette période s’affichera ici.</Empty><Button action="add" className="justify-self-center" asChild><Link href="/visits/new">Planifier une visite</Link></Button></>}
  </section>;
}

export function WorkspaceFollowUps({ value, open }: { value: Workspace["follow_ups"]; open: () => void }) {
  return <section className="kay-dash-card kay-dash-priorities" aria-label="Prospects à relancer">
    <Heading title="À traiter" action={<Button action="forward" variant="quiet" asChild><Link href="/leads">Tous les prospects</Link></Button>} />
    <div className="kay-dash-priority-summary"><Button action="forward" className="kay-dash-follow-up-total" variant="quiet" onClick={open}><strong>{number(value.total)}</strong><span>{value.total === 1 ? "prospect" : "prospects"} à relancer</span></Button><span className="kay-dash-note">Sur la période</span></div>
    {value.items.length ? <ul>{value.items.map(item => <li key={item.id}>
      <Link className="kay-dash-row" href={`/leads/${item.id}`}>
        <span className="kay-dash-symbol"><ContactsIcon size={18} aria-hidden="true" /></span>
        <span className="kay-dash-copy"><strong title={item.name}>{item.name}</strong><small>{item.agent_name} · <time dateTime={item.received_at}>Reçu le {formatInstant(item.received_at)}</time></small></span>
        <CrmStatusBadge state="follow_up" kind="enquiry">À relancer</CrmStatusBadge><ForwardIcon size={16} aria-hidden="true" />
      </Link>
    </li>)}</ul> : <Empty title="Tout est à jour" icon={CheckIcon}>Aucune demande de cette période n’est actuellement à relancer.</Empty>}
  </section>;
}

export function WorkspaceTasks({ value, clock, action }: { value: Workspace["tasks"]; clock: Pick<Workspace, "now" | "today">; action: ReactNode }) {
  return <section className="kay-dash-card kay-dash-tasks" aria-label="Tâches ouvertes"><Heading title="Tâches" action={action} /><p className="kay-dash-priority-summary"><strong>{number(value.total)}</strong><span>{value.total === 1 ? "tâche ouverte" : "tâches ouvertes"}</span>{value.overdue_total ? <small className="text-danger">{number(value.overdue_total)} en retard</small> : null}</p>
    {value.items.length ? <ul>{value.items.map(item => {
      const due = taskDueState({ ...item, status: "open" }, clock);
      return <li key={item.id}><Link className="kay-dash-row" href={item.href}>
        <span className="kay-dash-symbol"><TaskIcon size={18} aria-hidden="true" /></span>
        <span className="kay-dash-copy"><strong title={item.title}>{item.title}</strong><small>{item.owner_name}</small></span>
        <span className="kay-dash-task-due" data-due={due}>
          <time dateTime={item.due_at} title={localLabel(item.due_local)}><CalendarIcon className="size-[13px] shrink-0" aria-hidden="true" /><span>{formatBusinessDate(item.due_local.slice(0, 10))} · {item.due_local.slice(11, 16)}</span></time>
          <small>{due === "overdue" ? "En retard" : due === "today" ? "Aujourd’hui" : "À faire"}</small>
        </span>
        <ForwardIcon size={16} aria-hidden="true" />
      </Link></li>;
    })}</ul> : <Empty title="Aucune tâche ouverte" icon={TaskIcon}>Les prochaines actions de vos dossiers apparaîtront ici.</Empty>}
  </section>;
}

export function WorkspaceTeam({ value, audit }: { value: Workspace["team"]; audit: boolean }) {
  return <section className="kay-dash-card kay-dash-team" aria-label="Répartition de l’équipe">
    <Heading title="Répartition de l’équipe" action={audit ? <Button action="forward" variant="quiet" asChild><Link href="/dashboard?view=audit">Journal d’audit</Link></Button> : undefined} />
    <p className="kay-dash-note">Responsabilité actuelle · demandes reçues et affaires créées sur la période</p>
    {value.items.length ? <ul>{value.items.map(item => <li key={item.id} className="kay-dash-team-row">
      <ContactAvatar name={item.display_name} />
      <span className="kay-dash-copy"><strong>{item.display_name}</strong><small>{counted(item.enquiries, "demande attribuée", "demandes attribuées")}</small></span>
      <span className="kay-dash-team-total"><b>{number(item.deals)}</b><small>{item.deals === 1 ? "affaire" : "affaires"}</small></span>
    </li>)}</ul> : <Empty title="Aucun dossier sur cette période" icon={ContactsIcon}>Aucun dossier pour les responsables accessibles.</Empty>}
    {value.total > value.items.length ? <p className="kay-dash-note">{value.items.length} sur {number(value.total)} responsables.</p> : null}
  </section>;
}
