"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ForwardIcon, SearchIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { searchHelp } from "./search";
import { helpCategoryIcons } from "./category-icon";
import type { HelpArticle, HelpCategory } from "./types";

type Category = { id: HelpCategory; title: string; description: string };
export function HelpDirectory({ articles, categories }: { articles: HelpArticle[]; categories: Category[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<HelpCategory | "all">("all");
  const input = useRef<HTMLInputElement>(null);
  const matching = searchHelp(articles, query);
  const visible = category === "all" ? matching : matching.filter(article => article.category === category);
  const reset = () => { setQuery(""); setCategory("all"); input.current?.focus(); };
  const count = (id: string) => matching.filter(article => article.category === id).length;
  return <div className="grid min-w-0 gap-4">
    <div role="search" aria-label="Recherche dans l’aide" className="surface flex min-w-0 flex-wrap items-end gap-3">
      <div className="grid min-w-0 flex-1 basis-64 gap-2"><Label htmlFor="help-search">Que souhaitez-vous faire ?</Label><div className="relative"><SearchIcon aria-hidden="true" className="pointer-events-none absolute top-3 left-3 size-5 text-muted-foreground" /><Input ref={input} id="help-search" type="search" maxLength={160} autoComplete="off" className="pl-10" placeholder="Ex. ajouter un prospect, photos, notifications…" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); setQuery(""); } }} /></div></div>
      <div className="grid min-w-0 flex-1 basis-48 gap-2 lg:hidden"><Label htmlFor="help-category">Rubrique</Label><NativeSelect id="help-category" value={category} onChange={event => setCategory(event.target.value as typeof category)}><option value="all">Tous les guides ({matching.length})</option>{categories.map(item => <option key={item.id} value={item.id}>{item.title} ({count(item.id)})</option>)}</NativeSelect></div>
      <Button action="reset" type="button" variant="outline" disabled={!query && category === "all"} onClick={reset}>Réinitialiser</Button>
    </div>
    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-4">
      <nav aria-label="Rubriques de l’aide" className="surface hidden min-w-0 gap-1 lg:grid">
        <h2 className="mb-2 text-section font-medium">Les guides KAY</h2>
        <Button action="filter" variant="ghost" type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")} className={cn("justify-start text-left", category === "all" && "bg-accent text-accent-foreground")}><span className="flex min-w-0 items-center justify-between gap-2">Tous les guides <span className="tabular-nums">{matching.length}</span></span></Button>
        {categories.map(item => <Button action="filter" key={item.id} type="button" variant="ghost" aria-pressed={category === item.id} onClick={() => setCategory(item.id)} className={cn("h-auto min-h-control justify-start text-left", category === item.id && "bg-accent text-accent-foreground")}><span className="flex min-w-0 items-center justify-between gap-2">{item.title}<span className="tabular-nums">{count(item.id)}</span></span></Button>)}
        <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">Les guides correspondent à votre rôle. L’accès aux dossiers reste vérifié par KAY.</p>
      </nav>
      <div className="grid min-w-0 gap-4 lg:col-span-3">
        <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-muted-foreground">{visible.length} guide{visible.length > 1 ? "s" : ""}{query.trim() ? ` pour « ${query.trim()} »` : " disponible(s)"}{category !== "all" ? ` · ${categories.find(item => item.id === category)?.title}` : ""}</p>
        {visible.length ? categories.filter(item => category === "all" || item.id === category).map(item => {
          const group = visible.filter(article => article.category === item.id);
          if (!group.length) return null;
          const Icon = helpCategoryIcons[item.id];
          return <section key={item.id} aria-labelledby={`help-${item.id}`} className="surface grid min-w-0 gap-3">
            <div className="flex min-w-0 items-start gap-3"><Icon aria-hidden="true" className="mt-1 size-5 shrink-0 text-link" /><div className="min-w-0"><h2 id={`help-${item.id}`} className="text-section font-medium">{item.title}</h2><p className="mt-1 text-sm text-muted-foreground">{item.description}</p></div></div>
            <ul className="grid min-w-0 gap-x-6 sm:grid-cols-2">{group.map(article => <li key={article.slug} className="min-w-0 border-t"><Link prefetch={false} href={`/help/${article.slug}`} className="group flex min-h-control items-start gap-3 rounded-sm py-4 outline-offset-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-link group-hover:underline">{article.title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{article.summary}</p></div><ForwardIcon aria-hidden="true" className="mt-1 size-4 shrink-0 text-link" /></Link></li>)}</ul>
          </section>;
        }) : <section className="surface grid min-w-0 gap-3" aria-labelledby="help-empty"><h2 id="help-empty" className="text-section font-medium">Aucun guide ne correspond</h2><p className="text-sm text-muted-foreground">Essayez un mot plus simple, comme « prospect », « visite » ou « photo », ou consultez toutes les rubriques.</p><Button action="reset" type="button" variant="outline" className="justify-self-start" onClick={reset}>Voir tous les guides</Button></section>}
      </div>
    </div>
  </div>;
}
