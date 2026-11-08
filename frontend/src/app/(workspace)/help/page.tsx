import { AuthUnavailable } from "@/features/auth/auth-frame";
import { articlesForRole, helpCategories } from "@/features/help/catalog";
import { HelpDirectory } from "@/features/help/help-directory";
import { parseHelpNavigation } from "@/features/help/navigation";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Aide KAY" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const identity = await requireIdentity("/help");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/help" />;
  const articles = articlesForRole(identity.profile.user.role);
  const categories = helpCategories.filter(category => articles.some(article => article.category === category.id));
  const navigation = parseHelpNavigation(await searchParams, categories.map(category => category.id));
  return <HelpDirectory key={`${navigation.topic}:${navigation.query}:${navigation.page}`} articles={articles} categories={categories} navigation={navigation} />;
}
