import { SettingsWorkspace } from "@/features/users/settings-workspace";
import { adminAccess } from "@/features/users/access";
import { HolidaySettings } from "@/features/work/holiday-settings";

export default async function Page() {
  const access = await adminAccess("/settings/holidays");
  if (access.denied) return access.denied;
  return <SettingsWorkspace active="holidays" route="/settings/holidays">
    <HolidaySettings key={access.actorId} actorId={access.actorId} />
  </SettingsWorkspace>;
}
