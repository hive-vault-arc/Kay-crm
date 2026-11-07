"use client";

import { useEffect, useId, useState } from "react";
import type { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { auditActorsSchema, auditActorKey, type AuditActor } from "./contracts";

export function AuditActorPicker({ value, label, change, denied }: { value: string; label: string; change: (actor?: AuditActor) => void; denied?: (error: ApiError) => void }) {
  const [open, setOpen] = useState(false), hydrated = useHydrated(), id = useId();
  function select(actor?: AuditActor) { change(actor); setOpen(false); }
  return <div className="grid min-w-0 gap-2"><Label htmlFor={id}>Utilisateur</Label><Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button id={id} action="contact" type="button" variant="outline" className="min-w-0 w-full justify-start text-left" title={value ? label : "Tous les utilisateurs"} disabled={!hydrated}><span className="min-w-0 truncate">{value ? label : "Tous les utilisateurs"}</span></Button></PopoverTrigger><PopoverContent data-draft-managed align="start" className="kay-directory-utilities max-h-[var(--radix-popover-content-available-height)] overflow-y-auto" aria-label="Choisir un utilisateur du journal">{open ? <AuditActorOptions value={value} select={select} denied={denied} /> : null}</PopoverContent></Popover></div>;
}

export function AuditActorOptions({ value, select, denied }: { value: string; select: (actor?: AuditActor) => void; denied?: (error: ApiError) => void }) {
  const [q, setQ] = useState(""), [page, setPage] = useState(1), id = useId();
  const query = useQuery(queryPath("audit/actors", { q, page, page_size: 5 }), auditActorsSchema);
  useEffect(() => { if (query.error && [401, 403].includes(query.error.status)) denied?.(query.error); }, [query.error, denied]);
  return <div className="grid min-w-0 gap-3"><Label htmlFor={id}>Rechercher un utilisateur</Label><Input id={id} value={q} maxLength={160} autoComplete="off" onChange={event => { setQ(event.target.value); setPage(1); }} /><Button action="reset" type="button" variant="quiet" className="justify-start" onClick={() => select()}>Tous les utilisateurs</Button>
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status" className="text-sm">Chargement des utilisateurs…</p> : <>
      <ul className="grid min-w-0 gap-1">{query.value.items.map(actor => <li key={auditActorKey(actor)}><Button action="contact" type="button" variant="quiet" aria-pressed={auditActorKey(actor) === value} className="h-auto min-h-control w-full justify-start whitespace-normal text-left" onClick={() => select(actor)}>{actor.display_name}</Button></li>)}</ul>
      {!query.value.items.length ? <p role="status" className="text-sm text-muted-foreground">Aucun utilisateur avec un historique ne correspond à cette recherche.</p> : null}
      {query.value.has_previous || query.value.has_next ? <nav aria-label="Pages des utilisateurs du journal" className="flex items-center justify-between gap-2"><Button action="back" type="button" variant="quiet" size="icon" aria-label="Utilisateurs précédents" disabled={!query.value.has_previous} onClick={() => setPage(current => current - 1)} /><span className="text-xs text-muted-foreground">Page {page} · {query.value.total} utilisateurs</span><Button action="forward" type="button" variant="quiet" size="icon" aria-label="Utilisateurs suivants" disabled={!query.value.has_next} onClick={() => setPage(current => current + 1)} /></nav> : null}
    </>}
    <p className="text-xs text-muted-foreground">Utilisateurs, sources web et auteurs non renseignés présents dans le journal. Les identités historiques sont conservées.</p>
  </div>;
}
