import { notFound } from "next/navigation";
import { z } from "zod";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { ContactRecord } from "@/features/contacts/contact-record";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Fiche contact" };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ task?: string }> }) {
  const { id } = await params;
  const { task } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const identity = await requireIdentity(`/contacts/${id}`);
  if (identity.state !== "authenticated") return <AuthUnavailable path={`/contacts/${id}`} />;
  return <ContactRecord key={`${id}:${task ?? ""}`} id={id} role={identity.profile.user.role} initialTask={z.uuid().safeParse(task).success ? task : undefined} />;
}
