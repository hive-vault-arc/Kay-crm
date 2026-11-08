import { z } from "zod";
import { notFound } from "next/navigation";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { VisitRecord } from "@/features/schedule/visit-record";
import { requireIdentity } from "@/lib/auth/server";
export const metadata = { title: "Visite" };
export default async function Page({ params }: { params: Promise<{id:string}> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const identity = await requireIdentity(`/visits/${id}`);
  if (identity.state !== "authenticated") return <AuthUnavailable path={`/visits/${id}`} />;
  return <VisitRecord key={id} id={id} actorId={identity.profile.user.id} />;
}
