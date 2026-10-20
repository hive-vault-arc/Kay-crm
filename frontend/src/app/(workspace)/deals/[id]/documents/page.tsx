import { notFound } from "next/navigation";
import { z } from "zod";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { DocumentWorkspace } from "@/features/generated/document-workspace";
import { requireIdentity } from "@/lib/auth/server";

export const metadata = { title: "Documents de l’affaire" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const path = `/deals/${id}/documents`;
  const identity = await requireIdentity(path);
  if (identity.state !== "authenticated") return <AuthUnavailable path={path} />;
  return <DocumentWorkspace parentKind="deal" id={id} />;
}
