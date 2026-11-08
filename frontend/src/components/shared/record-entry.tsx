import type { ReactNode } from "react";
import type { KayIconComponent } from "@/components/icons";

export function RecordEntry({ title, icon: Icon, status, meta = [], children, actions, related, variant = "card" }: {
  title: ReactNode; icon?: KayIconComponent; status?: ReactNode; meta?: { label: string; value: ReactNode; icon?: KayIconComponent }[]; children?: ReactNode; actions?: ReactNode; related?: ReactNode; variant?: "card" | "related";
}) {
  return <article className={variant === "related" ? "kay-record-entry kay-related-entry" : "kay-record-entry"}><header>{Icon ? <span className="kay-entry-symbol"><Icon size={20} aria-hidden="true" /></span> : null}<h3>{title}</h3>{status ? <div className="kay-entry-status">{status}</div> : null}</header>
    {meta.length ? <dl className="kay-entry-meta">{meta.map(({ label, value, icon: MetaIcon }) => <div key={label}><dt>{MetaIcon ? <MetaIcon size={12} aria-hidden="true" /> : null}{label}</dt><dd>{value}</dd></div>)}</dl> : null}
    {children ? <div className="kay-entry-body">{children}</div> : null}{actions ? <footer>{actions}</footer> : null}
    {related ? <div className="grid min-w-0 gap-3 border-t pt-4">{related}</div> : null}
  </article>;
}
