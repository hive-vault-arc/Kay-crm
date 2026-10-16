import { z } from "zod";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { VisitRecord } from "@/features/schedule/visit-record";
import { requireIdentity } from "@/lib/auth/server";
export const metadata = { title: "Visite" };
export default async function Page({ params }: { params: Promise<{id:string}> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const identity = await requireIdentity(`/visits/${id}`);
  if (identity.state !== "authenticated") return <AuthUnavailable path={`/visits/${id}`} />;
  return <><PageHeader title="Visite" description="Rendez-vous, participants et historique conservé." route={`/visits/${id}`} /><VisitRecord key={id} id={id} actorId={identity.profile.user.id} /></>;
}
