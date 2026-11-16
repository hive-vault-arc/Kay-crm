import { SettingsWorkspace } from "@/features/users/settings-workspace";
import { SettingsOverview } from "@/features/users/settings-overview";
import { redirect } from "next/navigation";
import { staffAccess } from "@/features/users/access";

export default async function SettingsPage() {
  const access = await staffAccess("/settings");
  if (access.denied) return access.denied;
  if (access.manager) redirect("/settings/users");
  return <SettingsWorkspace active="overview" route="/settings"><SettingsOverview /></SettingsWorkspace>;
}
