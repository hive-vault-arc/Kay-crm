import { AuditPanel } from "@/features/discovery/audit-panel";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { requireIdentity } from "@/lib/auth/server";
import { AuthUnavailable } from "@/features/auth/auth-frame";
import { WorkDashboard } from "@/features/work/work-dashboard";

type Props = { params: Promise<{ section: string }>; searchParams: Promise<{ view?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  return { title: section === "dashboard" ? "Tableau de bord" : "Page introuvable" };
}

export default async function WorkspacePage({ params, searchParams }: Props) {
  const { section } = await params;
  const identity = await requireIdentity(`/${section}`);
  if (identity.state !== "authenticated") return <AuthUnavailable path={`/${section}`} />;
  if (section === "settings" && identity.profile.user.role !== "administrator") return <>
    <PageHeader title="Accès non autorisé" description="Les paramètres sont réservés aux administrateurs." route="/settings" />
  </>;
  if (section !== "dashboard") notFound();
  if ((await searchParams).view === "audit") return <>
    <PageHeader title="Journal d’audit" description="Historique des actions autorisées de l’équipe." route="/dashboard" />
    {identity.profile.user.role === "agent" ? <p role="alert">Accès non autorisé : le journal est réservé aux responsables et administrateurs.</p> : <AuditPanel />}
  </>;
  return <>
    <PageHeader title="Tableau de bord" description={identity.profile.user.role === "agent" ? "Le travail affiché concerne uniquement vos dossiers attribués ou partagés." : "Le travail affiché respecte vos droits sur les dossiers de l’équipe."} route="/dashboard" />
    <WorkDashboard />
  </>;
}
