"use client";

import Link from "next/link";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ClockIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { DataTable } from "@/components/shared/data-table";
import { RecordEntry } from "@/components/shared/record-entry";
import type { StaffRole } from "@/features/contacts/contracts";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { formatInstant } from "@/lib/format";
import { useHydrated } from "@/hooks/use-hydrated";
import type { ApiError } from "@/lib/api/client";
import { AuditActorPicker } from "./audit-actor-picker";
import { AuditAction, AuditTargets, auditActionLabel } from "./audit-presentation";
import { auditQuerySchema, auditSchema, familyLabels, type AuditRow } from "./contracts";

const defaults = { family: "", actor_id: "", website_source_id: "", unattributed_actor: "", start_on: "", end_on: "" };
export function AuditPanel({ role }: { role: StaffRole }) {
  return role === "agent" ? <p role="alert">Accès non autorisé : le journal est réservé aux responsables et administrateurs.</p> : <AuditBody role={role} />;
}
export function AuditBody({ role }: { role: StaffRole }) {
  const [draft, setDraft] = useState(defaults), [filters, setFilters] = useState(defaults), [page, setPage] = useState(1);
  const [actorLabel, setActorLabel] = useState(""), [invalid, setInvalid] = useState("");
  const [scopeError, setScopeError] = useState<ApiError>();
  const result = useQuery(queryPath("audit/events", { ...filters, page, page_size: 25 }), auditSchema), hydrated = useHydrated();
  function change(next: typeof defaults) {
    setDraft(next);
    const parsed = auditQuerySchema.safeParse(Object.fromEntries(Object.entries(next).filter(([, value]) => value !== "")));
    if (!parsed.success) { setInvalid("Vérifiez les filtres et les dates : le début doit précéder la fin."); return; }
    setInvalid(""); setFilters(next); setPage(1);
  }
  function reset() { setDraft(defaults); setFilters(defaults); setActorLabel(""); setInvalid(""); setPage(1); }
  const columns: ColumnDef<AuditRow>[] = [
    { id: "date", header: "Date", cell: ({ row }) => <time dateTime={row.original.created_at}>{formatInstant(row.original.created_at)}</time> },
    { id: "actor", header: "Utilisateur", cell: ({ row }) => <span className="wrap-anywhere">{row.original.actor_name}</span> },
    { id: "action", header: "Action", cell: ({ row }) => <AuditAction action={row.original.action} /> },
    { id: "target", header: "Objet", cell: ({ row }) => <AuditTargets row={row.original} role={role} /> },
  ];
  const back = <Button action="back" asChild variant="outline"><Link href="/dashboard">Tableau de bord</Link></Button>;
  const authorityError = scopeError ?? result.error;
  if (authorityError && [401, 403, 404].includes(authorityError.status)) return <section className="kay-surface grid min-w-0 gap-5 p-5" aria-label="Journal inaccessible">{back}<RecordError error={authorityError} retry={() => { reset(); setScopeError(undefined); result.refresh(); }} /></section>;
  return <section className="kay-surface grid min-w-0 content-start gap-5 p-5" aria-label="Journal d’audit"><header className="kay-section-head"><h2>Actions enregistrées{result.value && !result.error ? <span className="kay-section-count">{result.value.total}</span> : null}</h2><div className="kay-section-actions">{back}<Button liveRefresh action="refresh" type="button" variant="outline" disabled={!hydrated} onClick={result.refresh}>Actualiser</Button></div></header>
    <form role="search" data-draft-managed onSubmit={event => { event.preventDefault(); change(draft); }} aria-label="Filtres du journal"><fieldset disabled={!hydrated} className="grid min-w-0 items-end gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="grid min-w-0 gap-2"><Label htmlFor="audit-family">Famille</Label><NativeSelect id="audit-family" value={draft.family} onChange={event => change({ ...draft, family: event.target.value })}><option value="">Toutes les familles</option>{Object.entries(familyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
      <AuditActorPicker value={draft.actor_id ? `user:${draft.actor_id}` : draft.website_source_id ? `website:${draft.website_source_id}` : draft.unattributed_actor ? "unattributed" : ""} label={actorLabel} denied={setScopeError} change={actor => { setActorLabel(actor?.display_name ?? ""); change({ ...draft, actor_id: actor?.kind === "user" ? actor.id : "", website_source_id: actor?.kind === "website" ? actor.id : "", unattributed_actor: actor?.kind === "unattributed" ? "true" : "" }); }} />
      <div className="grid min-w-0 gap-2"><Label htmlFor="audit-from">Du</Label><Input id="audit-from" type="date" value={draft.start_on} onChange={event => change({ ...draft, start_on: event.target.value })} /></div>
      <div className="grid min-w-0 gap-2"><Label htmlFor="audit-to">Au</Label><Input id="audit-to" type="date" value={draft.end_on} onChange={event => change({ ...draft, end_on: event.target.value })} /></div>
    </fieldset></form>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Heure du Maroc. Les valeurs privées ne sont pas recopiées ici. « Tous les utilisateurs » inclut aussi les sources web et les actions sans auteur renseigné.</p>{Object.values(draft).some(Boolean) ? <Button action="reset" type="button" variant="quiet" size="compact" disabled={!hydrated} onClick={reset}>Réinitialiser</Button> : null}</div>{invalid ? <p role="alert" className="text-sm text-danger">{invalid}</p> : null}
    {result.error ? <RecordError error={result.error} retry={result.refresh} /> : !result.value ? <p role="status">Chargement du journal…</p> : <><DataTable rows={result.value.items} columns={columns} getRowId={row => row.id} caption="Actions autorisées de l’équipe" className="crm-directory-table" emptyLabel="Aucune action ne correspond à ces filtres sur cette page." footerCaption mobileCard={row => <RecordEntry title={auditActionLabel(row.action)} icon={ClockIcon} meta={[{ label: "Utilisateur", value: row.actor_name }, { label: "Date", value: <time dateTime={row.created_at}>{formatInstant(row.created_at)}</time> }]}>{auditActionLabel(row.action) !== row.action ? <p className="text-xs text-muted-foreground wrap-anywhere">{row.action}</p> : null}<AuditTargets row={row} role={role} /></RecordEntry>} /><NumberedPages compact label="Pages du journal" page={page} size={25} total={result.value.total} change={setPage} /></>}
  </section>;
}
