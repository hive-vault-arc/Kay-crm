import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/shared/page-header";
import { EnquiryIcon } from "@/components/icons";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { LeadRecord } from "@/features/contacts/lead-record";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Modifier le Lead" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const identity = await requireIdentity(`/leads/${id}/edit`);
  if (identity.state !== "authenticated") return <AuthUnavailable path={`/leads/${id}/edit`} />;
  return <><PageHeader icon={EnquiryIcon} title="Modifier le Lead" description="Enregistrer ensemble les coordonnées du client et la qualification du prospect." route={`/leads/${id}/edit`} /><LeadRecord key={id} id={id} edit /></>;
}
