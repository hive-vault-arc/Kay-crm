import type { ReactNode } from "react";
import { VisitCalendar } from "@/features/schedule/visit-calendar";
import { getIdentity } from "@/lib/auth/server";

// This layout survives visit/create route changes, preserving the real calendar.
// Each page still owns its exact protected destination and validation boundary.
export default async function VisitsLayout({ children }: { children: ReactNode }) {
  const identity = await getIdentity();
  if (identity.state !== "authenticated" || identity.profile.must_change_password) return children;
  return <div className="kay-visit-workspace">
    <VisitCalendar actorId={identity.profile.user.id} administrator={identity.profile.user.role === "administrator"} />
    {children}
  </div>;
}
