import { notFound } from "next/navigation";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { articlesForRole, helpArticleForRole, helpCategories } from "@/features/help/catalog";
import { HelpArticle } from "@/features/help/help-article";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Guide | Aide KAY" };
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) notFound();
  const identity = await requireIdentity(`/help/${slug}`);
  if (identity.state !== "authenticated") return <AuthUnavailable path={`/help/${slug}`} />;
  const article = helpArticleForRole(slug, identity.profile.user.role);
  if (!article) notFound();
  const related = articlesForRole(identity.profile.user.role).filter(item => article.related.includes(item.slug));
  return <HelpArticle article={article} category={helpCategories.find(category => category.id === article.category)!.title} related={related} />;
}
