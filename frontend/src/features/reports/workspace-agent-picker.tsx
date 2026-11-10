"use client";

import { useId, useState } from "react";
import { ContactIcon, ContactsIcon } from "@/components/icons";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { workspaceAgentsSchema } from "./workspace-contracts";

export function WorkspaceAgentPicker({ value, label, change }: { value: string; label: string; change: (id: string, name: string) => void }) {
  return <RecordDrawer label={label || "Toute l’équipe"} title="Équipe" action="down" description="Responsables actuels de vos contacts accessibles. Ce filtre ne donne aucun accès supplémentaire.">{close => <Choices value={value} choose={(id, name) => { change(id, name); close(); }} />}</RecordDrawer>;
}

function Choices({ value, choose }: { value: string; choose: (id: string, name: string) => void }) {
  const id = useId(), [q, setQ] = useState(""), [page, setPage] = useState(1);
  const query = useQuery(queryPath("reports/workspace/agents", { q, page, page_size: 20 }), workspaceAgentsSchema);
  return <div data-filter-panel className="grid min-w-0 gap-4"><Label htmlFor={id}>Rechercher un responsable</Label><Input id={id} value={q} maxLength={160} onChange={event => { setQ(event.target.value); setPage(1); }} />
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des responsables…</p> : <><Button variant="outline" aria-pressed={!value} onClick={() => choose("", "Toute l’équipe")}><ContactsIcon size={20} aria-hidden="true" />Toute l’équipe accessible</Button><ul className="kay-work-list">{query.value.items.map(item => <li key={item.id}><Button variant="quiet" className="w-full justify-start whitespace-normal text-start" aria-pressed={item.id === value} onClick={() => choose(item.id, item.display_name)}><ContactIcon size={20} aria-hidden="true" />{item.display_name}</Button></li>)}</ul>{query.value.total === 0 ? <p>Aucun responsable accessible pour cette recherche.</p> : null}<NumberedPages compact page={page} size={20} total={query.value.total} change={setPage} label="Pages des responsables accessibles" /></>}
  </div>;
}
