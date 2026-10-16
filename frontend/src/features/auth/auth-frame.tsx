import type { ReactNode } from "react";
import { DataState } from "@/components/shared/data-state";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Brand } from "@/components/shared/brand";

export function AuthFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className="relative isolate grid min-h-dvh content-start overflow-hidden bg-background px-4 py-8 sm:px-10 lg:px-[7.1vw] lg:pt-10">
    <Image src="/images/login-villa.png" fill alt="" sizes="100vw" className="-z-20 object-cover object-right" preload />
    <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-background via-background/90 to-background/20" />
    <div className="grid w-full max-w-2xl gap-5">
      <Brand className="w-36" appearance="transparent" />
      <section className="grid gap-6 rounded-lg border bg-card p-6 sm:p-10">
      <div className="grid gap-3"><h1 className="text-page font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p></div>
      {children}
      </section>
      <p className="text-xs text-muted-foreground">Espace réservé à l’équipe KAY Real Estate.</p>
    </div>
  </main>;
}

export function AuthUnavailable({ path = "/login" }: { path?: string }) {
  return <DataState state="error" title="Connexion au service indisponible"
    description="Votre accès n’a pas pu être vérifié. Aucune donnée privée n’est affichée."
    action={<Button variant="outline" asChild><a href={path}>Réessayer</a></Button>} />;
}
