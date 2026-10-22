"use client";

import Image from "next/image";
import { SearchTrigger } from "@/features/discovery/search-trigger";
import { ChevronDownIcon, NavigationMenuIcon } from "@/components/icons";
import { Brand } from "@/components/shared/brand";
import { NotificationPanel } from "@/features/work/notification-panel";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Navigation, SettingsNavigationItem } from "./navigation";
import { AccountFooter } from "./account-footer";
import { useHydrated } from "@/hooks/use-hydrated";
import type { PublicIdentity } from "@/lib/auth/contracts";
import { SessionMonitor } from "@/features/auth/session-controls";
import { LiveUpdates } from "@/features/realtime/live-updates";
import { LiveNotificationIcon } from "@/features/realtime/notification-bell";
import { DashboardHeaderActions } from "@/features/reports/dashboard-header-actions";

export function AppShell({ children, identity }: { children: React.ReactNode; identity: PublicIdentity }) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const crmWorkspace = /^\/(leads|deals)(\/|$)/.test(pathname);
  const calendarWorkspace = pathname === "/visits";
  const projectsWorkspace = pathname === "/projects";
  const crmReference = calendarWorkspace || /^\/(leads|deals)(?:\/[a-f0-9-]{36})?$/.test(pathname);
  const focusTarget = useRef<string | null>(null);
  const navigationClose = useRef(false);
  const shellStyle = { "--app-sidebar-width": sidebarCollapsed ? "72px" : "224px" } as CSSProperties;
  useEffect(() => {
    if (open || !focusTarget.current) return;
    let frame = 0;
    const observer = new MutationObserver(focusDestination);
    function focusDestination() {
      const target = focusTarget.current;
      if (
        !target ||
        window.location.pathname !== target ||
        document.querySelector('[data-slot="sheet-content"]')
      )
        return;
      const heading = document.querySelector<HTMLHeadingElement>(
        "main h1[data-route]",
      );
      if (heading?.dataset.route !== target) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (heading.isConnected) {
          heading.focus({ preventScroll: true });
          focusTarget.current = null;
          observer.disconnect();
        }
      });
    }
    observer.observe(document.body, { childList: true, subtree: true });
    focusDestination();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [pathname, open]);
  return (
    <div data-app-shell data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"} style={shellStyle} className="app-shell min-h-dvh lg:grid lg:grid-cols-[var(--app-sidebar-width)_minmax(0,1fr)]">
      <SessionMonitor expiresAt={identity.expires_at} />
      <a
        href="#main-content"
        className="sr-only z-50 rounded-sm bg-card p-4 text-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Aller au contenu
      </a>
      <aside
        data-sidebar
        data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}
        className="sidebar sticky top-0 z-30 hidden h-dvh bg-sidebar text-sidebar-foreground lg:block"
      >
        <div className="sidebar-scroll flex h-dvh flex-col px-3">
          <div className="sidebar-brand-row shrink-0">
            <Brand appearance="transparent" className={`sidebar-brand mx-auto shrink-0 ${sidebarCollapsed ? "w-10" : "w-28"}`} />
          </div>
          <div className="sidebar-search shrink-0"><SearchTrigger compact={sidebarCollapsed} sidebar /></div>
          <Navigation administrator={identity.user.role === "administrator"} compact={sidebarCollapsed} settingsPlacement="external" />
          <div className="sidebar-illustration" aria-hidden="true"><Image src="/images/login-architecture.svg" alt="" width={640} height={510} /></div>
          {identity.user.role === "administrator" ? <nav className="sidebar-settings" aria-label="Administration"><SettingsNavigationItem compact={sidebarCollapsed} /></nav> : null}
          <AccountFooter user={identity.user} collapsed={sidebarCollapsed} />
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={sidebarCollapsed ? "Développer la navigation" : "Réduire la navigation"}
          aria-controls="main-navigation"
          aria-expanded={!sidebarCollapsed}
          title={sidebarCollapsed ? "Développer la navigation" : "Réduire la navigation"}
          onClick={() => setSidebarCollapsed(value => !value)}
          className="sidebar-toggle rounded-full"
        >
          <span className="sidebar-toggle-face grid size-8 place-items-center rounded-full">
            <ChevronDownIcon aria-hidden="true" className={`size-4 transition-transform ${sidebarCollapsed ? "-rotate-90" : "rotate-90"}`} />
          </span>
        </Button>
      </aside>
      <div className="workspace-body min-w-0">
        <header className={`workspace-utility-header page-gutter ${projectsWorkspace ? "projects-utility-header " : ""}${crmWorkspace ? "crm-gutter " : ""}flex min-h-17 flex-wrap items-center gap-3 border-b bg-card py-2`}>
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Ouvrir la navigation"
                  data-shell-menu-trigger
                  disabled={!hydrated}
                  className="lg:hidden"
                >
                  <NavigationMenuIcon aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                closeLabel="Fermer la navigation"
                data-sidebar
                className="w-navigation overflow-y-auto border-0 bg-sidebar p-6 text-sidebar-foreground"
                onCloseAutoFocus={(event) => {
                  if (navigationClose.current) {
                    event.preventDefault();
                    navigationClose.current = false;
                  }
                }}
              >
                <SheetHeader className="p-0 text-left">
                  <SheetTitle className="pr-6 text-section text-sidebar-foreground">
                    Navigation KAY
                  </SheetTitle>
                  <SheetDescription className="text-sm text-sidebar-foreground">
                    Votre espace de travail KAY.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-8 shrink-0">
                  <Navigation
                    administrator={identity.user.role === "administrator"}
                    onNavigate={(href) => {
                      focusTarget.current = href;
                      navigationClose.current = true;
                      setOpen(false);
                    }}
                  />
                </div>
                <AccountFooter user={identity.user} />
              </SheetContent>
            </Sheet>
            <p className="hidden min-w-0 text-sm font-medium md:block lg:hidden">
              KAY{" "}
              <span className="font-normal text-muted-foreground">
                / Espace de travail
              </span>
            </p>
          </div>
          <div data-shell-search className="order-3 w-full min-w-0 lg:hidden"><SearchTrigger /></div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {crmReference ? <DashboardHeaderActions user={identity.user} /> : <Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Ouvrir les notifications" disabled={!hydrated}><LiveNotificationIcon /></Button></SheetTrigger>
              <SheetContent closeLabel="Fermer les notifications" className="w-full overflow-y-auto p-5 sm:max-w-reading"><SheetHeader className="mb-6 p-0 pr-6 text-left"><SheetTitle>Votre boîte de réception</SheetTitle><SheetDescription>Notifications internes accessibles avec vos droits actuels.</SheetDescription></SheetHeader><NotificationPanel /></SheetContent>
            </Sheet>}
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          data-crm-workspace={crmWorkspace || undefined}
          className={crmWorkspace ? "page-gutter crm-gutter grid min-w-0 w-full gap-4 py-4" : calendarWorkspace || projectsWorkspace ? "page-gutter calendar-gutter grid min-w-0 w-full gap-3 py-3" : pathname === "/dashboard" ? "page-gutter dashboard-gutter grid min-w-0 w-full gap-3 py-2 md:py-3" : "page-gutter grid min-w-0 w-full gap-4 py-5 md:py-6"}
        >
          <LiveUpdates />
          {children}
        </main>
      </div>
    </div>
  );
}
