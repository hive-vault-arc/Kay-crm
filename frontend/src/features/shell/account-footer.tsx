import { LogoutButton } from "@/features/auth/session-controls";
import { roles } from "@/features/users/contracts";
import type { PublicIdentity } from "@/lib/auth/contracts";

export function AccountFooter({ user }: { user: PublicIdentity["user"] }) {
  const initials = user.display_name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("");

  return (
    <section aria-label="Compte utilisateur" className="mt-auto grid min-w-0 shrink-0 gap-3 border-t border-sidebar-foreground/20 px-3 pt-4">
      <div className="flex min-w-0 items-start gap-3">
        <span aria-hidden="true" className="flex size-control shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="wrap-anywhere text-sm font-medium">{user.display_name}</p>
          <p className="text-xs text-sidebar-foreground/80">{roles[user.role]}</p>
        </div>
      </div>
      <LogoutButton
        buttonClassName="w-full min-w-0 whitespace-normal"
        errorClassName="wrap-anywhere rounded-md bg-danger-background p-3"
      />
    </section>
  );
}
