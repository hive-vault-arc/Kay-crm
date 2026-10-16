"use client";
import { z } from "zod";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { blocksSchema, floorsSchema, unitTypesSchema } from "./development-contracts";

type LevelPage = { items: { id: string; code: string; label: string }[]; total: number; page: number; page_size: number; has_next: boolean; has_previous: boolean };
export function LevelPicker({ parent, kind, label, value, change, selectedLabel }: { parent: string; kind: "blocks" | "floors" | "unit-types"; label: string; value: string; change: (id: string) => void; selectedLabel?: string }) {
  const [page, setPage] = useState(1);
  const schema: z.ZodType<LevelPage> = kind === "blocks" ? blocksSchema : kind === "floors" ? floorsSchema : unitTypesSchema;
  const result = useQuery(queryPath(`${kind === "floors" ? "blocks" : "developments"}/${parent}/${kind}`, { page, page_size: 25 }), schema);
  const id = `picker-${label.replaceAll(" ", "-")}`;
  return <div className="grid min-w-0 gap-2"><Label htmlFor={id}>{label}</Label><NativeSelect id={id} value={value} onChange={event => change(event.target.value)} disabled={!result.value} aria-describedby={`${id}-status`}><option value="">Aucune sélection</option>{value && !result.value?.items.some(row => row.id === value) ? <option value={value}>{selectedLabel ?? "Sélection conservée (autre page)"}</option> : null}{result.value?.items.map(row => <option key={row.id} value={row.id}>{row.code} · {row.label}</option>)}</NativeSelect><div id={`${id}-status`}>{result.error ? <RecordError error={result.error} retry={result.refresh} /> : !result.value ? <p role="status">Chargement de {label.toLowerCase()}…</p> : <><p className="text-sm text-muted-foreground">{result.value.total} résultat(s). Sélection sur cette page ou sélection conservée.</p><NumberedPages label={`Pages : ${label}`} page={page} total={result.value.total} size={25} change={setPage} /></>}</div></div>;
}
