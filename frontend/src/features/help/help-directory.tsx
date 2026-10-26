"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ForwardIcon, SearchIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { searchHelp } from "./search";
import { helpCategoryIcons } from "./category-icon";
import { helpDirectoryPath, helpGuidePage, type HelpNavigation } from "./navigation";
import type { HelpArticle, HelpCategory } from "./types";

type Category = { id: HelpCategory; title: string; description: string };
export function HelpDirectory({ articles, categories, navigation }: { articles: HelpArticle[]; categories: Category[]; navigation: HelpNavigation }) {
  const router = useRouter(), input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(navigation.query);
  const home = navigation.topic === "all" && !navigation.query;
  const matching = searchHelp(articles, navigation.query).filter(article => navigation.topic === "all" || article.category === navigation.topic);
  const results = helpGuidePage(matching, navigation.page);
  const topic = categories.find(category => category.id === navigation.topic);
  const title = topic?.title ?? "Résultats de recherche";
  function search() { router.push(helpDirectoryPath({ ...navigation, query: draft, page: 1 })); }
  const searchField = <form data-filter-panel action="/help" method="get" role="search" aria-label="Recherche dans l’aide" className="kay-help-search" onSubmit={event => { event.preventDefault(); search(); }}><Label className="sr-only" htmlFor="help-search">Rechercher dans l’aide</Label>{navigation.topic !== "all" ? <Input type="hidden" name="topic" value={navigation.topic} /> : null}<div className="kay-help-search-field"><SearchIcon aria-hidden="true" size={16} /><Input id="help-search" name="q" ref={input} type="search" maxLength={160} autoComplete="off" placeholder="Rechercher dans l’aide" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); setDraft(""); } }} /></div><Button action="search" type="submit">Rechercher</Button></form>;
  return <div className="kay-help-page">
    <PageHeader title="Centre d’aide" description="Les bons repères pour utiliser KAY." route="/help" />
    {home ? <div className="kay-help-home">
      <header className="kay-help-welcome"><div><h2>Comment peut-on vous aider ?</h2><p>Une question, une action : retrouvez les bons repères.</p></div>{searchField}</header>
      <div className="kay-help-topic-grid">{categories.map(category => {
        const guides = articles.filter(article => article.category === category.id), Icon = helpCategoryIcons[category.id];
        return <section key={category.id} className="kay-help-topic kay-surface"><header><span className="kay-help-topic-icon"><Icon size={20} aria-hidden="true" /></span><div><h3>{category.title}</h3><p>{category.description}</p></div></header><ul className="kay-help-topic-links">{guides.slice(0, 2).map(article => <li key={article.slug}><Link href={"/help/" + article.slug} prefetch={false}><span>{article.title}</span><ForwardIcon size={16} aria-hidden="true" /></Link></li>)}</ul><Link href={helpDirectoryPath({ topic: category.id })} className="kay-help-topic-more"><span>{guides.length === 1 ? "Voir le guide" : "Voir les " + guides.length + " guides"}</span><ForwardIcon size={16} aria-hidden="true" /></Link></section>;
      })}</div>
    </div> : <section className="kay-help-catalog kay-surface" aria-label={title}>
      <header className="kay-help-catalog-head"><div><Button action="back" variant="quiet" asChild><Link href="/help">Tous les sujets</Link></Button><h2 tabIndex={-1}>{title}</h2><p role="status">{results.total} guide(s){navigation.query ? " pour « " + navigation.query + " »" : ""}</p></div>{searchField}</header>
      <div className="kay-help-results">{results.items.length ? <ul className="kay-help-guide-grid">{results.items.map(article => {
        const Icon = helpCategoryIcons[article.category];
        return <li key={article.slug}><Link href={"/help/" + article.slug} prefetch={false} className="kay-help-guide-card kay-surface"><header><span className="kay-help-topic-icon"><Icon size={20} aria-hidden="true" /></span><h3>{article.title}</h3></header><p>{article.summary}</p><span className="kay-help-guide-open">Lire le guide<ForwardIcon size={16} aria-hidden="true" /></span></Link></li>;
      })}</ul> : <div className="kay-help-empty"><SearchIcon size={24} aria-hidden="true" /><h3>Aucun guide ne correspond</h3><p>Essayez un mot plus simple, comme « prospect », « visite » ou « photo ».</p><Button action="reset" variant="outline" asChild><Link href="/help">Tous les sujets</Link></Button></div>}</div>
      {results.total ? <NumberedPages compact label="Pages des guides" page={results.page} total={results.total} size={results.size} change={page => router.push(helpDirectoryPath({ ...navigation, page }))} /> : null}
    </section>}
  </div>;
}
