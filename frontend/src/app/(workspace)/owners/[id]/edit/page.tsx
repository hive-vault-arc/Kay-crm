import { notFound } from "next/navigation";
import { z } from "zod";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { OwnerForm } from "@/features/owners/owner-form";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Modifier le propriétaire" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const route = `/owners/${id}/edit`;
  const identity = await requireIdentity(route);
  if (identity.state !== "authenticated") return <AuthUnavailable path={route} />;
  return <OwnerForm id={id} role={identity.profile.user.role} />;
}
