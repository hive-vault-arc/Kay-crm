import Image from "next/image";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  route,
  actions,
}: {
  title: ReactNode;
  description: string;
  route: string;
  actions?: ReactNode;
}) {
  return (
    <header className={route === "/dashboard" && title === "Tableau de bord" ? "relative isolate flex min-h-28 min-w-0 flex-wrap items-center justify-between gap-4 overflow-hidden bg-accent p-4 md:min-h-32 md:p-5" : "flex min-w-0 flex-wrap items-center justify-between gap-x-5 gap-y-3"}>
      {route === "/dashboard" && title === "Tableau de bord" ? <><Image src="/images/dashboard-city.png" alt="" fill sizes="(min-width: 1024px) 85vw, 100vw" className="-z-20 scale-105 object-cover object-center" preload /><div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-background via-background/95 to-background/15" /></> : null}
      <div className="grid min-w-0 flex-1 basis-64 gap-1"><h1
        data-route={route}
        tabIndex={-1}
        className="wrap-anywhere text-page font-bold"
      >
        {title}
      </h1>
      <p className="max-w-reading text-sm text-muted-foreground">
        {description}
      </p></div>
      {actions ? <div className="flex min-w-0 max-w-full flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

