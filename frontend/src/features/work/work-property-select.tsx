"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { propertiesSchema, propertySchema, type Property } from "@/features/inventory/contracts";

const label = (property: Pick<Property, "reference" | "marketing_name" | "development_id">) =>
  `${property.reference}${property.marketing_name ? ` · ${property.marketing_name}` : ""}${property.development_id ? " · Unité" : ""}`;

/** Context only: shared physical inventory, never an offering or reservation. */
export function WorkPropertySelect({ value, change, purpose = "task" }: { value: string | null; change: (id: string | null) => void; purpose?: "task" | "visit" }) {
  const id = useId();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const query = useQuery(queryPath("properties", { q, page, page_size: 25, archive: "active" }), propertiesSchema);
  const selectedOnPage = query.value?.items.find(property => property.id === value);
  return <fieldset className="kay-drawer-form-section grid min-w-0 gap-3"><legend className="mb-3 text-sm font-medium">Bien lié (facultatif)</legend>
    {value && !selectedOnPage ? <SelectedPropertySummary key={value} id={value} /> : null}
    <div className="grid gap-2"><Label htmlFor={`${id}-search`}>Rechercher un bien ou une unité</Label><Input id={`${id}-search`} type="search" value={q} maxLength={160} onChange={event => { setQ(event.target.value); setPage(1); }} onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }} /></div>
    <div className="grid gap-2"><Label htmlFor={`${id}-choice`}>Bien concerné</Label><NativeSelect id={`${id}-choice`} value={value ?? ""} disabled={!query.value || Boolean(query.error)} onChange={event => change(event.target.value || null)}><option value="">Aucun bien lié</option>
      {value && !selectedOnPage ? <option value={value}>Bien actuellement lié</option> : null}
      {query.value?.items.map(property => <option key={property.id} value={property.id}>{label(property)}</option>)}
    </NativeSelect></div>
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des biens…</p> : query.value.total === 0 ? <p className="text-sm text-muted-foreground">{value ? "Aucun bien actif ne correspond. Le lien actuel reste conservé." : "Aucun bien actif ne correspond."}</p> : null}
    {query.value && (query.value.total > 25 || page > 1) ? <NumberedPages compact page={page} size={25} total={query.value.total} change={setPage} label="Pages des biens et unités" /> : null}
    <p className="text-xs text-muted-foreground">Ce lien précise le contexte de {purpose === "visit" ? "la visite" : "la tâche"}. Il ne réserve aucune offre et ne modifie pas la disponibilité.</p>
  </fieldset>;
}

function SelectedPropertySummary({ id }: { id: string }) {
  const query = useQuery(`/api/v1/properties/${id}`, propertySchema);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  return query.value ? <p className="text-sm wrap-anywhere">Bien actuellement lié : {label(query.value)}{query.value.archived_at ? " · Archivé" : ""}</p> : <p role="status">Vérification du bien lié…</p>;
}
