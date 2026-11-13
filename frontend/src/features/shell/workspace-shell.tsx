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
import { NotificationInbox } from "@/features/work/notification-inbox";
import { useHydrated } from "@/hooks/use-hydrated";
import type { PublicIdentity } from "@/lib/auth/contracts";
import { HelpNavigationItem, Navigation, SettingsNavigationItem } from "./navigation";
import { ThemeControl } from "./theme-control";
import { WorkspaceAccount } from "./workspace-account";
import { WorkspaceNavigationGuard } from "@/components/shared/unsaved-guard";
import { useWorkspaceWheel } from "./workspace-wheel";

export function AppShell({ children, identity }: { children: ReactNode; identity: PublicIdentity }) {
  const pathname = usePathname(), hydrated = useHydrated();
  useWorkspaceWheel(pathname);
  const workspaceRoute = pathname.startsWith("/visits/") ? "/visits" : pathname;
  const [open, setOpen] = useState(false);
  const destination = useRef<string | null>(null);
  const [navigationClosed, setNavigationClosed] = useState(true);
  useEffect(() => {
    if (open || !navigationClosed || !destination.current) return;
    let frame = 0;
    function focusHeading() {
      if (location.pathname !== destination.current) return;
      const heading = document.querySelector<HTMLElement>(`main h1[data-route="${CSS.escape(destination.current)}"]`);
      if (!heading || heading.closest('[aria-hidden="true"], [inert]')) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!heading.isConnected || location.pathname !== destination.current) return;
        heading.focus({ preventScroll: true });
        if (document.activeElement === heading) {
          destination.current = null;
          observer.disconnect();
        }
      });
    }
    const observer = new MutationObserver(focusHeading);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-hidden", "inert"] });
    focusHeading();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [pathname, open, navigationClosed]);
  function navigate(path: string) { destination.current = path; setNavigationClosed(false); setOpen(false); }
  return <div data-app-shell data-kay-workspace className="kay-shell">
    <SessionMonitor expiresAt={identity.expires_at} />
    <WorkspaceNavigationGuard />
    <a href="#main-content" className="sr-only fixed left-4 top-4 z-100 rounded-full bg-card px-4 py-3 text-sm focus:not-sr-only">Aller au contenu</a>
    <header className="kay-global-bar" aria-label="Espace KAY">
      <div className="kay-global-brand">
        <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="min-[831px]:hidden" disabled={!hydrated} aria-label="Ouvrir la navigation" data-shell-menu-trigger><NavigationMenuIcon size={20} aria-hidden="true" /></Button></SheetTrigger><SheetContent side="left" closeLabel="Fermer la navigation" className="w-72 max-w-[calc(100vw-16px)] p-5" onCloseAutoFocus={event => { if (destination.current) event.preventDefault(); setNavigationClosed(true); }}><SheetHeader className="mb-6 p-0 pr-8 text-left"><SheetTitle>Navigation KAY</SheetTitle><SheetDescription>Votre espace de travail.</SheetDescription></SheetHeader><Navigation onNavigate={navigate} settingsPlacement="external" /><div className="mt-6 grid gap-2 border-t pt-4"><HelpNavigationItem onNavigate={navigate} />{identity.user.role === "administrator" ? <SettingsNavigationItem onNavigate={navigate} /> : null}</div></SheetContent></Sheet>
        <Link href="/dashboard" aria-label="KAY · Tableau de bord"><Brand appearance="transparent" /></Link>
      </div>
      <div className="kay-global-tools"><div className="kay-global-search"><SearchTrigger responsive /></div><ThemeControl />
        <NotificationInbox />
        <WorkspaceAccount user={identity.user} />
      </div>
    </header>
    <aside data-sidebar data-kay-rail className="kay-rail" aria-label="Navigation principale"><Navigation compact settingsPlacement="external" /><div className="kay-rail-utilities"><HelpNavigationItem compact />{identity.user.role === "administrator" ? <SettingsNavigationItem compact /> : null}</div></aside>
    <main id="main-content" tabIndex={-1} className="kay-main"><LiveUpdates /><div className="kay-route-motion grid min-w-0 gap-4" key={workspaceRoute}>{children}</div></main>
  </div>;
}
