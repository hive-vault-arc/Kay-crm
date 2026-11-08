import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function RecordHeader({ title, route, reference, badges, metadata, actions, backHref, kind }: {
  title: string; route: string; reference?: ReactNode; badges?: ReactNode; metadata?: ReactNode; actions?: ReactNode; backHref?: string; kind?: "enquiry" | "deal" | "inventory";
}) {
  return <header className="kay-record-heading" data-crm-kind={kind}>
    {backHref ? <Button action="back" asChild size="icon" variant="outline"><Link href={backHref} aria-label="Retour à la liste"><span className="sr-only">Retour</span></Link></Button> : null}
    <div className="kay-record-heading-copy"><h1 tabIndex={-1} data-route={route}>{title}</h1><div className="kay-record-meta">{reference ? <span>{reference}</span> : null}{badges}{metadata}</div></div>
    {actions ? <div className="kay-record-heading-actions">{actions}</div> : null}
  </header>;
}
