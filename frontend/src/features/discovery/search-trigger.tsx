"use client";
import Link from "next/link";
import { useState } from "react";
import { SearchIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { kindLabels, searchSchema } from "./contracts";

export function SearchTrigger() {
  const [open, setOpen] = useState(false), [text, setText] = useState(""), [kind, setKind] = useState("");
  const [query, setQuery] = useState<{ q: string; kind: string }>(), hydrated = useHydrated();
  return <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="outline" className="w-full max-w-entry justify-start gap-3 bg-muted/40 text-muted-foreground" disabled={!hydrated}><SearchIcon aria-hidden="true" />Rechercher</Button></SheetTrigger>
    <SheetContent closeLabel="Fermer la recherche" className="w-full overflow-y-auto p-6 sm:max-w-reading"><SheetHeader className="p-0 pr-6 text-left"><SheetTitle>Recherche globale</SheetTitle><SheetDescription>Résultats accessibles uniquement. Les types réutilisables ouvrent les unités correspondantes, pas une offre.</SheetDescription></SheetHeader>
      <form className="mt-6 grid min-w-0 gap-4" onSubmit={event => { event.preventDefault(); setQuery({ q: text.trim(), kind }); }}><div className="grid gap-2"><Label htmlFor="global-query">Nom, téléphone, référence ou document</Label><Input id="global-query" value={text} minLength={2} maxLength={160} required onChange={event => { setText(event.target.value); setQuery(undefined); }} /></div><div className="grid gap-2"><Label htmlFor="global-kind">Type de résultat</Label><NativeSelect id="global-kind" value={kind} onChange={event => { setKind(event.target.value); setQuery(undefined); }}><option value="">Tous les types</option>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div><Button className="justify-self-start">Lancer la recherche</Button></form>
      {query ? <SearchResults key={JSON.stringify(query)} query={query} close={() => setOpen(false)} /> : <p className="mt-6 text-sm text-muted-foreground">Saisissez au moins deux caractères puis lancez la recherche.</p>}
    </SheetContent></Sheet>;
}
function SearchResults({ query, close }: { query: { q: string; kind: string }; close: () => void }) {
  const [page, setPage] = useState(1), result = useQuery(queryPath("search", { ...query, page, page_size: 10 }), searchSchema);
  return <div className="mt-6 grid min-w-0 gap-4">{result.error ? <RecordError error={result.error} retry={result.refresh} /> : !result.value ? <p role="status">Recherche en cours…</p> : <><p role="status">{result.value.total} résultat(s) accessible(s).</p><p className="wrap-anywhere text-sm text-muted-foreground">{Object.entries(result.value.counts).map(([kind, count]) => `${kindLabels[kind as keyof typeof kindLabels]} : ${count}`).join(" · ")}</p>{result.value.items.length ? <ul className="grid gap-4">{result.value.items.map(item => <li className="grid min-w-0 gap-1 border-b pb-4" key={item.kind + item.id}><span className="text-sm text-muted-foreground">{kindLabels[item.kind]}</span><Link prefetch={false} className="inline-flex min-h-control items-center text-link underline wrap-anywhere" href={item.href} onClick={close}>{item.label}</Link></li>)}</ul> : <p>Aucun résultat accessible sur cette page. Modifiez la recherche ou revenez à la première page.</p>}<NumberedPages label="Pages de recherche" page={page} size={10} total={result.value.total} change={setPage} /></>}</div>;
}
