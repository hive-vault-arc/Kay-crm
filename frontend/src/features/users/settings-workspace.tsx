"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { ClockIcon, ContactsIcon, ForwardIcon, PasswordIcon, SettingsIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PageHeader } from "@/components/shared/page-header";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";

const sections = [
  { key: "overview", href: "/settings", label: "Vue d’ensemble", detail: "L’agence en bref", Icon: SettingsIcon },
  { key: "users", href: "/settings/users", label: "Utilisateurs", detail: "Comptes et accès", Icon: ContactsIcon },
  { key: "hours", href: "/settings/working-hours", label: "Horaires de travail", detail: "Organisation des visites", Icon: ClockIcon },
] as const;

export function SettingsWorkspace({ active, route, title = "Paramètres", description = "Administration de l’agence", children, actions, backToUsers = false }: {
  active: typeof sections[number]["key"]; route: string; title?: string; description?: string; children: ReactNode; actions?: ReactNode; backToUsers?: boolean;
}) {
  const navigation = useRef<HTMLElement>(null), current = useRef<HTMLAnchorElement>(null);
  const picker = useId(), router = useRouter();
  const guard = useUnsavedGuard();
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
  return <div className="kay-settings-page">{guard.dialog}{backToUsers ? <Button action="back" asChild variant="ghost" className="w-fit"><Link href="/settings/users">Utilisateurs</Link></Button> : null}<PageHeader title={title} description={description} route={route} actions={actions} /><div className="kay-settings-layout">
    <aside className="kay-settings-navigation"><nav ref={navigation} className="kay-surface kay-settings-nav" aria-label="Sections des paramètres"><p>Administration</p>{sections.map(({ key, href, label, detail, Icon }) => <Link key={key} ref={active === key ? current : undefined} href={href} aria-current={active === key ? "page" : undefined} aria-label={label} className="kay-settings-nav-link"><Icon size={20} aria-hidden="true" /><span><strong>{label}</strong><small>{detail}</small></span><ForwardIcon size={16} aria-hidden="true" /></Link>)}</nav>
      <div className="kay-settings-picker"><Label htmlFor={picker}>Section</Label><NativeSelect id={picker} value={active} onChange={event => {
        const section = sections.find(item => item.key === event.target.value);
        if (section && section.key !== active) guard.request(() => router.push(section.href));
      }}>{sections.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}</NativeSelect></div>
      <div className="kay-settings-access-note"><PasswordIcon size={16} aria-hidden="true" /><p>La gestion des accès et des horaires est réservée aux administrateurs.</p></div></aside>
    <div className="kay-settings-content">{children}</div>
  </div></div>;
}
