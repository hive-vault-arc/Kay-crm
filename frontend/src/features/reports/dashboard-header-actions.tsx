"use client";

import { ChevronDownIcon } from "@/components/icons";
import { LiveNotificationIcon } from "@/features/realtime/notification-bell";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/features/auth/session-controls";
import { NotificationPanel } from "@/features/work/notification-panel";
import { useHydrated } from "@/hooks/use-hydrated";
import type { PublicIdentity } from "@/lib/auth/contracts";
import { roles } from "@/features/users/contracts";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function DashboardHeaderActions({ user }: { user: PublicIdentity["user"] }) {
  const hydrated = useHydrated();
  const initials = user.display_name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("").toLocaleUpperCase("fr-MA");

  return <div className="dashboard-header-actions-inner">
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ouvrir les notifications" disabled={!hydrated}>
          <LiveNotificationIcon />
        </Button>
      </SheetTrigger>
      <SheetContent closeLabel="Fermer les notifications" className="w-full overflow-y-auto p-5 sm:max-w-reading">
        <SheetHeader className="mb-6 p-0 pr-6 text-left">
          <SheetTitle>Votre boîte de réception</SheetTitle>
          <SheetDescription>Notifications internes accessibles avec vos droits actuels.</SheetDescription>
        </SheetHeader>
        <NotificationPanel />
      </SheetContent>
    </Sheet>
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" className="dashboard-account-trigger" aria-label={`Compte de ${user.display_name}`} disabled={!hydrated}>
          <span aria-hidden="true" className="dashboard-account-avatar">{initials}</span>
          <ChevronDownIcon aria-hidden="true" className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" closeLabel="Fermer le compte" className="w-full overflow-y-auto p-5 sm:max-w-reading">
        <SheetHeader className="mb-6 p-0 pr-6 text-left">
          <SheetTitle>Compte utilisateur</SheetTitle>
          <SheetDescription>{user.display_name} · {roles[user.role]}</SheetDescription>
        </SheetHeader>
        <LogoutButton buttonClassName="w-full" />
      </SheetContent>
    </Sheet>
  </div>;
}
