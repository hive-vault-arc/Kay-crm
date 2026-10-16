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
}: {
  onNavigate?: (href: string) => void;
  administrator?: boolean;
}) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`) || (href === "/leads" && pathname.startsWith("/contacts/"));
  return (
    <nav aria-label="Navigation principale" className="grid gap-1">
      {destinations.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => onNavigate?.(href)}
          prefetch={false}
          aria-current={active(href) ? "page" : undefined}
          className={cn(
            "flex min-h-control items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            active(href) &&
              "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          <Icon aria-hidden="true" className="size-5 shrink-0" />
          <span className="min-w-0 wrap-break-word">{label}</span>
        </Link>
      ))}
      {administrator ? <div className="mt-6 grid gap-2 border-t border-sidebar-foreground/20 pt-6 text-sm">
        <Link href="/settings" prefetch={false} onClick={() => onNavigate?.("/settings")} aria-current={pathname.startsWith("/settings") ? "page" : undefined} className={cn("flex min-h-control items-center gap-3 rounded-sm px-3 py-3 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", pathname.startsWith("/settings") && "bg-sidebar-accent text-sidebar-accent-foreground")}>
          <SettingsIcon aria-hidden="true" className="size-5" />
          Paramètres
        </Link>
      </div> : null}
    </nav>
  );
}
