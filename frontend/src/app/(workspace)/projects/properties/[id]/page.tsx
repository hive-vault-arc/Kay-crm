import { notFound } from "next/navigation";
import { z } from "zod";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { PropertyRecord } from "@/features/inventory/property-record";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Fiche du bien" };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const route = `/projects/properties/${id}`;
  const identity = await requireIdentity(route);
  if (identity.state !== "authenticated") return <AuthUnavailable path={route} />;
  return <PropertyRecord id={id} role={identity.profile.user.role} initialTab={tab} />;
}
