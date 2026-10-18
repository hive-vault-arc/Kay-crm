import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarIcon, EmailIcon, PhoneIcon } from "@/components/icons";
import { SectionHeading } from "./section-heading";
import type { ContactSummary } from "@/features/contacts/contracts";

export function ContactAvatar({ name, size = "small" }: { name: string; size?: "small" | "large" | "medium" }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const suffix = parts.at(-1) ?? "";
  const initials = (/^\d{1,2}$/.test(suffix) ? `${Array.from(parts[0] ?? "")[0] ?? ""}${suffix}` : parts.slice(0, 2).map(part => Array.from(part)[0]).join("")).toLocaleUpperCase("fr-MA");
  return <span aria-hidden="true" data-size={size} className="crm-avatar">{initials || "?"}</span>;
}

export function CrmStatusBadge({ state, children, dot = true }: { state: string; children: ReactNode; dot?: boolean }) {
  return <span className="crm-status-badge" data-crm-state={state}>{dot ? <span className="crm-status-dot" aria-hidden="true" /> : null}{children}</span>;
}

export function CrmDirectoryHeader({ title, count, noun, description, route }: { title: string; count?: number; noun: string; description: string; route: string }) {
  return <header className="crm-directory-hero">
    <Image src="/images/crm-coast.png" alt="" fill sizes="(min-width: 1024px) 85vw, 100vw" className="crm-directory-hero-image" preload />
    <div className="crm-directory-hero-copy"><h1 tabIndex={-1} data-route={route}>{title}</h1><p className="crm-directory-count">{count === undefined ? "Chargement…" : `${count} ${count > 1 ? noun : noun.replace(/s$/, "")}`}</p><p>{description}</p></div>
  </header>;
}

export function CrmDirectoryToolbar({ children, primary }: { children: ReactNode; primary: ReactNode }) {
  return <div className="crm-directory-toolbar"><div role="group" aria-label="Actions secondaires" className="crm-directory-tools">{children}</div>{primary}</div>;
}

export function CrmRecordHeader({ contact, title, route, badges, actions }: { contact: ContactSummary; title: string; route: string; badges: ReactNode; actions?: ReactNode }) {
  return <header className="crm-record-heading">
    <ContactAvatar name={contact.name} size="large" />
    <div className="crm-record-heading-copy"><div className="crm-record-title-row"><h1 tabIndex={-1} data-route={route}>{title}</h1><div className="crm-record-heading-badges">{badges}</div></div>
      <div className="crm-record-contact-line"><a href={`tel:${contact.primary_phone}`}><PhoneIcon aria-hidden="true" />{contact.primary_phone}</a>{contact.primary_email ? <a href={`mailto:${contact.primary_email}`}><EmailIcon aria-hidden="true" />{contact.primary_email}</a> : <span><EmailIcon aria-hidden="true" />E-mail non renseigné</span>}</div>
    </div>
    {actions ? <div className="crm-record-heading-actions">{actions}</div> : null}
  </header>;
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
