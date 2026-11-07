import { LocationIcon, PropertyIcon, SettingsIcon } from "@/components/icons";
import { RecordFact, RecordFacts } from "@/components/shared/record-facts";
import { RecordSection } from "@/components/shared/record-workspace";
import { amenityLabels, type Property } from "./contracts";
import { formatListingField, listingFieldLabels } from "./listing-field-format";

export const listingDetailGroups = {
  location: ["region", "city", "district", "neighborhood", "address", "google_maps_url"],
  characteristics: ["bedrooms", "bathrooms", "capacity", "minimum_nights", "condition", "age_band", "floor_type", "unit_floor", "building_floors", "orientation", "plot_area_sqm", "land_delivery", "land_status"],
  equipment: ["garden_area_sqm", "terrace_area_sqm", "garage_spaces"],
} as const;

export function PropertyListingDetails({ property }: { property: Property }) {
  const present = (keys: readonly (keyof Property["listing_details"])[]) => keys.filter(key => formatListingField(property, key) !== null);
  const location = present(listingDetailGroups.location), characteristics = present(listingDetailGroups.characteristics), equipment = present(listingDetailGroups.equipment);
  return <>
    {characteristics.length ? <RecordSection title="Caractéristiques du bien"><RecordFacts>{characteristics.map(key => <RecordFact key={key} icon={PropertyIcon} label={listingFieldLabels[key]}>{formatListingField(property, key)}</RecordFact>)}</RecordFacts></RecordSection> : null}
    {location.length ? <RecordSection title="Localisation"><RecordFacts>{location.map(key => <RecordFact key={key} icon={LocationIcon} label={listingFieldLabels[key]}>{key === "google_maps_url" && property.listing_details.google_maps_url ? <a className="inline-flex min-h-control items-center hover:underline" href={property.listing_details.google_maps_url} target="_blank" rel="noopener noreferrer">Ouvrir Google Maps</a> : formatListingField(property, key)}</RecordFact>)}</RecordFacts></RecordSection> : null}
    {property.listing_details.amenities.length || equipment.length ? <RecordSection title="Équipements">{property.listing_details.amenities.length ? <ul className="kay-amenity-list">{property.listing_details.amenities.map(key => <li key={key}><SettingsIcon size={12} aria-hidden="true" />{amenityLabels[key]}</li>)}</ul> : null}{equipment.length ? <RecordFacts>{equipment.map(key => <RecordFact key={key} icon={PropertyIcon} label={listingFieldLabels[key]}>{formatListingField(property, key)}</RecordFact>)}</RecordFacts> : null}</RecordSection> : null}
    {property.listing_details.description ? <RecordSection title="Description"><p className="whitespace-pre-wrap wrap-anywhere text-sm leading-relaxed">{property.listing_details.description}</p></RecordSection> : null}
  </>;
}
