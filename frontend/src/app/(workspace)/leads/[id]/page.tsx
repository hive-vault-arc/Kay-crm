import { notFound } from "next/navigation";
import { z } from "zod";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { LeadRecord } from "@/features/contacts/lead-record";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Détail du Lead" };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string | string[]; task?: string | string[] }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const identity = await requireIdentity(`/leads/${id}`);
  if (identity.state !== "authenticated") return <AuthUnavailable path={`/leads/${id}`} />;
  const query = await searchParams;
  const task = z.uuid().safeParse(query.task);
  const tab = query.tab === "documents" ? "documents" : undefined;
  return <LeadRecord key={`${id}:${tab ?? ""}:${task.success ? task.data : ""}`} id={id} role={identity.profile.user.role} actorId={identity.profile.user.id} initialTab={tab} initialTask={task.success ? task.data : undefined} />;
}
