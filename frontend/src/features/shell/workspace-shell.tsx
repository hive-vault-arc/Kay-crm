"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavigationMenuIcon } from "@/components/icons";
import { Brand } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SearchTrigger } from "@/features/discovery/search-trigger";
import { SessionMonitor } from "@/features/auth/session-controls";
import { LiveUpdates } from "@/features/realtime/live-updates";
import { LiveNotificationIcon } from "@/features/realtime/notification-bell";
import { NotificationPanel } from "@/features/work/notification-panel";
import { useHydrated } from "@/hooks/use-hydrated";
import type { PublicIdentity } from "@/lib/auth/contracts";
import { HelpNavigationItem, Navigation, SettingsNavigationItem } from "./navigation";
import { ThemeControl } from "./theme-control";
import { WorkspaceAccount } from "./workspace-account";

export function AppShell({ children, identity }: { children: ReactNode; identity: PublicIdentity }) {
  const pathname = usePathname(), hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const destination = useRef<string | null>(null), closeForNavigation = useRef(false);
  useEffect(() => {
    if (open || !destination.current) return;
    let frame = 0;
    function focusHeading() {
      if (location.pathname !== destination.current || document.querySelector('[data-slot="sheet-content"]')) return;
      const heading = document.querySelector<HTMLElement>('main [data-route]');
      if (heading?.dataset.route !== destination.current) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { if (heading.isConnected) { heading.focus({ preventScroll: true }); destination.current = null; observer.disconnect(); } });
    }
    const observer = new MutationObserver(focusHeading);
    observer.observe(document.body, { childList: true, subtree: true });focusHeading();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [pathname, open]);
  function navigate(path: string) { destination.current = path; closeForNavigation.current = true; setOpen(false); }
  return <div data-app-shell data-kay-workspace className="kay-shell">
    <SessionMonitor expiresAt={identity.expires_at} />
    <a href="#main-content" className="sr-only fixed left-4 top-4 z-100 rounded-full bg-card px-4 py-3 text-sm focus:not-sr-only">Aller au contenu</a>
    <header className="kay-global-bar" aria-label="Espace KAY">
      <div className="kay-global-brand">
        <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="min-[831px]:hidden" disabled={!hydrated} aria-label="Ouvrir la navigation" data-shell-menu-trigger><NavigationMenuIcon size={20} aria-hidden="true" /></Button></SheetTrigger><SheetContent side="left" closeLabel="Fermer la navigation" className="w-72 max-w-[calc(100vw-16px)] p-5" onCloseAutoFocus={event => { if (closeForNavigation.current) { event.preventDefault(); closeForNavigation.current = false; } }}><SheetHeader className="mb-6 p-0 pr-8 text-left"><SheetTitle>Navigation KAY</SheetTitle><SheetDescription>Votre espace de travail.</SheetDescription></SheetHeader><Navigation onNavigate={navigate} settingsPlacement="external" /><div className="mt-6 grid gap-2 border-t pt-4"><HelpNavigationItem onNavigate={navigate} />{identity.user.role === "administrator" ? <SettingsNavigationItem onNavigate={navigate} /> : null}</div></SheetContent></Sheet>
        <Link href="/dashboard" aria-label="KAY · Tableau de bord"><Brand appearance="transparent" /></Link>
      </div>
      <div className="kay-global-tools"><div className="kay-global-search"><SearchTrigger responsive /></div><ThemeControl />
        <Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Ouvrir les notifications" disabled={!hydrated}><LiveNotificationIcon /></Button></SheetTrigger><SheetContent closeLabel="Fermer les notifications" className="overflow-y-auto p-6"><SheetHeader className="mb-6 p-0 pr-8 text-left"><SheetTitle>Notifications</SheetTitle><SheetDescription>Votre suivi et les notifications internes accessibles.</SheetDescription></SheetHeader><NotificationPanel /></SheetContent></Sheet>
        <WorkspaceAccount user={identity.user} />
      </div>
    </header>
    <aside data-sidebar data-kay-rail className="kay-rail" aria-label="Navigation principale"><Navigation compact settingsPlacement="external" /><div className="kay-rail-utilities"><HelpNavigationItem compact />{identity.user.role === "administrator" ? <SettingsNavigationItem compact /> : null}</div></aside>
    <main id="main-content" tabIndex={-1} className="kay-main"><LiveUpdates /><div className="kay-route-motion grid min-w-0 gap-4" key={pathname}>{children}</div></main>
  </div>;
}
