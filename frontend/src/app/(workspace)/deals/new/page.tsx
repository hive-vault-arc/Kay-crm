import { PageHeader } from "@/components/shared/page-header";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { DealCreate } from "@/features/deals/deal-create";
import { contextSchema } from "@/features/deals/contracts";
import { requireIdentity } from "@/lib/auth/server";
export const metadata = { title: "Nouvelle affaire" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const identity = await requireIdentity("/deals/new");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/deals/new" />;
  const context = contextSchema.safeParse(await searchParams);
  return context.success ? <DealCreate context={context.data} role={identity.profile.user.role} actorId={identity.profile.user.id} /> : <><PageHeader title="Nouvelle affaire" description="Contact et dossier" route="/deals/new" /><p role="alert" className="text-danger">Contexte invalide. Revenez aux affaires et choisissez un contact accessible.</p></>;
}
