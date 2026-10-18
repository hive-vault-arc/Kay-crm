"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarIcon,
  DealIcon,
  PropertyIcon,
  DashboardIcon,
  SettingsIcon,
  ContactsIcon,
  ChevronDownIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";

const destinations = [
  { href: "/dashboard", label: "Tableau de bord", icon: DashboardIcon },
  { href: "/leads", label: "Prospects", icon: ContactsIcon },
  { href: "/deals", label: "Affaires", icon: DealIcon },
  { href: "/visits", label: "Calendrier des visites", icon: CalendarIcon },
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
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`) || (href === "/leads" && pathname.startsWith("/contacts/"));
  return (
    <nav id={onNavigate ? "mobile-navigation" : "main-navigation"} aria-label="Navigation principale" className="grid gap-1">
      {destinations.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => onNavigate?.(href)}
          prefetch={false}
          aria-current={active(href) ? "page" : undefined}
          aria-label={label}
          title={compact ? label : undefined}
          className={cn(
            "nav-item flex min-h-control items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            active(href) &&
              "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          <span className="navigation-icon"><Icon aria-hidden="true" className="size-5 shrink-0" /></span>
          <span className={cn("min-w-0 wrap-break-word", compact && "sr-only")}>{label}</span>
          <ChevronDownIcon aria-hidden="true" className={cn("navigation-chevron size-4 shrink-0 -rotate-90", compact && "sr-only")} />
        </Link>
      ))}
      {administrator && settingsPlacement === "inline" ? <div className="mt-6 grid gap-2 border-t border-sidebar-foreground/20 pt-6 text-sm"><SettingsNavigationItem compact={compact} onNavigate={onNavigate} /></div> : null}
    </nav>
  );
}

export function SettingsNavigationItem({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: (href: string) => void }) {
  const pathname = usePathname();
  return <Link href="/settings" prefetch={false} onClick={() => onNavigate?.("/settings")} aria-current={pathname.startsWith("/settings") ? "page" : undefined} aria-label="Paramètres" title={compact ? "Paramètres" : undefined} className={cn("nav-item flex min-h-control items-center gap-3 rounded-sm px-3 py-3 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", pathname.startsWith("/settings") && "bg-sidebar-accent text-sidebar-accent-foreground")}>
    <span className="navigation-icon"><SettingsIcon aria-hidden="true" className="size-5" /></span>
    <span className={compact ? "sr-only" : "min-w-0 wrap-break-word"}>Paramètres</span>
    <ChevronDownIcon aria-hidden="true" className={cn("navigation-chevron size-4 shrink-0 -rotate-90", compact && "sr-only")} />
  </Link>;
}
