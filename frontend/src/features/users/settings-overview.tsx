"use client";

import Link from "next/link";
import { CalendarIcon, CarIcon, ContactsIcon, LocationIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { policySchema } from "@/features/schedule/contracts";
import { roles, usersSchema } from "./contracts";

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function OverviewLoading({ label }: { label: string }) {
  return <div role="status" className="mb-6 grid gap-4"><span className="sr-only">{label}</span><Skeleton className="h-9 w-24" /><Skeleton className="h-20 w-full" /></div>;
}
export function SettingsOverview() {
  const users = useQuery("/api/v1/users?page=1&page_size=3", usersSchema);
  const policy = useQuery("/api/v1/visit-schedule/policy", policySchema);
  const denied = [users.error, policy.error].find(error => error && ["UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED", "FORBIDDEN", "NOT_FOUND"].includes(error.code));
  if (denied) return <RecordError error={denied} />;
  const open = new Set(policy.value?.working_windows.map(window => window.weekday));
  return <><header className="kay-settings-content-head"><div><h2>Vue d’ensemble</h2><p>Les accès de l’équipe et l’organisation des visites.</p></div></header><div className="kay-settings-overview">
    <section className="kay-surface kay-settings-overview-card"><header className="kay-settings-panel-head"><ContactsIcon size={20} aria-hidden="true" /><div><h3>Équipe et accès</h3><p>Comptes et rôles de l’agence.</p></div></header>{users.error ? <RecordError error={users.error} retry={users.refresh} /> : !users.value ? <OverviewLoading label="Chargement de l’équipe…" /> : <><p className="kay-settings-summary"><strong>{users.value.total}</strong><span>comptes</span></p><ul className="kay-settings-members">{users.value.items.map(user => <li key={user.id}><span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium">{user.display_name.split(/\s+/).map(part => part[0]).slice(0, 2).join("")}</span><div><strong>{user.display_name}</strong><span>{roles[user.role]}</span></div></li>)}</ul>{!users.value.items.length ? <p className="text-sm text-muted-foreground">Aucun compte sur cette page.</p> : null}</>}<footer><Button action="forward" asChild variant="secondary"><Link href="/settings/users">Gérer les utilisateurs</Link></Button></footer></section>
    <section className="kay-surface kay-settings-overview-card"><header className="kay-settings-panel-head"><CalendarIcon size={20} aria-hidden="true" /><div><h3>Horaires de travail</h3><p>Le cadre de planification des visites.</p></div></header>{policy.error ? <RecordError error={policy.error} retry={policy.refresh} /> : !policy.value ? <OverviewLoading label="Chargement des horaires…" /> : <><p className="kay-settings-summary"><strong>{open.size}</strong><span>jours ouverts par semaine</span></p><div className="kay-settings-week" aria-label="Jours ouverts aux visites">{days.map((day, index) => <span key={day} data-open={open.has(index + 1) || undefined} title={`${day} · ${open.has(index + 1) ? "Ouvert" : "Fermé"}`}><span aria-hidden="true">{day.slice(0, 3)}</span><span className="sr-only">{day} · {open.has(index + 1) ? "Ouvert" : "Fermé"}</span></span>)}</div><dl className="kay-settings-facts"><div><dt><CarIcon size={16} aria-hidden="true" />Capacité avec véhicule</dt><dd>{policy.value.company_car_capacity_per_hour} / heure</dd></div><div><dt><LocationIcon size={16} aria-hidden="true" />Fuseau horaire</dt><dd>{policy.value.time_zone}</dd></div></dl></>}<footer><Button action="forward" asChild variant="secondary"><Link href="/settings/working-hours">Ouvrir les horaires</Link></Button></footer></section>
  </div></>;
}
