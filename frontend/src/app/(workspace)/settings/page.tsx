import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { adminAccess } from "@/features/users/access";

export default async function SettingsPage() {
  const access = await adminAccess("/settings");
  if (access.denied) return access.denied;
  return <><PageHeader title="Paramètres" description="Administration de l’équipe KAY." route="/settings" />
    <section className="surface grid max-w-reading gap-3"><h2 className="text-section font-semibold">Utilisateurs</h2><p>Gérez les comptes nominatifs, les rôles et la remise des accès temporaires.</p><Button action="contact" asChild className="justify-self-start"><Link href="/settings/users">Tous les utilisateurs</Link></Button></section>
    <section className="surface grid max-w-reading gap-3"><h2 className="text-section font-semibold">Horaires de travail</h2><p>Configurez les jours ouverts, les pauses déjeuner et la capacité avec véhicule de société après avoir prévisualisé les visites concernées.</p><Button action="visit" asChild className="justify-self-start" variant="outline"><Link href="/settings/working-hours">Configurer les horaires</Link></Button></section>
  </>;
}
