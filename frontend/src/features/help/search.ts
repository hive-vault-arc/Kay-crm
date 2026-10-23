import type { HelpArticle } from "./types";

const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/[’']/g, " ");
export function searchHelp(articles: HelpArticle[], query: string) {
  const words = normalize(query.trim().slice(0, 160)).split(/\s+/).filter(Boolean);
  return articles.filter(article => {
    const text = normalize([article.title, article.summary, ...article.keywords, ...article.sections.flatMap(section => [section.title, ...(section.steps ?? []), ...(section.paragraphs ?? []), section.note ?? ""])].join(" "));
    return words.every(word => text.includes(word));
  });
}
