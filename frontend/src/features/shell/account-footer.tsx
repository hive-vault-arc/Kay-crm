import { LogoutButton } from "@/features/auth/session-controls";
import { roles } from "@/features/users/contracts";
import type { PublicIdentity } from "@/lib/auth/contracts";
import { HelpNavigationItem } from "./navigation";

export function AccountFooter({ user, collapsed = false, onNavigate }: { user: PublicIdentity["user"]; collapsed?: boolean; onNavigate?: (href: string) => void }) {
  const initials = user.display_name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("").toLocaleUpperCase("fr-MA");

  return (
    <section aria-label="Compte utilisateur" data-sidebar-footer className={`mt-auto grid min-w-0 shrink-0 gap-3 border-t border-sidebar-foreground/20 pt-4 ${collapsed ? "items-center px-0" : "px-3"}`}>
      <nav aria-label="Aide et documentation"><HelpNavigationItem compact={collapsed} onNavigate={onNavigate} /></nav>
      <div className="flex min-w-0 items-start gap-3">
        <span role={collapsed ? "img" : undefined} aria-label={collapsed ? `${user.display_name}, ${roles[user.role]}` : undefined} aria-hidden={collapsed ? undefined : true} title={collapsed ? user.display_name : undefined} className="flex size-control shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
          {initials}
        </span>
        <div className={collapsed ? "sr-only" : "min-w-0"}>
          <p className="wrap-anywhere text-sm font-medium">{user.display_name}</p>
          <p className="text-xs text-sidebar-foreground/80">{roles[user.role]}</p>
        </div>
      </div>
      <LogoutButton
        compact={collapsed}
        buttonClassName={collapsed ? "w-control" : "w-full min-w-0 whitespace-normal"}
        errorClassName="wrap-anywhere rounded-md bg-danger-background p-3"
      />
    </section>
  );
}
