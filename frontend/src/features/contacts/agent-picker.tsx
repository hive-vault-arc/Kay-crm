"use client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { agentsSchema } from "./contracts";
import { queryPath, useQuery } from "./use-query";
import { RecordError } from "./record-states";

export function AgentPicker({ value, change, label = "Agent responsable", optional = false }: { value: string; change: (id: string, label?: string) => void; label?: string; optional?: boolean }) {
  const controlId = useId();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [chosen, setChosen] = useState<{ id: string; display_name: string }>();
  const { value: result, error, refresh } = useQuery(queryPath("contacts/assignment-options", { q: search, page, page_size: 50 }), agentsSchema);
  const options = result?.items ?? [];
  const items = chosen && chosen.id === value && !options.some(option => option.id === value) ? [chosen, ...options] : options;
  return <div className="grid min-w-0 gap-2">
    <Label htmlFor={`${controlId}-search`}>Rechercher un agent ({label.toLowerCase()})</Label><Input id={`${controlId}-search`} value={search} maxLength={160} onChange={event => { setSearch(event.target.value); setPage(1); }} />
    <Label htmlFor={`${controlId}-choice`}>{label}</Label><NativeSelect id={`${controlId}-choice`} value={value} disabled={!result && !chosen} onChange={event => { const id = event.target.value; const selected = items.find(item => item.id === id); change(id, selected?.display_name); setChosen(selected); }}><option value="">{optional ? "Tous les agents" : "Choisir un agent actif"}</option>{items.map(agent => <option key={agent.id} value={agent.id}>{agent.display_name}</option>)}</NativeSelect>
    {error ? <RecordError error={error} retry={refresh} /> : !result ? <p role="status">Chargement des agents…</p> : result.total === 0 ? <p role="status">Aucun agent actif. Un administrateur doit terminer son activation et son changement de mot de passe.</p> : <div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" disabled={!result.has_previous} onClick={() => setPage(page - 1)}>Agents précédents</Button><span className="text-sm">Page {page}</span><Button type="button" variant="outline" disabled={!result.has_next} onClick={() => setPage(page + 1)}>Agents suivants</Button></div>}
  </div>;
}
