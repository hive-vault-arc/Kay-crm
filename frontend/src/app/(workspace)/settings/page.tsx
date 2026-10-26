import { SettingsWorkspace } from "@/features/users/settings-workspace";
import { SettingsOverview } from "@/features/users/settings-overview";
import { adminAccess } from "@/features/users/access";

export default async function SettingsPage() {
  const access = await adminAccess("/settings");
  if (access.denied) return access.denied;
  return <SettingsWorkspace active="overview" route="/settings"><SettingsOverview /></SettingsWorkspace>;
}
