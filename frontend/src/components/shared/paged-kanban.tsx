"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { CrmStatusBadge } from "./crm-presentation";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import type { ApiError } from "@/lib/api/client";

export type KanbanPage<T> = { items: T[]; total: number; page: number; page_size: number; has_previous: boolean; has_next: boolean };
export type KanbanFilters = Record<string, string | number | undefined>;
export function kanbanLaneQuery(kind: "leads" | "deals", filters: KanbanFilters, stage: string, page: number) {
  return queryPath(kind === "leads" ? "enquiries" : "deals", { ...filters, [kind === "leads" ? "status" : "stage"]: stage, page, page_size: 10 });
}

export function PagedKanban<T extends { id: string }>({ kind, stages, filters, schema, revision, card, movable, move, denied }: {
  kind: "leads" | "deals"; stages: Record<string, string>; filters: KanbanFilters; schema: z.ZodType<KanbanPage<T>>; revision?: number;
  card: (row: T) => ReactNode; movable: (row: T) => boolean; move: (row: T, target: string) => void;
  denied: (error: ApiError) => void;
}) {
  const [drag, setDrag] = useState<{ row: T; from: string }>();
  const [target, setTarget] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const blocked = useRef(false), dropped = useRef(false);
  const selected = filters[kind === "leads" ? "status" : "stage"];
  const visible = Object.entries(stages).filter(([id]) => !selected || selected === id);
  function clear() { setDrag(undefined); setTarget(""); }
  return <section className="kay-kanban" aria-label={kind === "leads" ? "Kanban des prospects" : "Kanban des affaires"} data-single={visible.length === 1} onKeyDown={event => { if (event.key === "Escape" && drag) { clear(); setAnnouncement("Déplacement annulé."); } }}>
    <div className="kay-kanban-scroll" role="region" tabIndex={0} aria-label="Colonnes du Kanban"><div className="kay-kanban-lanes">{visible.map(([id, label]) => <KanbanLane key={id} kind={kind} stage={id} label={label} filters={filters} schema={schema} revision={revision} denied={denied} targeted={target === id} card={row => <div className="kay-kanban-card" data-record-id={row.id} draggable={movable(row)} data-dragging={drag?.row.id === row.id}
      onPointerDownCapture={event => { blocked.current = Boolean((event.target as Element).closest("a,button,input,select,textarea,summary,[role=dialog],[role=menu]")); }}
      onDragStart={event => {
        if (!movable(row) || blocked.current) { event.preventDefault(); return; }
        dropped.current = false;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/x-kay-record", row.id);
        setDrag({ row, from: id });
        setAnnouncement("Glissez vers une autre colonne. Échap pour annuler. Vous pouvez aussi ouvrir le dossier et utiliser son menu de statut.");
      }}
      onDragEnd={() => { clear(); if (!dropped.current) setAnnouncement("Déplacement annulé."); }}
    >{card(row)}</div>}
      enter={event => { if (!drag || drag.from === id) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; setTarget(id); }}
      leave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setTarget(""); }}
      drop={event => {
        if (!drag || drag.from === id) return;
        event.preventDefault(); dropped.current = true;
        const row = drag.row; clear();
        setAnnouncement("Vérification du changement vers « " + label + " »."); move(row, id);
      }} />)}</div></div>
    <p role="status" aria-live="polite" className="kay-kanban-caption">{announcement || "Chaque colonne affiche sa propre page de dossiers et son total autorisé."}</p>
  </section>;
}

function KanbanLane<T extends { id: string }>({ kind, stage, label, filters, schema, revision, card, targeted, enter, leave, drop, denied }: {
  kind: "leads" | "deals"; stage: string; label: string; filters: KanbanFilters; schema: z.ZodType<KanbanPage<T>>; revision?: number; card: (row: T) => ReactNode; targeted: boolean;
  enter: React.DragEventHandler<HTMLElement>; leave: React.DragEventHandler<HTMLElement>; drop: React.DragEventHandler<HTMLElement>; denied: (error: ApiError) => void;
}) {
  const [page, setPage] = useState(1);
  const query = useQuery(kanbanLaneQuery(kind, filters, stage, page), schema, revision);
  useEffect(() => { if (query.error && ["FORBIDDEN", "UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED"].includes(query.error.code)) denied(query.error); }, [query.error, denied]);
  return <section className="kay-kanban-column" aria-label={label} data-target={targeted} onDragOver={enter} onDragLeave={leave} onDrop={drop}>
    <header><h2><CrmStatusBadge state={stage} kind={kind === "deals" ? "deal" : "enquiry"}>{label}</CrmStatusBadge></h2><span className="kay-kanban-count" aria-label={query.value && !query.error ? `${query.value.total} dossiers` : undefined}>{query.value && !query.error ? query.value.total : "…"}</span></header>
    <div className="kay-kanban-body" role="region" tabIndex={0} aria-label={label + " : dossiers"}>{query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement…</p> : query.value.items.length ? <ul>{query.value.items.map(row => <li key={row.id}>{card(row)}</li>)}</ul> : <p className="kay-kanban-empty">Aucun dossier sur cette page.</p>}</div>
    {query.value && !query.error && (query.value.has_previous || query.value.has_next) ? <nav className="kay-kanban-pager" aria-label={"Pages : " + label}><Button action="previous" variant="quiet" size="icon" aria-label={"Page précédente : " + label} disabled={!query.value.has_previous} onClick={() => setPage(value => Math.max(1, value - 1))}><span className="sr-only">Précédent</span></Button><span>Page {query.value.page}</span><Button action="next" variant="quiet" size="icon" aria-label={"Page suivante : " + label} disabled={!query.value.has_next} onClick={() => setPage(value => value + 1)}><span className="sr-only">Suivant</span></Button></nav> : null}
  </section>;
}
