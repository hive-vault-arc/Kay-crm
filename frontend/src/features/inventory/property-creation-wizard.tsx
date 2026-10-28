"use client";
import { PropertyListingWizard } from "./property-listing-wizard";

export function PropertyCreationWizard({ developmentId, developmentLabel, cancel }: { developmentId?: string; developmentLabel?: string; cancel?: () => void }) {
  return <PropertyListingWizard developmentId={developmentId} developmentLabel={developmentLabel} cancel={cancel} />;
}
