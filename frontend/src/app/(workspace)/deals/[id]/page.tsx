import { z } from "zod";
import { notFound } from "next/navigation";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { DealRecord } from "@/features/deals/deal-record";
import { requireIdentity } from "@/lib/auth/server";
export const metadata = { title: "Affaire" };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ task?: string; tab?: string }> }) {
  const { id } = await params; if (!z.uuid().safeParse(id).success) notFound();
  const { task, tab } = await searchParams;
  const identity = await requireIdentity(`/deals/${id}`);
  if (identity.state !== "authenticated") return <AuthUnavailable path={`/deals/${id}`} />;
  return <DealRecord key={`${id}:${task ?? ""}:${tab ?? ""}`} id={id} role={identity.profile.user.role} actorId={identity.profile.user.id} initialTab={tab === "finance" ? tab : undefined} initialTask={z.uuid().safeParse(task).success ? task : undefined} />;
}
