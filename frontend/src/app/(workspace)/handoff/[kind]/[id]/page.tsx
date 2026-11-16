import { notFound } from "next/navigation";
import { z } from "zod";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { coverageKind } from "@/features/handoff/contracts";
import { CoverageRecord } from "@/features/handoff/coverage-record";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Dossier en lecture seule", referrer: "no-referrer" } as const;

export default async function Page({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind: rawKind, id } = await params;
  const kind = coverageKind.safeParse(rawKind);
  if (!kind.success || !z.uuid().safeParse(id).success) notFound();
  const path = `/handoff/${kind.data}/${id}`;
  const identity = await requireIdentity(path);
  if (identity.state !== "authenticated") return <AuthUnavailable path={path} />;
  return <CoverageRecord kind={kind.data} id={id} />;
}
