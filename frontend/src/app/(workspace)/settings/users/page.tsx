import { staffAccess } from "@/features/users/access";
import { UserList } from "@/features/users/user-list";
export default async function UsersPage() {
  const access = await staffAccess("/settings/users");
  if (access.denied) return access.denied;
  return <UserList agentAccountsOnly={access.manager} />;
}
