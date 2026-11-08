import type { ReactNode } from "react";
import { DataState } from "@/components/shared/data-state";
import { Brand } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";
import { ThemeControl } from "@/features/shell/theme-control";

export function AuthFrame({ title, description, children, variant = "default" }: { title: string; description: string; children: ReactNode; variant?: "default" | "login" }) {
  return <main className="kay-auth" data-auth-variant={variant}>
    <div className="fixed right-5 top-5 z-10"><ThemeControl /></div>
    <section className="kay-auth-card kay-surface" aria-labelledby="login-title">
      <Brand appearance="transparent" />
      <header className="kay-auth-header"><h1 id="login-title">{title}</h1><p>{description}</p></header>
      {children}
      <footer>Accès réservé à l’équipe KAY.</footer>
    </section>
  </main>;
}
export function AuthUnavailable({ path = "/login" }: { path?: string }) {
  return <DataState state="error" title="Connexion au service indisponible" description="Votre accès n’a pas pu être vérifié. Aucune donnée privée n’est affichée." action={<Button action="retry" variant="outline" asChild><a href={path}>Réessayer</a></Button>} />;
}
