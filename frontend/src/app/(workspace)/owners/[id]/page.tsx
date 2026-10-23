import { notFound } from "next/navigation";
import { z } from "zod";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { OwnerRecord } from "@/features/owners/owner-record";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Fiche propriétaire" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const route = `/owners/${id}`;
  const identity = await requireIdentity(route);
  if (identity.state !== "authenticated") return <AuthUnavailable path={route} />;
  return <OwnerRecord id={id} />;
}
