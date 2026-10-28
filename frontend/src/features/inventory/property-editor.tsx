"use client";

import type { Property } from "./contracts";
import { PropertyCreationWizard } from "./property-creation-wizard";
import { PropertyListingWizard } from "./property-listing-wizard";

export function PropertyEditor({ property, developmentId, developmentLabel, cancel }: { property?: Property; developmentId?: string; developmentLabel?: string; cancel?: () => void }) {
  return property ? <PropertyListingWizard key={property.id} property={property} cancel={cancel} /> : <PropertyCreationWizard developmentId={developmentId} developmentLabel={developmentLabel} cancel={cancel} />;
}
