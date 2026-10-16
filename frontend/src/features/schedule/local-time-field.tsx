"use client";
import { useEffect, useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { localTimeSchema } from "./contracts";
import { localLabel } from "./time";

export function LocalTimeField({ label, local, changeLocal, instant, choose }: { label: string; local: string; changeLocal: (value: string) => void; instant: string; choose: (value: string) => void }) {
  const id = useId();
  return <div className="grid min-w-0 gap-2"><Label htmlFor={id}>{label} (heure de Casablanca)</Label><Input id={id} type="datetime-local" min="2000-01-01T00:00" max="2100-12-31T23:59" value={local} onChange={e => { choose(""); changeLocal(e.target.value); }} aria-describedby={`${id}-help`} /><p id={`${id}-help`} className="text-sm text-muted-foreground">Date et heure interprétées par le serveur de l’agence.</p>{/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) ? <Resolved key={local} local={local} instant={instant} choose={choose} label={label} /> : null}</div>;
}
function Resolved({ local, instant, choose, label }: { local: string; instant: string; choose: (value: string) => void; label: string }) {
  const query = useQuery(queryPath("calendar/local-time", { local }), localTimeSchema), id = useId();
  const single = query.value?.choices.length === 1 ? query.value.choices[0].instant : undefined;
  useEffect(() => { if (single && instant !== single) choose(single); }, [single, instant, choose]);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  if (!query.value) return <p role="status">Vérification de l’heure…</p>;
  if (!query.value.choices.length) return <p role="alert" className="text-danger">Cette heure locale n’existe pas lors du changement d’heure. Choisissez une autre heure.</p>;
  if (single) return <p className="text-sm">{localLabel(query.value.choices[0].local)}</p>;
  return <div className="grid gap-2"><Label htmlFor={id}>{label} : choisir l’occurrence</Label><NativeSelect id={id} value={instant} onChange={e => choose(e.target.value)}><option value="">Heure répétée : choisissez une occurrence</option>{query.value.choices.map(v => <option key={v.instant} value={v.instant}>{localLabel(v.local)}</option>)}</NativeSelect></div>;
}
