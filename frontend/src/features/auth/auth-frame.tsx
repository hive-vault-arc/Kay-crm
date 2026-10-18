import type { ReactNode } from "react";
import { DataState } from "@/components/shared/data-state";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Brand } from "@/components/shared/brand";
import { ContactsIcon, DevelopmentIcon, EmailIcon, PasswordIcon } from "@/components/icons";

type AuthFrameProps = { title: string; description: string; children: ReactNode; variant?: "default" | "login" };

export function AuthFrame({ title, description, children, variant = "default" }: AuthFrameProps) {
  if (variant === "login") return <LoginAuthFrame title={title} description={description}>{children}</LoginAuthFrame>;

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
      <p className="flex items-start gap-2 text-xs text-muted-foreground"><ContactsIcon size={16} className="shrink-0" /><span>Espace réservé à l’équipe KAY Real Estate.</span></p>
    </div>
  </main>;
}

function LoginAuthFrame({ title, description, children }: Omit<AuthFrameProps, "variant">) {
  return <main className="flex min-h-dvh flex-col gap-2 bg-background px-2 py-2 sm:px-3">
    <div className="grid w-full flex-1 overflow-hidden rounded-lg border bg-card shadow-sm md:min-h-[40rem] md:grid-cols-[0.78fr_1.22fr] xl:grid-cols-[0.74fr_1.1fr_1.28fr]">
      <aside aria-label="KAY Real Estate" className="flex min-w-0 flex-col overflow-hidden bg-foreground p-6 text-background sm:p-8 xl:px-16 xl:pt-8 xl:pb-8">
        <Brand className="relative z-10 aspect-[103/68] w-36 sm:w-40" appearance="transparent" />
        <div className="mt-7 grid gap-6 sm:mt-8 xl:mt-4 xl:gap-6">
          <span aria-hidden="true" className="h-px w-12 bg-creation" />
          <h2 className="font-serif text-2xl leading-tight sm:text-4xl sm:leading-[1.1]">
            <span className="block">Vos relations.</span>
            <span className="block">Vos projets.</span>
            <span className="block text-creation">Votre réussite.</span>
          </h2>
          <p className="max-w-[24rem] text-base leading-6 text-background/75">
            Un espace pour vos prospects, vos affaires et votre équipe.
          </p>
        </div>
        <div className="-mx-6 -mb-6 mt-6 sm:-mx-8 sm:-mb-8 md:mt-auto xl:-mx-16 xl:-mb-8">
          <Image
            src="/images/login-architecture.svg"
            width={640}
            height={510}
            alt=""
            sizes="(min-width: 80rem) 24vw, 100vw"
            loading="eager"
            className="block h-auto max-h-40 w-full scale-105 origin-bottom object-contain object-bottom opacity-75"
          />
        </div>
      </aside>

      <section aria-labelledby="login-title" className="flex min-w-0 flex-col bg-background px-6 py-8 sm:px-10 md:px-10 lg:px-12 xl:px-14">
        <div className="mx-auto my-auto grid w-full max-w-md gap-6 py-2">
          <header className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-link">Espace équipe</p>
            <h1 id="login-title" className="text-page font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </header>
          {children}
        </div>
        <p className="mt-8 flex items-start gap-2 border-t pt-5 text-sm text-muted-foreground">
          <ContactsIcon size={20} className="mt-0.5 shrink-0" />
          <span>Espace réservé à l’équipe KAY Real Estate.</span>
        </p>
      </section>

      <div aria-hidden="true" className="relative hidden min-h-80 border-l-2 border-creation xl:block">
        <Image src="/images/login-villa.png" fill alt="" sizes="(min-width: 80rem) 40vw, 0px" className="object-cover object-right" loading="eager" />
      </div>
    </div>

    <footer className="w-full shrink-0 overflow-hidden rounded-lg border bg-card">
      <div className="flex min-h-20 items-center gap-4 border-b-4 border-creation bg-foreground px-4 py-4 text-background sm:px-6">
        <span aria-hidden="true" className="h-10 w-px shrink-0 bg-background/40 sm:h-12" />
        <PasswordIcon size={32} className="shrink-0 text-creation" aria-hidden="true" />
        <p className="text-lg font-semibold sm:text-xl">Espace de travail sécurisé</p>
      </div>
      <div className="grid gap-4 px-4 py-4 sm:px-6 md:grid-cols-3 md:gap-6">
        <section className="flex items-start gap-3">
          <PasswordIcon size={20} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="grid gap-1">
            <h2 className="text-sm font-semibold">Accès réservé à l’équipe</h2>
            <p className="text-sm text-muted-foreground">Votre connexion utilise HTTPS.</p>
          </div>
        </section>
        <section className="flex items-start gap-3">
          <EmailIcon size={20} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="grid gap-1">
            <h2 className="text-sm font-semibold">Besoin d’aide ?</h2>
            <p className="text-sm text-muted-foreground">Écrivez-nous à <a className="font-medium text-link underline-offset-4 hover:underline" href="mailto:contact@hivevaultarc.com">contact@hivevaultarc.com</a></p>
          </div>
        </section>
        <section className="flex items-start gap-3">
          <DevelopmentIcon size={20} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="grid gap-1">
            <h2 className="text-sm font-semibold">KAY Real Estate</h2>
            <p className="text-sm text-muted-foreground">Espace CRM immobilier.</p>
          </div>
        </section>
      </div>
      <p className="bg-foreground px-4 py-3 text-sm text-background/75 sm:px-6">© 2026 KAY Real Estate</p>
    </footer>
  </main>;
}

export function AuthUnavailable({ path = "/login" }: { path?: string }) {
  return <DataState state="error" title="Connexion au service indisponible"
    description="Votre accès n’a pas pu être vérifié. Aucune donnée privée n’est affichée."
    action={<Button action="retry" variant="outline" asChild><a href={path}>Réessayer</a></Button>} />;
}
