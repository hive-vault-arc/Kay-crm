import { notFound } from "next/navigation";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { articlesForRole, helpArticleForRole } from "@/features/help/catalog";
import { HelpArticle } from "@/features/help/help-article";
import { parseHelpNavigation } from "@/features/help/navigation";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Guide | Aide KAY" };
export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) notFound();
  const identity = await requireIdentity(`/help/${slug}`);
  if (identity.state !== "authenticated") return <AuthUnavailable path={`/help/${slug}`} />;
  const article = helpArticleForRole(slug, identity.profile.user.role);
  if (!article) notFound();
  const articles = articlesForRole(identity.profile.user.role);
  const related = article.related.flatMap(slug => {
    const item = articles.find(candidate => candidate.slug === slug);
    return item ? [item] : [];
  });
  const context = parseHelpNavigation(await searchParams, articles.map(item => item.category));
  return <HelpArticle article={article} related={related} navigation={context.query || context.page > 1 ? context : undefined} />;
}
