import { visitCreateContextSchema } from "@/features/schedule/contracts";
import { VisitRouteDrawer } from "@/features/schedule/visit-route-drawer";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { VisitCreate } from "@/features/schedule/visit-create";
import { requireIdentity } from "@/lib/auth/server";
export const metadata = { title: "Planifier une visite" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const identity = await requireIdentity("/visits/new");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/visits/new" />;
  const query = visitCreateContextSchema.safeParse(await searchParams);
  return query.success ? <VisitCreate key={[identity.profile.user.id, query.data.contact_id ?? "", query.data.date ?? ""].join("/")} actorId={identity.profile.user.id} contactId={query.data.contact_id} date={query.data.date} /> : <VisitRouteDrawer title="Planifier une visite" description="Nouveau rendez-vous"><p role="alert" className="text-danger">Contexte invalide. Revenez au calendrier pour choisir un contact accessible.</p></VisitRouteDrawer>;
}
