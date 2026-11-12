"use client";

import { ChevronDownIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LogoutButton } from "@/features/auth/session-controls";
import { roles } from "@/features/users/contracts";
import { useHydrated } from "@/hooks/use-hydrated";
import type { PublicIdentity } from "@/lib/auth/contracts";

export function WorkspaceAccount({ user }: { user: PublicIdentity["user"] }) {
  const hydrated = useHydrated();
  const initials = user.display_name.trim().split(/\s+/).map(part => Array.from(part)[0]).slice(0, 2).join("").toLocaleUpperCase("fr-MA");
  return <Popover><PopoverTrigger asChild><Button variant="ghost" className="kay-global-account" disabled={!hydrated} aria-label={`Compte de ${user.display_name}`}><span className="kay-account-avatar" aria-hidden="true">{initials}</span><span className="kay-global-account-copy min-w-0 max-w-48"><strong className="truncate">{user.display_name}</strong><small>{roles[user.role]}</small></span><ChevronDownIcon size={12} aria-hidden="true" /></Button></PopoverTrigger><PopoverContent aria-label="Compte utilisateur" className="w-80 max-w-[calc(100vw-2rem)]"><div className="grid min-w-0 gap-1"><strong className="text-sm wrap-anywhere">{user.display_name}</strong><span className="text-xs text-muted-foreground">{roles[user.role]}</span></div><LogoutButton buttonClassName="w-full min-h-control!" errorClassName="text-xs" /></PopoverContent></Popover>;
}
