"use client";

import { SearchTrigger } from "@/features/discovery/search-trigger";
import Link from "next/link";
import { NotificationIcon, NavigationMenuIcon } from "@/components/icons";
import { Brand } from "@/components/shared/brand";
import { roles as roleLabels } from "@/features/users/contracts";
import { NotificationPanel } from "@/features/work/notification-panel";
import { useEffect, useRef, useState } from "react";
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
import { Navigation } from "./navigation";
import { useHydrated } from "@/hooks/use-hydrated";
import type { PublicIdentity } from "@/lib/auth/contracts";
import { LogoutButton, SessionMonitor } from "@/features/auth/session-controls";

export function AppShell({ children, identity }: { children: React.ReactNode; identity: PublicIdentity }) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const focusTarget = useRef<string | null>(null);
  const navigationClose = useRef(false);
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
    <div className="min-h-dvh lg:grid lg:grid-cols-[var(--layout-desktop-sidebar)_minmax(0,1fr)]">
      <SessionMonitor expiresAt={identity.expires_at} />
      <a
        href="#main-content"
        className="sr-only z-50 rounded-sm bg-card p-4 text-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Aller au contenu
      </a>
      <aside
        data-sidebar
        className="sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto bg-sidebar px-3 pb-5 text-sidebar-foreground lg:flex"
      >
        <Brand className="mx-auto w-28 shrink-0" />
        <Navigation administrator={identity.user.role === "administrator"} />
        <div className="mt-auto grid gap-1 border-t border-sidebar-foreground/20 px-3 pt-4 text-sm">
          <span className="wrap-anywhere">{identity.user.display_name}</span>
          <Link
            href="/change-password" prefetch={false}
            className="flex min-h-control items-center underline underline-offset-4"
          >
            Changer le mot de passe
          </Link>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="page-gutter flex min-h-17 flex-wrap items-center gap-3 border-b bg-card py-2">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Ouvrir la navigation"
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
                <div className="mt-8">
                  <Navigation
                    administrator={identity.user.role === "administrator"}
                    onNavigate={(href) => {
                      focusTarget.current = href;
                      navigationClose.current = true;
                      setOpen(false);
                    }}
                  />
                  <Link href="/change-password" prefetch={false} onClick={() => setOpen(false)}
                    className="mt-6 flex min-h-control items-center text-sm underline underline-offset-4">
                    Changer le mot de passe
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
            <p className="hidden min-w-0 text-sm font-medium md:block lg:hidden">
              KAY{" "}
              <span className="font-normal text-muted-foreground">
                / Espace de travail
              </span>
            </p>
          </div>
          <div className="order-3 w-full min-w-0 lg:order-none lg:w-auto lg:flex-1"><SearchTrigger /></div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Ouvrir les notifications" disabled={!hydrated}><NotificationIcon aria-hidden="true" /></Button></SheetTrigger>
              <SheetContent closeLabel="Fermer les notifications" className="w-full overflow-y-auto p-5 sm:max-w-reading"><SheetHeader className="mb-6 p-0 pr-6 text-left"><SheetTitle>Votre boîte de réception</SheetTitle><SheetDescription>Notifications internes accessibles avec vos droits actuels.</SheetDescription></SheetHeader><NotificationPanel /></SheetContent>
            </Sheet>
            <span aria-hidden="true" className="flex size-control shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">{identity.user.display_name.split(/\s+/).map(part => part[0]).slice(0, 2).join("")}</span>
            <div className="hidden max-w-40 text-xs sm:grid"><span className="truncate font-medium">{identity.user.display_name}</span><span className="text-muted-foreground">{roleLabels[identity.user.role]}</span></div>
            <LogoutButton />
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="page-gutter mx-auto grid max-w-workspace gap-4 py-5 md:py-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
