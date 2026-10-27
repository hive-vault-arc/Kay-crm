import type { ReactNode } from "react";
import type { KayIconComponent } from "@/components/icons";

export function PageHeader({
  title,
  description,
  route,
  actions,
  navigation,
  icon: Icon,
}: {
  title: ReactNode;
  description: string;
  route: string;
  actions?: ReactNode;
  navigation?: ReactNode;
  icon?: KayIconComponent;
}) {
  return (
    <header className="kay-page-header">
      <div className="kay-page-heading">
        <h1
          data-route={route}
          tabIndex={-1}
          className="flex min-w-0 items-center gap-3 wrap-anywhere"
        >
          {Icon ? <Icon aria-hidden="true" className="size-6 shrink-0 text-link" /> : null}
          {title}
        </h1>
        {description ? <p>{description}</p> : null}
      </div>
      {navigation ? <div className="kay-page-navigation">{navigation}</div> : null}
      {actions ? <div className="kay-page-actions">{actions}</div> : null}
    </header>
  );
}

