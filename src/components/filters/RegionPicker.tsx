"use client";

import { useQuery } from "@tanstack/react-query";
import { getPakistanProvinceRegions } from "@/lib/api";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";
import { regionIdSchema } from "@/types/api";

export function RegionPicker() {
  const messages = useMessages();
  const selectedRegion = useUiStore((state) => state.region);
  const setRegion = useUiStore((state) => state.setRegion);
  const regionsQuery = useQuery({
    queryKey: ["pakistan-province-boundaries"],
    queryFn: getPakistanProvinceRegions,
    staleTime: Infinity,
  });

  if (regionsQuery.isPending) {
    return <div className="map-form-skeleton" role="status" aria-label={messages.filterLoadingRegions} />;
  }

  if (regionsQuery.isError) {
    return <p className="map-inline-error" role="alert">{messages.filterRegionsError}</p>;
  }

  if (!regionsQuery.data.features.length) {
    return <p className="map-empty-state" role="status">{messages.filterRegionsEmpty}</p>;
  }

  const regions = regionsQuery.data.features;

  return (
    <div className="filter-field-group">
      <label className="map-field" htmlFor="map-region-select">
        <span>{messages.mapRegionList}</span>
        <select
          id="map-region-select"
          value={selectedRegion}
          dir="ltr"
          onChange={(event) => {
            const parsedRegion = regionIdSchema.safeParse(event.currentTarget.value);
            if (parsedRegion.success) {
              setRegion(parsedRegion.data);
            }
          }}
        >
          {regions.map((feature) => (
            <option key={feature.id} value={feature.id}>
              {feature.properties.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
