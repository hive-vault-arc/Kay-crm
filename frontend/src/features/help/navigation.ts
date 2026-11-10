import type { HelpArticle, HelpCategory } from "./types";

export type HelpNavigation = { topic: HelpCategory | "all"; query: string; page: number };
export function parseHelpNavigation(params: Record<string, string | string[] | undefined>, allowed: HelpCategory[]): HelpNavigation {
  const topic = typeof params.topic === "string" && allowed.includes(params.topic as HelpCategory) ? params.topic as HelpCategory : "all";
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 160) : "";
  const page = typeof params.page === "string" && /^[1-9][0-9]{0,5}$/.test(params.page) ? Number(params.page) : 1;
  return { topic, query, page };
}
export function helpDirectoryPath(navigation: Partial<HelpNavigation> = {}) {
  const params = new URLSearchParams();
  if (navigation.topic && navigation.topic !== "all") params.set("topic", navigation.topic);
  if (navigation.query?.trim()) params.set("q", navigation.query.trim().slice(0, 160));
  if (navigation.page && navigation.page > 1) params.set("page", String(navigation.page));
  return `/help${params.size ? `?${params}` : ""}`;
}
export function helpArticlePath(slug: string, navigation?: HelpNavigation) {
  const context = navigation && (navigation.query || navigation.page > 1) ? helpDirectoryPath(navigation).slice("/help".length) : "";
  return `/help/${slug}${context}`;
}
export function helpGuidePage(articles: HelpArticle[], requestedPage: number) {
  const size = 20;
  const page = Math.max(1, Math.min(requestedPage, Math.max(1, Math.ceil(articles.length / size))));
  return { page, size, total: articles.length, items: articles.slice((page - 1) * size, page * size) };
}
