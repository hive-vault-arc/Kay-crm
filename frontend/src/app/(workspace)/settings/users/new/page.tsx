import { adminAccess } from "@/features/users/access";
import { UserForm } from "@/features/users/user-form";
export default async function NewUserPage() {
  const access = await adminAccess("/settings/users/new");
  if (access.denied) return access.denied;
  return <UserForm actorId={access.actorId} />;
}
