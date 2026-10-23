import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { ForwardIcon } from "@/components/icons";
import { helpCategoryIcons } from "./category-icon";
import type { HelpArticle as Article } from "./types";

export function HelpArticle({ article, category, related }: { article: Article; category: string; related: Article[] }) {
  const Icon = helpCategoryIcons[article.category];
  return <div className="grid min-w-0 gap-4">
    <nav aria-label="Fil d’Ariane de l’aide"><ol className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm"><li><Link href="/help" className="inline-flex min-h-control items-center text-link underline">Aide KAY</Link></li><li aria-hidden="true">/</li><li className="text-muted-foreground">{category}</li></ol></nav>
    <PageHeader title={article.title} description={article.summary} route={`/help/${article.slug}`} icon={Icon} actions={<Button action="back" variant="outline" asChild><Link href="/help">Tous les guides</Link></Button>} />
    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-4">
      <aside className="surface grid min-w-0 gap-4" aria-label="Repères du guide">
        <nav aria-label="Sommaire du guide"><h2 className="font-semibold">Dans ce guide</h2><ol className="mt-2 grid gap-1 text-sm">{article.sections.map((section, index) => <li key={section.title}><a href={`#section-${index + 1}`} className="flex min-h-control items-center py-2 text-link underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{section.title}</a></li>)}</ol></nav>
        {article.action ? <div className="grid min-w-0 gap-2 border-t pt-4"><p className="text-xs text-muted-foreground">Passer à la pratique</p><Button action="forward" variant="outline" asChild className="w-full text-left"><Link href={article.action.href}>{article.action.label}</Link></Button></div> : null}
        <p className="border-t pt-3 text-xs text-muted-foreground">Ce guide explique le fonctionnement de KAY. Les actions et les données disponibles dépendent toujours de vos droits actuels.</p>
      </aside>
      <article aria-label={article.title} className="surface grid min-w-0 gap-6 lg:col-span-3">
        {article.sections.map((section, index) => <section key={section.title} aria-labelledby={`section-${index + 1}`} className="grid min-w-0 gap-3 border-b pb-6 last:border-b-0 last:pb-0">
          <h2 id={`section-${index + 1}`} tabIndex={-1} className="scroll-mt-4 text-section font-medium outline-offset-2">{section.title}</h2>
          {section.paragraphs?.map(paragraph => <p key={paragraph} className="max-w-reading text-sm leading-relaxed wrap-anywhere">{paragraph}</p>)}
          {section.steps ? <ol className="grid max-w-reading list-decimal gap-3 pl-6 text-sm leading-relaxed">{section.steps.map(step => <li key={step} className="pl-1 wrap-anywhere">{step}</li>)}</ol> : null}
          {section.note ? <p className="max-w-reading rounded-sm bg-warning-background p-4 text-sm leading-relaxed text-warning wrap-anywhere">{section.note}</p> : null}
        </section>)}
      </article>
    </div>
    {related.length ? <section className="surface grid min-w-0 gap-3" aria-labelledby="help-related"><h2 id="help-related" className="text-section font-medium">Pour continuer</h2><ul className="grid min-w-0 gap-x-6 sm:grid-cols-2 xl:grid-cols-3">{related.map(item => <li key={item.slug} className="min-w-0 border-t"><Link href={`/help/${item.slug}`} prefetch={false} className="flex min-h-control items-center justify-between gap-3 py-3 text-sm font-medium text-link underline-offset-4 hover:underline"><span className="min-w-0">{item.title}</span><ForwardIcon aria-hidden="true" className="size-4 shrink-0" /></Link></li>)}</ul></section> : null}
  </div>;
}
