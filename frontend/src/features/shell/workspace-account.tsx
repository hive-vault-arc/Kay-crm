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
  return <Popover><PopoverTrigger asChild><Button variant="ghost" className="kay-global-account" disabled={!hydrated} aria-label={`Compte de ${user.display_name}`}><span className="kay-account-avatar" aria-hidden="true">{initials}</span><span className="kay-global-account-copy"><strong>{user.display_name}</strong><small>{roles[user.role]}</small></span><ChevronDownIcon size={12} aria-hidden="true" /></Button></PopoverTrigger><PopoverContent aria-label="Compte utilisateur"><div className="grid gap-1"><strong className="text-sm">{user.display_name}</strong><span className="text-xs text-muted-foreground">{roles[user.role]}</span></div><LogoutButton buttonClassName="w-full" errorClassName="text-xs" /></PopoverContent></Popover>;
}
