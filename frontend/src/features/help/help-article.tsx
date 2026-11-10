import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { AlertIcon, FileIcon } from "@/components/icons";
import { helpCategoryIcons } from "./category-icon";
import { helpArticlePath, helpDirectoryPath, type HelpNavigation } from "./navigation";
import type { HelpArticle as Article } from "./types";

const locations: Record<string, string> = { "/dashboard": "Tableau de bord", "/leads/new": "Prospects → Nouveau prospect", "/leads": "Prospects → Ouvrir une fiche", "/deals": "Affaires → Ouvrir une fiche", "/projects": "Projets", "/projects/properties/new": "Projets → Nouveau bien", "/owners": "Propriétaires", "/visits": "Calendrier des visites", "/settings/users": "Paramètres → Utilisateurs", "/notifications": "Cloche → Notifications" };

export function HelpArticle({ article, related, navigation }: { article: Article; related: Article[]; navigation?: HelpNavigation }) {
  const Icon = helpCategoryIcons[article.category];
  function section(section: Article["sections"][number], index: number) {
    return <section key={section.title} aria-labelledby={"section-" + (index + 1)} className="kay-help-guide-section"><h3 id={"section-" + (index + 1)} tabIndex={-1}>{section.title}</h3>
      {section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      {section.steps ? <ol className="kay-help-instructions">{section.steps.map(step => <li key={step}><span>{step}</span></li>)}</ol> : null}
      {section.note ? <div className="kay-help-note"><AlertIcon size={16} aria-hidden="true" /><p>{section.note}</p></div> : null}
    </section>;
  }
  return <div className="kay-help-page">
    <PageHeader title="Centre d’aide" description="Les bons repères pour utiliser KAY." route={"/help/" + article.slug} />
    <section className="kay-help-reader kay-surface"><div className="kay-help-reading-scroll" role="region" aria-label="Lecture du guide" tabIndex={0}>
      <article aria-labelledby="help-guide-title">
        <Button action="back" variant="quiet" className="kay-help-back" asChild><Link href={helpDirectoryPath(navigation ?? { topic: article.category })}>Retour aux guides</Link></Button>
        <header className="kay-help-guide-heading"><span className="kay-help-topic-icon"><Icon size={20} aria-hidden="true" /></span><div><h2 id="help-guide-title" tabIndex={-1}>{article.title}</h2><p>{article.summary}</p></div>{article.action ? <Button action="forward" variant="secondary" asChild><Link href={article.action.href}>{article.action.label}</Link></Button> : null}</header>
        {article.action && locations[article.action.href] ? <p className="kay-help-location"><span>Où aller</span><strong>{locations[article.action.href]}</strong></p> : null}
        <div className="kay-help-reader-columns"><div>{article.sections.slice(0, 1).map(section)}</div><div>{article.sections.slice(1).map((entry, index) => section(entry, index + 1))}</div></div>
        {related.length ? <footer className="kay-help-related"><h3>À lire aussi</h3><ul>{related.map(item => <li key={item.slug}><Link href={helpArticlePath(item.slug, navigation)} prefetch={false}><FileIcon size={16} aria-hidden="true" /><span>{item.title}</span></Link></li>)}</ul></footer> : null}
      </article>
    </div></section>
  </div>;
}
