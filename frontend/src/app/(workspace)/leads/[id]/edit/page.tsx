import { notFound } from "next/navigation";
import { z } from "zod";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { LeadRecord } from "@/features/contacts/lead-record";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Modifier le prospect" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const identity = await requireIdentity(`/leads/${id}/edit`);
  if (identity.state !== "authenticated") return <AuthUnavailable path={`/leads/${id}/edit`} />;
  return <LeadRecord key={id} id={id} edit />;
}
