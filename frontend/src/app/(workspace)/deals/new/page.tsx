import { PageHeader } from "@/components/shared/page-header";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { DealCreate } from "@/features/deals/deal-create";
import { contextSchema } from "@/features/deals/contracts";
import { requireIdentity } from "@/lib/auth/server";
export const metadata = { title: "Créer une affaire" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const identity = await requireIdentity("/deals/new");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/deals/new" />;
  const context = contextSchema.safeParse(await searchParams);
  return <><PageHeader title="Créer une affaire" description="Une affaire indépendante, pour un contact accessible. La demande d’origine reste intacte." route="/deals/new" />{context.success ? <DealCreate context={context.data} /> : <p role="alert" className="text-danger">Contexte invalide. Revenez aux affaires et choisissez un contact accessible.</p>}</>;
}
