"use client";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { developmentsSchema } from "@/features/inventory/development-contracts";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { REQUIREMENT_PAGE_SIZE, requirementDenied, requirementPageValid } from "./model";
import type { RequirementDenied } from "./use-requirement-command";

export function DevelopmentFilter({ value, change, disabled, denied }: { value: string; change: (id: string) => void; disabled: boolean; denied: RequirementDenied }) {
  const id = useId(), hydrated = useHydrated(), [text, setText] = useState(""), [q, setQ] = useState(""), [page, setPage] = useState(1), [label, setLabel] = useState("");
  const result = useQuery(queryPath("developments", { q, page, page_size: REQUIREMENT_PAGE_SIZE }), developmentsSchema);
  const invalid = result.value && !requirementPageValid(result.value, page), rows = result.error || invalid ? [] : result.value?.items ?? [];
  useEffect(() => { if (result.error && requirementDenied(result.error)) denied(result.error); }, [result.error, denied]);
  function search() { if (hydrated && !disabled) { setQ(text); setPage(1); } }
  return <div className="grid min-w-0 gap-4"><div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-search`}>Rechercher un programme</Label><div className="flex min-w-0 gap-2"><Input id={`${id}-search`} maxLength={160} value={text} disabled={!hydrated || disabled} onChange={event => { if (hydrated && !disabled) setText(event.target.value); }} onKeyDown={event => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); search(); } }} /><Button action="search" type="button" variant="outline" disabled={!hydrated || disabled} onClick={search}>Rechercher</Button></div></div>
    <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-selection`}>Programme des offres</Label><NativeSelect id={`${id}-selection`} value={value} disabled={!hydrated || disabled || !result.value || Boolean(result.error) || Boolean(invalid)} onChange={event => { if (!hydrated || disabled || result.error || invalid) return; const chosen = rows.find(item => item.id === event.target.value); if (event.target.value && !chosen) return; setLabel(chosen ? `${chosen.reference} · ${chosen.name}` : ""); change(event.target.value); }}><option value="">Tous les programmes et biens indépendants</option>{value && !result.error && !invalid && !rows.some(item => item.id === value) ? <option value={value}>{label || "Programme conservé, autre page"}</option> : null}{rows.map(item => <option key={item.id} value={item.id}>{item.reference} · {item.name}</option>)}</NativeSelect></div>
    {result.error || invalid ? <RecordError error={result.error ?? new ApiError("DEPENDENCY_UNAVAILABLE", 503)} retry={result.refresh} /> : !result.value ? <p role="status">Chargement des programmes…</p> : <><p className="text-xs text-muted-foreground">{result.value.total} programme(s). La sélection reste conservée entre les pages.</p>{result.value.has_previous || result.value.has_next || page > 1 ? <NumberedPages compact label="Pages des programmes à filtrer" page={page} total={result.value.total} size={REQUIREMENT_PAGE_SIZE} change={setPage} /> : null}</>}
  </div>;
}
