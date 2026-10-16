import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { VisitCalendar } from "@/features/schedule/visit-calendar";
import { requireIdentity } from "@/lib/auth/server";
export const metadata = { title: "Calendrier des visites" };
export default async function Page() {
  const identity = await requireIdentity("/visits");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/visits" />;
  return <><PageHeader title="Calendrier des visites" description="Planifier, confirmer et suivre les visites de votre périmètre." route="/visits" actions={<Button action="create" asChild><Link href="/visits/new">Planifier une visite</Link></Button>} /><VisitCalendar actorId={identity.profile.user.id} /></>;
}
