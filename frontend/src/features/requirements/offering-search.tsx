"use client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { categoryLabels, inventoryQuerySchema, offeringsSchema, type Offering } from "@/features/inventory/contracts";
import { LevelPicker } from "@/features/inventory/level-picker";
import { useHydrated } from "@/hooks/use-hydrated";
import { cents, type Requirement } from "./contracts";
import { OfferingFacts, targetLabels } from "./offering-card";
import { DevelopmentFilter } from "./development-filter";

export function OfferingSearch({ requirement, pending, select }: { requirement: Requirement; pending: boolean; select: (offering: Offering) => void }) {
  const initial = { q: "", category: "", target_level: "", state: "available", development_id: "", block_id: "", floor_id: "", unit_type_id: "", min_comparison_mad: "", max_comparison_mad: "", min_area_sqm: "", min_rooms: "" };
  const [draft, setDraft] = useState(initial); const [filters, setFilters] = useState(initial); const [page, setPage] = useState(1); const [invalid, setInvalid] = useState(false);
  const prefix = useId(); const hydrated = useHydrated();
  const selected = new Set(requirement.shortlist.map(entry => entry.offering.id));
  const path = queryPath("offerings", { ...filters, page, page_size: 10, kind: requirement.intent });
  const result = useQuery(path, offeringsSchema);
  function apply() {
    const values = Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== ""));
    const valid = inventoryQuerySchema.safeParse({ ...values, kind: requirement.intent });
    const range = !draft.min_comparison_mad || !draft.max_comparison_mad || (valid.success && cents(draft.min_comparison_mad) <= cents(draft.max_comparison_mad));
    setInvalid(!valid.success || !range);
    if (valid.success && range) { setFilters(draft); setPage(1); }
  }
  return <section className="grid min-w-0 gap-6" aria-label="Choisir une offre exacte"><h3 className="text-section font-medium">Rechercher des offres</h3><p>La sélection est manuelle et ne réserve aucun stock. Les préférences ne sont pas des exclusions automatiques ; parking et ascenseur restent à vérifier auprès du responsable.</p>
    <form className="grid min-w-0 gap-4" aria-label="Filtres des offres" noValidate onSubmit={event => { event.preventDefault(); apply(); }}><fieldset className="grid min-w-0 gap-4" disabled={!hydrated || pending}><div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="grid gap-2"><Label htmlFor={`${prefix}-q`}>Référence, nom ou localisation</Label><Input id={`${prefix}-q`} maxLength={160} value={draft.q} onChange={event => setDraft({ ...draft, q: event.target.value })} /></div>
      <div className="grid gap-2"><Label htmlFor={`${prefix}-level`}>Niveau de la cible</Label><NativeSelect id={`${prefix}-level`} value={draft.target_level} onChange={event => setDraft({ ...draft, target_level: event.target.value })}><option value="">Tous les niveaux</option>{Object.entries(targetLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></div>
      <div className="grid gap-2"><Label htmlFor={`${prefix}-category`}>Catégorie des offres</Label><NativeSelect id={`${prefix}-category`} value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}><option value="">Toutes les catégories</option>{Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></div>
      <div className="grid gap-2"><Label htmlFor={`${prefix}-state`}>Statut des offres</Label><NativeSelect id={`${prefix}-state`} value={draft.state} onChange={event => setDraft({ ...draft, state: event.target.value })}><option value="available">Disponibles</option><option value="draft">Brouillons</option><option value="withdrawn">Retirées</option><option value="all">Tous les statuts</option></NativeSelect></div>
      {(["min_comparison_mad", "max_comparison_mad", "min_area_sqm", "min_rooms"] as const).map((key, index) => <div className="grid gap-2" key={key}><Label htmlFor={`${prefix}-${key}`}>{[requirement.intent === "rental" ? "Loyer annuel minimum (MAD)" : "Prix minimum (MAD)", requirement.intent === "rental" ? "Loyer annuel maximum (MAD)" : "Prix maximum (MAD)", "Surface propre minimale (m²)", "Pièces minimales"][index]}</Label><Input id={`${prefix}-${key}`} inputMode={key === "min_rooms" ? "numeric" : "decimal"} maxLength={21} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /></div>)}
    </div>
    <details className="grid min-w-0 gap-4"><summary className="flex min-h-control cursor-pointer items-center text-link underline">Filtrer par programme, bloc, étage ou type</summary><div className="grid min-w-0 gap-4 py-4"><DevelopmentFilter value={draft.development_id} change={development_id => setDraft({ ...draft, development_id, block_id: "", floor_id: "", unit_type_id: "" })} />{draft.development_id ? <div className="grid min-w-0 gap-4 sm:grid-cols-2"><LevelPicker parent={draft.development_id} kind="blocks" label="Bloc des offres" value={draft.block_id} change={block_id => setDraft({ ...draft, block_id, floor_id: "" })} />{draft.block_id ? <LevelPicker key={draft.block_id} parent={draft.block_id} kind="floors" label="Étage des offres" value={draft.floor_id} change={floor_id => setDraft({ ...draft, floor_id })} /> : null}<LevelPicker parent={draft.development_id} kind="unit-types" label="Type des unités proposées" value={draft.unit_type_id} change={unit_type_id => setDraft({ ...draft, unit_type_id })} /></div> : null}<p className="text-sm text-muted-foreground">Le type filtre de vraies unités. Il ne devient jamais une cible à sélectionner.</p></div></details>
    <div className="flex flex-wrap gap-2"><Button action="filter" type="submit" variant="outline">Filtrer les offres</Button><Button action="reset" type="button" variant="outline" onClick={() => { setDraft(initial); setFilters(initial); setPage(1); setInvalid(false); }}>Réinitialiser les offres</Button></div></fieldset></form>
    {invalid ? <p role="alert" className="text-danger">Vérifiez les montants positifs, leur ordre, les surfaces et le nombre entier de pièces. Le dernier résultat valide reste affiché.</p> : null}
    {result.error ? <RecordError error={result.error} retry={result.refresh} /> : !result.value ? <p role="status">Chargement des offres…</p> : <><p role="status">{result.value.total} offre(s) correspondante(s).</p>{result.value.items.length ? <ul className="grid min-w-0 gap-6">{result.value.items.map(offering => <li key={offering.id} className="grid min-w-0 gap-4 border-t pt-4"><OfferingFacts offering={offering} /><Button action="add" type="button" variant="outline" className="justify-self-start" disabled={pending || selected.has(offering.id) || !offering.target} onClick={() => select(offering)}>{selected.has(offering.id) ? "Déjà sélectionnée" : "Ajouter à la sélection"}</Button></li>)}</ul> : <p>Aucune offre ne correspond à ces filtres. Modifiez-les ou affichez les autres statuts.</p>}<NumberedPages label="Pages des offres proposées" page={page} total={result.value.total} size={10} change={setPage} /></>}
  </section>;
}
