"use client";

import type { Property } from "./contracts";
import type { StaffRole } from "@/features/contacts/contracts";
import { PropertyCreationWizard } from "./property-creation-wizard";
import { PropertyListingWizard } from "./property-listing-wizard";

export function PropertyEditor({ property, developmentId, developmentLabel, cancel, actorId, role }: { property?: Property; developmentId?: string; developmentLabel?: string; cancel?: () => void; actorId?: string; role?: StaffRole }) {
  return property ? <PropertyListingWizard key={`${property.id}:${actorId ?? ""}:${role ?? ""}`} property={property} cancel={cancel} actorId={actorId} role={role} /> : <PropertyCreationWizard key={`${developmentId ?? "new"}:${actorId ?? ""}:${role ?? ""}`} developmentId={developmentId} developmentLabel={developmentLabel} cancel={cancel} actorId={actorId} role={role} />;
}
