"use client";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { blocksSchema, floorsSchema, unitTypesSchema } from "./development-contracts";
import { ApiError } from "@/lib/api/client";

type LevelPage = { items: { id: string; code: string; label: string }[]; total: number; page: number; page_size: number; has_next: boolean; has_previous: boolean };
export function LevelPicker({ parent, kind, label, value, change, selectedLabel, disabled = false, pageSize = 25, denied }: { parent: string; kind: "blocks" | "floors" | "unit-types"; label: string; value: string; change: (id: string) => void; selectedLabel?: string; disabled?: boolean; pageSize?: 20 | 25; denied?: (error: ApiError) => void }) {
  const [page, setPage] = useState(1);
  const schema: z.ZodType<LevelPage> = kind === "blocks" ? blocksSchema : kind === "floors" ? floorsSchema : unitTypesSchema;
  const result = useQuery(queryPath(`${kind === "floors" ? "blocks" : "developments"}/${parent}/${kind}`, { page, page_size: pageSize }), schema);
  const invalid = result.value && (result.value.page !== page || result.value.page_size !== pageSize || result.value.items.length > pageSize || new Set(result.value.items.map(row => row.id)).size !== result.value.items.length);
  const rows = result.error || invalid ? [] : result.value?.items ?? [];
  useEffect(() => { if (result.error && [401, 403, 404].includes(result.error.status)) denied?.(result.error); }, [result.error, denied]);
  const id = `picker-${label.replaceAll(" ", "-")}`;
  return <div className="grid min-w-0 gap-2"><Label htmlFor={id}>{label}</Label><NativeSelect id={id} value={value} onChange={event => { if (!disabled && !result.error && !invalid) change(event.target.value); }} disabled={disabled || !result.value || Boolean(result.error) || Boolean(invalid)} aria-describedby={`${id}-status`}><option value="">Aucune sélection</option>{value && !result.error && !invalid && !rows.some(row => row.id === value) ? <option value={value}>{selectedLabel ?? "Sélection conservée (autre page)"}</option> : null}{rows.map(row => <option key={row.id} value={row.id}>{row.code} · {row.label}</option>)}</NativeSelect><div id={`${id}-status`}>{result.error || invalid ? <RecordError error={result.error ?? new ApiError("DEPENDENCY_UNAVAILABLE", 503)} retry={result.refresh} /> : !result.value ? <p role="status">Chargement de {label.toLowerCase()}…</p> : <><p className="text-sm text-muted-foreground">{result.value.total} résultat(s). Sélection sur cette page ou sélection conservée.</p>{result.value.has_previous || result.value.has_next || page > 1 ? <NumberedPages compact={pageSize === 20} label={`Pages : ${label}`} page={page} total={result.value.total} size={pageSize} change={next => { if (!disabled) setPage(next); }} /> : null}</>}</div></div>;
}
