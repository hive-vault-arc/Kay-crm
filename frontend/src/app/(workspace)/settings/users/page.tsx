import { adminAccess } from "@/features/users/access";
import { UserList } from "@/features/users/user-list";
export default async function UsersPage() {
  const access = await adminAccess("/settings/users");
  if (access.denied) return access.denied;
  return <UserList />;
}
