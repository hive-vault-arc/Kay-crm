import { notFound } from "next/navigation";
import { z } from "zod";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { OwnerRecord } from "@/features/owners/owner-record";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Fiche propriétaire" };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string | string[]; status?: string | string[] }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const route = `/owners/${id}`;
  const identity = await requireIdentity(route);
  if (identity.state !== "authenticated") return <AuthUnavailable path={route} />;
  const query = await searchParams;
  const tab = query.tab === "activity" ? "activity" : "overview", portfolio = query.status === "past" ? "past" : "current";
  return <OwnerRecord key={`${id}:${tab}:${portfolio}`} id={id} role={identity.profile.user.role} initialTab={tab} initialPortfolio={portfolio} />;
}
