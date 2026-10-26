import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { VisitCalendar } from "@/features/schedule/visit-calendar";
import { getIdentity } from "@/lib/auth/server";

// This layout survives visit/create route changes, preserving the real calendar.
// Each page still owns its exact protected destination and validation boundary.
export default async function VisitsLayout({ children }: { children: ReactNode }) {
  const identity = await getIdentity();
  if (identity.state !== "authenticated" || identity.profile.must_change_password) return children;
  return <>
    <PageHeader title="Calendrier des visites" description="Planifiez, confirmez et suivez les visites de votre périmètre." route="/visits" actions={<Button action="create" asChild><Link href="/visits/new">Planifier une visite</Link></Button>} />
    <VisitCalendar actorId={identity.profile.user.id} administrator={identity.profile.user.role === "administrator"} />
    {children}
  </>;
}
