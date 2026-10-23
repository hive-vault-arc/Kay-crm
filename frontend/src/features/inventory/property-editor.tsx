"use client";

import type { Property } from "./contracts";
import { PropertyCreationWizard } from "./property-creation-wizard";
import { PropertyListingWizard } from "./property-listing-wizard";

export function PropertyEditor({ property, developmentId }: { property?: Property; developmentId?: string }) {
  return property ? <PropertyListingWizard key={property.id} property={property} /> : <PropertyCreationWizard developmentId={developmentId} />;
}
