"use client";
import { PropertyListingWizard } from "./property-listing-wizard";
import type { StaffRole } from "@/features/contacts/contracts";

export function PropertyCreationWizard({ developmentId, developmentLabel, cancel, actorId, role }: { developmentId?: string; developmentLabel?: string; cancel?: () => void; actorId?: string; role?: StaffRole }) {
  return <PropertyListingWizard key={`${developmentId ?? "new"}:${actorId ?? ""}:${role ?? ""}`} developmentId={developmentId} developmentLabel={developmentLabel} cancel={cancel} actorId={actorId} role={role} />;
}
