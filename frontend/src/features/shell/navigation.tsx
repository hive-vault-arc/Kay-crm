"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarIcon,
  TaskIcon,
  DealIcon,
  PropertyIcon,
  DashboardIcon,
  SettingsIcon,
  ContactsIcon,
  ContactIcon,
  HelpIcon,
  OwnerIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";

const destinations = [
  { href: "/dashboard", label: "Tableau de bord", icon: DashboardIcon },
  { href: "/leads", label: "Prospects", icon: ContactsIcon },
  { href: "/deals", label: "Affaires", icon: DealIcon },
  { href: "/tasks", label: "Tâches", icon: TaskIcon },
  { href: "/visits", label: "Calendrier des visites", icon: CalendarIcon },
  { href: "/contacts", label: "Contacts", icon: ContactIcon },
  { href: "/owners", label: "Propriétaires", icon: OwnerIcon },
  { href: "/projects", label: "Projets", icon: PropertyIcon },
];

export function Navigation({
  onNavigate,
  administrator = false,
  compact = false,
  settingsPlacement = "inline",
}: {
  onNavigate?: (href: string) => void;
  administrator?: boolean;
  compact?: boolean;
  settingsPlacement?: "inline" | "external";
}) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <nav id={onNavigate ? "mobile-navigation" : "main-navigation"} aria-label="Navigation principale" className="kay-navigation">
      {destinations.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => onNavigate?.(href)}
          prefetch={false}
          aria-current={active(href) ? "page" : undefined}
          aria-label={label}
          title={compact ? label : undefined}
          data-compact={compact}
          className="kay-nav-link"
        >
          <Icon aria-hidden="true" className="size-5 shrink-0" />
          <span className={cn("min-w-0 wrap-break-word", compact && "sr-only")}>{label}</span>
        </Link>
      ))}
      {administrator && settingsPlacement === "inline" ? <div className="mt-6 grid gap-2 border-t border-sidebar-foreground/20 pt-6 text-sm"><SettingsNavigationItem compact={compact} onNavigate={onNavigate} /></div> : null}
    </nav>
  );
}

export function SettingsNavigationItem({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: (href: string) => void }) {
  const pathname = usePathname();
  return <Link href="/settings" prefetch={false} onClick={() => onNavigate?.("/settings")} aria-current={pathname.startsWith("/settings") ? "page" : undefined} aria-label="Paramètres" title={compact ? "Paramètres" : undefined} data-compact={compact} className="kay-nav-link">
    <span className="navigation-icon"><SettingsIcon aria-hidden="true" className="size-5" /></span>
    <span className={compact ? "sr-only" : "min-w-0 wrap-break-word"}>Paramètres</span>
  </Link>;
}

export function HelpNavigationItem({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: (href: string) => void }) {
  const pathname = usePathname();
  const active = pathname === "/help" || pathname.startsWith("/help/");
  return <Link href="/help" prefetch={false} onClick={() => onNavigate?.("/help")} aria-current={active ? "page" : undefined} aria-label="Aide" title={compact ? "Aide" : undefined} data-compact={compact} className="kay-nav-link">
    <HelpIcon aria-hidden="true" className="size-5 shrink-0" /><span className={compact ? "sr-only" : "min-w-0 wrap-break-word"}>Aide</span>
  </Link>;
}
