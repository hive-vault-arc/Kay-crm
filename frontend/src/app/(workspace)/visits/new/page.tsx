import { z } from "zod";
import { PageHeader } from "@/components/shared/page-header";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { VisitCreate } from "@/features/schedule/visit-create";
import { requireIdentity } from "@/lib/auth/server";
export const metadata = { title: "Planifier une visite" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const identity = await requireIdentity("/visits/new");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/visits/new" />;
  const query = z.object({ contact_id: z.uuid().optional() }).strict().safeParse(await searchParams);
  return <><PageHeader title="Planifier une visite" description="Trois types de visite, avec vérification des horaires et des participants." route="/visits/new" />{query.success ? <VisitCreate actorId={identity.profile.user.id} contactId={query.data.contact_id} /> : <p role="alert" className="text-danger">Contexte invalide. Revenez au calendrier pour choisir un contact accessible.</p>}</>;
}
