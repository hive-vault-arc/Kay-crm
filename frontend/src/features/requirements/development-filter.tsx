"use client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { developmentsSchema } from "@/features/inventory/development-contracts";

export function DevelopmentFilter({ value, change }: { value: string; change: (id: string) => void }) {
  const id = useId(); const [text, setText] = useState(""); const [q, setQ] = useState(""); const [page, setPage] = useState(1); const [label, setLabel] = useState("");
  const result = useQuery(queryPath("developments", { q, page, page_size: 10 }), developmentsSchema);
  return <div className="grid min-w-0 gap-4"><div className="grid gap-2"><Label htmlFor={`${id}-search`}>Rechercher un programme</Label><Input id={`${id}-search`} maxLength={160} value={text} onChange={event => setText(event.target.value)} /><Button type="button" variant="outline" className="justify-self-start" onClick={() => { setQ(text); setPage(1); }}>Rechercher le programme</Button></div><div className="grid gap-2"><Label htmlFor={`${id}-selection`}>Programme des offres</Label><NativeSelect id={`${id}-selection`} value={value} disabled={!result.value} onChange={event => { const chosen = result.value?.items.find(d => d.id === event.target.value); setLabel(chosen ? `${chosen.reference} : ${chosen.name}` : ""); change(event.target.value); }}><option value="">Tous les programmes et biens indépendants</option>{value && !result.value?.items.some(d => d.id === value) ? <option value={value}>{label || "Programme conservé, autre page"}</option> : null}{result.value?.items.map(d => <option key={d.id} value={d.id}>{d.reference} : {d.name}</option>)}</NativeSelect></div>{result.error ? <RecordError error={result.error} retry={result.refresh} /> : !result.value ? <p role="status">Chargement des programmes…</p> : <><p className="text-sm text-muted-foreground">{result.value.total} programme(s). La sélection reste conservée entre les pages.</p><NumberedPages label="Pages des programmes à filtrer" page={page} total={result.value.total} size={10} change={setPage} /></>}</div>;
}
