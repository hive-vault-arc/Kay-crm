"use client";

import { useId, useState } from "react";
import type { z } from "zod";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import type { ApiError } from "@/lib/api/client";
import type { visitPropertiesSchema } from "./contracts";

type Choices = z.infer<typeof visitPropertiesSchema>;
type Choice = Choices["items"][number];
const label = ({ reference, name }: Choice) => name ? `${reference} · ${name}` : reference;

export function VisitPropertySelect({ value, change, items, error, retry, page, setPage }: {
  value: string | null; change: (id: string | null) => void; items?: Choices;
  error?: ApiError; retry: () => void; page: number; setPage: (page: number) => void;
}) {
  const id = useId();
  const [selected, setSelected] = useState<Choice>();
  const choices = items?.items ?? [];
  const current = selected?.id === value ? selected : items?.current?.id === value ? items.current : undefined;
  return <div className="kay-drawer-form-section grid min-w-0 gap-2">
    <Label htmlFor={id}>Bien concerné</Label>
    <NativeSelect id={id} value={value ?? ""} disabled={!items || Boolean(error)} onChange={event => {
      const next = event.target.value;
      setSelected(choices.find(choice => choice.id === next) ?? (next === current?.id ? current : undefined));
      change(next || null);
    }}>
      <option value="">Aucun bien lié</option>
      {value && !choices.some(choice => choice.id === value) ? <option value={value}>{current ? label(current) : "Bien actuellement sélectionné"}</option> : null}
      {choices.map(choice => <option key={choice.id} value={choice.id}>{label(choice)}</option>)}
    </NativeSelect>
    {error ? <RecordError error={error} retry={retry} /> : !items ? <p role="status" className="text-sm">Chargement des biens liés…</p> : !items.total && !value ? <p className="text-sm text-muted-foreground">Aucun bien lié à ce dossier.</p> : null}
    {items && (items.has_next || page > 1) ? <NumberedPages compact label="Pages des biens liés" page={page} size={items.page_size} total={items.total} change={setPage} /> : null}
  </div>;
}
