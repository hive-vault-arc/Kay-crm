import { SettingsWorkspace } from "@/features/users/settings-workspace";
import { adminAccess } from "@/features/users/access";
import { WorkingHours } from "@/features/schedule/working-hours";
export const metadata = { title: "Horaires de travail" };
export default async function Page() {
  const access = await adminAccess("/settings/working-hours");
  if (access.denied) return access.denied;
  return <SettingsWorkspace active="hours" route="/settings/working-hours"><header className="kay-settings-content-head"><div><h2>Horaires de travail</h2><p>Jours ouverts, pauses et capacité horaire avec véhicule de société.</p></div></header><WorkingHours key={access.actorId} actorId={access.actorId} /></SettingsWorkspace>;
}
