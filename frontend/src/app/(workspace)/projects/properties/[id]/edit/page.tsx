import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/shared/page-header";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { PropertyRecord } from "@/features/inventory/property-record";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Modifier le bien" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const route = `/projects/properties/${id}/edit`;
  const identity = await requireIdentity(route);
  if (identity.state !== "authenticated") return <AuthUnavailable path={route} />;
  return <><PageHeader title="Modifier le bien" description="Les informations commerciales sont partagées avec toute l’équipe." route={route} /><PropertyRecord id={id} edit role={identity.profile.user.role} /></>;
}
