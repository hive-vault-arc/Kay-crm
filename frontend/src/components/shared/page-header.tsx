import Image from "next/image";
import type { ReactNode } from "react";
import type { KayIconComponent } from "@/components/icons";

export function PageHeader({
  title,
  description,
  route,
  actions,
  icon: Icon,
}: {
  title: ReactNode;
  description: string;
  route: string;
  actions?: ReactNode;
  icon?: KayIconComponent;
}) {
  const dashboard = route === "/dashboard" && title === "Tableau de bord";
  return (
    <header className={dashboard ? "dashboard-heading min-w-0 overflow-hidden" : "flex min-w-0 flex-wrap items-center justify-between gap-x-5 gap-y-3"}>
      <div className={`grid min-w-0 flex-1 basis-64 gap-1 ${dashboard ? "dashboard-heading-copy" : ""}`}>
        {dashboard ? <p className="dashboard-heading-eyebrow">KAY REAL ESTATE</p> : null}
        <h1
          data-route={route}
          tabIndex={-1}
          className={dashboard ? "dashboard-heading-title wrap-anywhere font-medium" : Icon ? "flex min-w-0 items-center gap-3 wrap-anywhere text-page font-medium" : "wrap-anywhere text-page font-medium"}
        >
          {Icon ? <Icon aria-hidden="true" className="size-6 shrink-0 text-link" /> : null}
          {title}
        </h1>
        <p className={dashboard ? "dashboard-heading-description" : "max-w-reading text-sm text-muted-foreground"}>{description}</p>
      </div>
      {dashboard ? <div className="dashboard-heading-media"><Image src="/images/dashboard-city.png" alt="" fill sizes="100vw" className="dashboard-heading-image object-cover object-center" preload /></div> : null}
      {dashboard && actions ? <div className="dashboard-heading-actions">{actions}</div> : null}
      {!dashboard && actions ? <div className="flex min-w-0 max-w-full flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

