import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/shared/page-header";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { PropertyRecord } from "@/features/inventory/property-record";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Fiche du bien" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const route = `/projects/properties/${id}`;
  const identity = await requireIdentity(route);
  if (identity.state !== "authenticated") return <AuthUnavailable path={route} />;
  return <><PageHeader title="Fiche du bien" description="Inventaire partagé ; les contacts propriétaires restent protégés séparément." route={route} /><PropertyRecord id={id} role={identity.profile.user.role} /></>;
}
