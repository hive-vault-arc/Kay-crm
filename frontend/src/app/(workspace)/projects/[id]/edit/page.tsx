import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/shared/page-header";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { DevelopmentRecord } from "@/features/inventory/development-record";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Modifier le programme" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const route = `/projects/${id}/edit`;
  const identity = await requireIdentity(route);
  if (identity.state !== "authenticated") return <AuthUnavailable path={route} />;
  return <><PageHeader title="Modifier le programme" description="Faits et présentation partagés ; identités privées sous droits Contacts." route={route} /><DevelopmentRecord key={`${id}:${identity.profile.user.id}:${identity.profile.user.role}`} actorId={identity.profile.user.id} id={id} role={identity.profile.user.role} edit /></>;
}
