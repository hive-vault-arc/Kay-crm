import { ExportsPanel } from "@/features/discovery/exports-panel";
import { PageHeader } from "@/components/shared/page-header";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { LeadList } from "@/features/contacts/lead-list";
import { ContactDirectory } from "@/features/contacts/contact-directory";
import { requireIdentity } from "@/lib/auth/server";
import { ImportPanel } from "@/features/imports/import-panel";
import { z } from "zod";

export const metadata = { title: "Prospects" };
export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; batch?: string }> }) {
  const identity = await requireIdentity("/leads");
  if (identity.state !== "authenticated") return <AuthUnavailable path="/leads" />;
  const params = await searchParams;
  if (params.view === "exports") return <><PageHeader title="Mes exports" description="État et téléchargement contrôlé des CSV demandés." route="/leads" /><ExportsPanel role={identity.profile.user.role} /></>;
  if (params.view === "import") return <><PageHeader title="Importer des contacts" description="Vérifier les lignes et leurs agents avant une création atomique." route="/leads" /><ImportPanel role={identity.profile.user.role} batchId={z.uuid().safeParse(params.batch).success ? params.batch : undefined} /></>;
  const contacts = params.view === "contacts";
  return contacts ? <ContactDirectory role={identity.profile.user.role} /> : <LeadList role={identity.profile.user.role} actorId={identity.profile.user.id} />;
}
