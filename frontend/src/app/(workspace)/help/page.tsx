import { AlertIcon } from "@/components/icons";
import { PageHeader } from "@/components/shared/page-header";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { articlesForRole, helpCategories } from "@/features/help/catalog";
import { HelpDirectory } from "@/features/help/help-directory";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Aide KAY" };
export default async function Page() {
  const identity = await requireIdentity("/help");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/help" />;
  const articles = articlesForRole(identity.profile.user.role);
  return <><PageHeader title="Aide KAY" description="Les étapes, les repères et les réponses pour utiliser votre CRM au quotidien." route="/help" icon={AlertIcon} /><HelpDirectory articles={articles} categories={helpCategories.filter(category => articles.some(article => article.category === category.id))} /></>;
}
