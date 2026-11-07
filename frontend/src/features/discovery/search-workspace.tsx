"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { kindLabels, searchPageQuerySchema, searchSchema, type SearchPageQuery } from "./contracts";
import { searchPageHref } from "./search-model";
import { SearchEmpty, SearchResultLink } from "./search-presentation";

export function SearchWorkspace({ initial, invalidQuery = false, panel = false, close }: { initial?: SearchPageQuery; invalidQuery?: boolean; panel?: boolean; close?: () => void }) {
  const [draft, setDraft] = useState({ q: initial?.q ?? "", kind: initial?.kind ?? "" });
  const [query, setQuery] = useState(initial), [invalid, setInvalid] = useState(invalidQuery);
  const [pending, transition] = useTransition();
  const router = useRouter(), { request, dialog } = useUnsavedGuard(), hydrated = useHydrated(), id = useId();
  const apply = (next: SearchPageQuery) => {
    if (panel) { setQuery(next); return; }
    request(() => transition(() => router.push(searchPageHref(next))));
  };
  return <div className={`kay-search-workspace ${panel ? "" : "kay-surface"}`}>
    <form method="get" action="/search" className="kay-search-form" onSubmit={event => {
      event.preventDefault(); const parsed = searchPageQuerySchema.safeParse({ q: draft.q, kind: draft.kind || undefined });
      if (!parsed.success) { setInvalid(true); return; }
      setInvalid(false); apply(parsed.data);
    }}><fieldset disabled={!hydrated || pending} className="contents"><div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-query`}>Nom, téléphone ou référence</Label><Input id={`${id}-query`} name="q" type="search" value={draft.q} minLength={2} maxLength={160} autoComplete="off" spellCheck={false} required onChange={event => { setDraft(current => ({ ...current, q: event.target.value })); if (panel) setQuery(undefined); }} aria-describedby={invalid ? `${id}-error` : undefined} /></div><div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-kind`}>Type de résultat</Label><NativeSelect id={`${id}-kind`} name="kind" value={draft.kind} onChange={event => { setDraft(current => ({ ...current, kind: event.target.value as typeof draft.kind })); if (panel) setQuery(undefined); }}><option value="">Tous les types</option>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div><Button action="search" type="submit">Rechercher</Button></fieldset></form>
    {invalid ? <p id={`${id}-error`} role="alert" className="text-danger">Saisissez entre 2 et 160 caractères et choisissez un type valide. Les paramètres de page doivent être valides.</p> : null}
    <p className="kay-search-note">Seules les fiches accessibles sont affichées. Un type réutilisable ouvre ses unités ; un document ouvre son dossier.</p>
    {pending ? <p role="status">Recherche en cours…</p> : query ? <FullSearchResults key={JSON.stringify(query)} query={query} disabled={!hydrated} close={close} change={next => { setDraft({ q: next.q, kind: next.kind ?? "" }); apply(next); }} /> : <SearchEmpty />}
    {dialog}
  </div>;
}

function FullSearchResults({ query, disabled, change, close }: { query: SearchPageQuery; disabled: boolean; change: (query: SearchPageQuery) => void; close?: () => void }) {
  const result = useQuery(queryPath("search", { ...query, page: query.page ?? 1, page_size: 20 }), searchSchema);
  if (result.error) return <RecordError error={result.error} retry={result.refresh} />;
  if (!result.value) return <p role="status">Recherche en cours…</p>;
  const value = result.value, all = Object.values(value.counts).reduce((sum, count) => sum + (count ?? 0), 0);
  return <Tabs value={query.kind ?? "all"} onValueChange={kind => change({ q: query.q, kind: kind === "all" ? undefined : kind as SearchPageQuery["kind"], page: 1 })}><TabsList className="kay-search-types" aria-label="Types de résultats"><TabsTrigger value="all" disabled={disabled}>Tous <span>{all.toLocaleString("fr-MA")}</span></TabsTrigger>{Object.entries(kindLabels).filter(([kind]) => (value.counts[kind as keyof typeof kindLabels] ?? 0) > 0 || kind === query.kind).map(([kind, label]) => <TabsTrigger key={kind} value={kind} disabled={disabled}>{label} <span>{(value.counts[kind as keyof typeof kindLabels] ?? 0).toLocaleString("fr-MA")}</span></TabsTrigger>)}</TabsList><TabsContent value={query.kind ?? "all"} className="grid min-w-0 gap-4"><div className="flex flex-wrap items-center justify-between gap-2"><p role="status">{value.total.toLocaleString("fr-MA")} résultat(s) accessible(s)</p><Button liveRefresh action="refresh" variant="quiet" disabled={disabled} onClick={result.refresh}>Actualiser</Button></div>{value.items.length ? <ul className="kay-search-list">{value.items.map(item => <li key={item.kind + item.id}><SearchResultLink item={item} close={close} /></li>)}</ul> : <SearchEmpty query />}<NumberedPages compact label="Pages de recherche" page={query.page ?? 1} size={20} total={value.total} change={page => change({ ...query, page })} /></TabsContent></Tabs>;
}
