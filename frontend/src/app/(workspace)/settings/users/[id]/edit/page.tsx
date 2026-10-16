import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/shared/page-header";
import { adminAccess } from "@/features/users/access";
import { UserEditor } from "@/features/users/user-editor";
export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const path = `/settings/users/${id}/edit`;
  const access = await adminAccess(path);
  if (access.denied) return access.denied;
  if (!z.uuid().safeParse(id).success) notFound();
  return <><PageHeader title="Modifier l’utilisateur" description="Gérez son identité, son rôle et son accès." route={path} /><UserEditor key={id} id={id} actorId={access.actorId} /></>;
}
