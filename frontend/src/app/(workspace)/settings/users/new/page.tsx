import { PageHeader } from "@/components/shared/page-header";
import { adminAccess } from "@/features/users/access";
import { UserForm } from "@/features/users/user-form";
export default async function NewUserPage() {
  const access = await adminAccess("/settings/users/new");
  if (access.denied) return access.denied;
  return <><PageHeader title="Créer un utilisateur" description="Créez un accès nominatif avec remise en personne." route="/settings/users/new" /><UserForm actorId={access.actorId} /></>;
}
