import { PageHeader } from "@/components/shared/page-header";
import { adminAccess } from "@/features/users/access";
import { WorkingHours } from "@/features/schedule/working-hours";
export const metadata = { title: "Horaires de travail" };
export default async function Page() {
  const access = await adminAccess("/settings/working-hours");
  if (access.denied) return access.denied;
  return <><PageHeader title="Horaires de travail" description="Jours ouverts, pauses et capacité horaire avec véhicule de société." route="/settings/working-hours" /><WorkingHours /></>;
}
