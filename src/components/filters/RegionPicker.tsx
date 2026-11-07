"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPakistanProvinceRegions } from "@/lib/api";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";

export function RegionPicker() {
  const messages = useMessages();
  const selectedRegion = useUiStore((state) => state.region);
  const setRegion = useUiStore((state) => state.setRegion);
  const [search, setSearch] = useState("");
  const regionsQuery = useQuery({
    queryKey: ["pakistan-province-boundaries"],
    queryFn: getPakistanProvinceRegions,
    staleTime: Infinity,
  });
  const regions = useMemo(
    () =>
      (regionsQuery.data?.features ?? []).filter((feature) =>
        feature.properties.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
      ),
    [regionsQuery.data, search],
  );

  if (regionsQuery.isPending) {
    return <div className="map-form-skeleton" role="status" aria-label={messages.filterLoadingRegions} />;
  }

  if (regionsQuery.isError) {
    return <p className="map-inline-error" role="alert">{messages.filterRegionsError}</p>;
  }

  if (!regionsQuery.data.features.length) {
    return <p className="map-empty-state" role="status">{messages.filterRegionsEmpty}</p>;
  }

  return (
    <div className="filter-field-group">
      <label className="map-field" htmlFor="region-search">
        <span>{messages.mapRegionList}</span>
        <input
          id="region-search"
          type="search"
          value={search}
          placeholder={messages.filterSearchRegions}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
      </label>
      {regions.length === 0 ? (
        <p className="map-empty-state" role="status">{messages.filterNoRegionsMatch}</p>
      ) : (
        <ul className="map-region-list filter-region-list">
          {regions.map((feature) => (
            <li key={feature.id}>
              <button
                type="button"
                aria-pressed={selectedRegion === feature.id}
                onClick={() => setRegion(feature.id)}
              >
                <span>{feature.properties.name}</span>
                <span className="map-region-list-value">
                  {selectedRegion === feature.id ? "●" : "○"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
