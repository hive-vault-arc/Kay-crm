import { z } from "zod";
import { notFound } from "next/navigation";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { DealRecord } from "@/features/deals/deal-record";
import { requireIdentity } from "@/lib/auth/server";
export const metadata = { title: "Affaire" };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ task?: string | string[]; tab?: string | string[] }> }) {
  const { id } = await params; if (!z.uuid().safeParse(id).success) notFound();
  const identity = await requireIdentity(`/deals/${id}`);
  if (identity.state !== "authenticated") return <AuthUnavailable path={`/deals/${id}`} />;
  const query = await searchParams;
  const task = z.uuid().safeParse(query.task);
  const tab = typeof query.tab === "string" && ["overview", "projects", "activity", "documents", "finance"].includes(query.tab) ? query.tab : undefined;
  return <DealRecord key={`${id}:${task.success ? task.data : ""}:${tab ?? ""}`} id={id} role={identity.profile.user.role} actorId={identity.profile.user.id} initialTab={tab} initialTask={task.success ? task.data : undefined} />;
}
