"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { RecordError } from "@/features/contacts/record-states";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { developmentsSchema } from "@/features/inventory/development-contracts";
import { propertiesSchema } from "@/features/inventory/contracts";
import type { z } from "zod";
import type { projectChoiceSchema } from "./qualification-contracts";

export type ProjectSelection = { choice: z.infer<typeof projectChoiceSchema>; label: string };
type Props = { selected?: ProjectSelection; choose: (value: ProjectSelection | undefined) => void };

export function ProjectPicker({ selected, choose }: Props) {
  const id = useId();
  const [mode, setMode] = useState("development");
  const selectedMode = selected?.choice.external_name != null ? "external" : selected?.choice.property_id ? "property" : mode;
  return <fieldset className="grid min-w-0 gap-3"><legend className="mb-2 font-medium">Projet *</legend>
    <Label htmlFor={`${id}-mode`} className="sr-only">Type de projet</Label><NativeSelect id={`${id}-mode`} value={selectedMode} onChange={event => { setMode(event.target.value); choose(undefined); }}><option value="development">Programme du catalogue</option><option value="property">Bien indépendant du catalogue</option><option value="external">Autre projet</option></NativeSelect>
    {selectedMode === "external" ? <div className="grid gap-2"><Label htmlFor={`${id}-external`}>Nom du projet externe *</Label><Input id={`${id}-external`} value={selected?.choice.external_name ?? ""} maxLength={160} onChange={event => choose({ choice: { external_name: event.target.value }, label: event.target.value })} /></div>
      : selectedMode === "property" ? <PropertyProject selected={selected} choose={choose} /> : <DevelopmentProject selected={selected} choose={choose} />}
    <p className="text-xs text-muted-foreground">Le projet exprime l’intérêt du client. Aucune unité ni offre n’est réservée.</p>
  </fieldset>;
}

function DevelopmentProject({ selected, choose }: Props) {
  const id = useId(); const [q, setQ] = useState(""); const [page, setPage] = useState(1);
  const query = useQuery(queryPath("developments", { q, page, page_size: 25 }), developmentsSchema);
  return <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-search`}>Rechercher un programme</Label><Input id={`${id}-search`} value={q} maxLength={160} onChange={event => { setQ(event.target.value); setPage(1); }} />
    <Label htmlFor={`${id}-project`}>Programme *</Label><NativeSelect id={`${id}-project`} value={selected?.choice.development_id ?? ""} disabled={!query.value} onChange={event => { const project = query.value?.items.find(row => row.id === event.target.value); choose(project ? { choice: { development_id: project.id }, label: project.name } : undefined); }}>
      <option value="">Choisir un programme…</option>{selected?.choice.development_id && !query.value?.items.some(row => row.id === selected.choice.development_id) ? <option value={selected.choice.development_id}>{selected.label}</option> : null}
      {query.value?.items.map(project => <option key={project.id} value={project.id}>{project.name} · {project.reference}</option>)}
    </NativeSelect>
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des programmes…</p> : query.value.total === 0 ? <p>Aucun programme trouvé. Choisissez un autre projet ou un projet externe.</p> : query.value.total > 25 ? <NumberedPages page={page} size={25} total={query.value.total} change={setPage} label="Pages des programmes" /> : null}
  </div>;
}
function PropertyProject({ selected, choose }: Props) {
  const id = useId(); const [q, setQ] = useState(""); const [page, setPage] = useState(1);
  const query = useQuery(queryPath("properties", { q, page, page_size: 25, target_level: "standalone" }), propertiesSchema);
  return <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-search`}>Rechercher un bien indépendant</Label><Input id={`${id}-search`} value={q} maxLength={160} onChange={event => { setQ(event.target.value); setPage(1); }} />
    <Label htmlFor={`${id}-project`}>Bien indépendant *</Label><NativeSelect id={`${id}-project`} value={selected?.choice.property_id ?? ""} disabled={!query.value} onChange={event => { const project = query.value?.items.find(row => row.id === event.target.value); choose(project ? { choice: { property_id: project.id }, label: project.marketing_name ?? project.reference } : undefined); }}>
      <option value="">Choisir un bien…</option>{selected?.choice.property_id && !query.value?.items.some(row => row.id === selected.choice.property_id) ? <option value={selected.choice.property_id}>{selected.label}</option> : null}
      {query.value?.items.map(project => <option key={project.id} value={project.id}>{project.marketing_name || project.reference} · {project.location ?? "Localisation non renseignée"}</option>)}
    </NativeSelect>
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des biens…</p> : query.value.total === 0 ? <p>Aucun bien indépendant trouvé.</p> : query.value.total > 25 ? <NumberedPages page={page} size={25} total={query.value.total} change={setPage} label="Pages des biens indépendants" /> : null}
  </div>;
}
