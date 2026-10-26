"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { CalendarIcon, ContactsIcon, ForwardIcon, SettingsIcon } from "@/components/icons";
import { PageHeader } from "@/components/shared/page-header";

const sections = [
  { key: "overview", href: "/settings", label: "Vue d’ensemble", detail: "L’agence en bref", Icon: SettingsIcon },
  { key: "users", href: "/settings/users", label: "Utilisateurs", detail: "Comptes et accès", Icon: ContactsIcon },
  { key: "hours", href: "/settings/working-hours", label: "Horaires de travail", detail: "Organisation des visites", Icon: CalendarIcon },
] as const;

export function SettingsWorkspace({ active, route, title = "Paramètres", description = "Administration de l’agence", children }: {
  active: typeof sections[number]["key"]; route: string; title?: string; description?: string; children: ReactNode;
}) {
  const navigation = useRef<HTMLElement>(null), current = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const nav = navigation.current, item = current.current;
    if (!nav || !item) return;
    function reveal() {
      if (!nav || !item || nav.scrollWidth <= nav.clientWidth) return;
      const bounds = nav.getBoundingClientRect(), selected = item.getBoundingClientRect();
      nav.scrollLeft += selected.left - bounds.left - (nav.clientWidth - selected.width) / 2;
    }
    const observer = new ResizeObserver(reveal);
    observer.observe(nav); observer.observe(item); reveal();
    return () => observer.disconnect();
  }, [active]);
  return <><PageHeader title={title} description={description} route={route} /><div className="kay-settings-layout">
    <aside className="kay-settings-navigation"><nav ref={navigation} className="kay-surface kay-settings-nav" aria-label="Sections des paramètres"><p>Administration</p>{sections.map(({ key, href, label, detail, Icon }) => <Link key={key} ref={active === key ? current : undefined} href={href} aria-current={active === key ? "page" : undefined} className="kay-settings-nav-link"><Icon size={20} aria-hidden="true" /><span><strong>{label}</strong><small>{detail}</small></span><ForwardIcon size={16} aria-hidden="true" /></Link>)}</nav><div className="kay-settings-access-note"><SettingsIcon size={16} aria-hidden="true" /><p>La gestion des accès et des horaires est réservée aux administrateurs.</p></div></aside>
    <div className="kay-settings-content">{children}</div>
  </div></>;
}
