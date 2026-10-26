"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarIcon, EmailIcon, PhoneIcon, MoreIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SectionHeading } from "./section-heading";
import { RecordHeader } from "./record-header";
import type { ContactSummary } from "@/features/contacts/contracts";

export function ContactAvatar({ name, size = "small" }: { name: string; size?: "small" | "large" | "medium" }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const suffix = parts.at(-1) ?? "";
  const initials = (/^\d{1,2}$/.test(suffix) ? `${Array.from(parts[0] ?? "")[0] ?? ""}${suffix}` : parts.slice(0, 2).map(part => Array.from(part)[0]).join("")).toLocaleUpperCase("fr-MA");
  return <span aria-hidden="true" data-size={size} className="crm-avatar">{initials || "?"}</span>;
}

export function CrmStatusBadge({ state, children, dot = true, kind }: { state: string; children: ReactNode; dot?: boolean; kind?: "enquiry" | "deal" }) {
  return <span className="crm-status-badge" data-crm-state={state} data-crm-kind={kind}>{dot ? <span className="crm-status-dot" aria-hidden="true" /> : null}{children}</span>;
}

export function CrmDirectoryHeader({ title, count, noun, description, route, actions }: { title: string; count?: number; noun: string; description: string; route: string; actions?: ReactNode }) {
  return <header className="kay-directory-header kay-page-header">
    <div className="kay-page-heading"><h1 tabIndex={-1} data-route={route}>{title}</h1><p aria-label={description}>{count === undefined ? "Chargement…" : `${count} ${count > 1 ? noun : noun.replace(/s$/, "")}`}</p></div>
    {actions ? <div className="kay-page-actions">{actions}</div> : null}
  </header>;
}

export function CrmDirectoryToolbar({ children, primary }: { children: ReactNode; primary: ReactNode }) {
  return <div className="kay-directory-tools">{primary}<Popover><PopoverTrigger asChild><Button variant="outline" size="icon" aria-label="Autres actions de la liste"><MoreIcon aria-hidden="true" size={20} /></Button></PopoverTrigger><PopoverContent align="end" className="kay-directory-utilities" aria-label="Actions de la liste">{children}</PopoverContent></Popover></div>;
}

export function CrmRecordHeader({ contact, title, route, badges, actions, backHref, reference, showContact = true }: { contact: ContactSummary; title: string; route: string; badges: ReactNode; actions?: ReactNode; backHref?: string; reference?: ReactNode; showContact?: boolean }) {
  return <RecordHeader title={title} route={route} badges={badges} actions={actions} backHref={backHref} reference={reference} kind={route.startsWith("/deals/") ? "deal" : "enquiry"} metadata={showContact ? <><a href={`tel:${contact.primary_phone}`}><PhoneIcon aria-hidden="true" size={16} />{contact.primary_phone}</a>{contact.primary_email ? <a href={`mailto:${contact.primary_email}`}><EmailIcon aria-hidden="true" size={16} />{contact.primary_email}</a> : null}</> : undefined} />;
}

export function CrmStatusBoard({ title, items, current, label, splitAt = 5 }: { title: string; items: { id: string; label: string }[]; current: string; label: string; splitAt?: number }) {
  const currentLabel = items.find(item => item.id === current)?.label;
  return <section className="crm-panel crm-status-board" data-columns={splitAt} aria-label={label}>
    <div className="crm-status-board-heading"><SectionHeading compact icon={CalendarIcon}>{title}</SectionHeading><p>Actuel : <strong>{currentLabel}</strong></p></div>
    <ol className="crm-status-tiles">{items.slice(0, splitAt).map(item => <li data-crm-state={item.id} key={item.id} aria-current={item.id === current ? "step" : undefined}><span className="crm-status-dot" aria-hidden="true" />{item.label}{item.id === current ? <span className="sr-only"> : statut actuel</span> : null}</li>)}</ol>
    {items.length > splitAt ? <><p className="crm-other-statuses">Autres statuts</p><ol className="crm-status-tiles">{items.slice(splitAt).map(item => <li data-crm-state={item.id} key={item.id} aria-current={item.id === current ? "step" : undefined}><span className="crm-status-dot" aria-hidden="true" />{item.label}{item.id === current ? <span className="sr-only"> : statut actuel</span> : null}</li>)}</ol></> : null}
  </section>;
}

export function CrmAgent({ name }: { name: string }) {
  return <span className="crm-agent"><ContactAvatar name={name} /><span title={name}>{name}</span></span>;
}

export function CrmContactCell({ contact, href, describedBy }: { contact: ContactSummary; href: string; describedBy: string }) {
  return <Link href={href} className="crm-contact-cell" aria-label={contact.name} aria-describedby={describedBy}><ContactAvatar name={contact.name} /><span><strong>{contact.name}</strong><span id={describedBy}>{contact.primary_phone}</span></span></Link>;
}
