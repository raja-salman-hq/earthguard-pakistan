"use client";

import { useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPakistanProvinceRegions } from "@/lib/api";
import { getAreas } from "@/lib/api";
import { isDemoMode } from "@/lib/api/client";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";
import { getRegionLabel } from "@/lib/i18n";
import { regionIdSchema } from "@/types/api";
import { requestCoverageDialog } from "@/components/ui/CoverageDialog";

export function RegionPicker() {
  const selectId = useId();
  const messages = useMessages();
  const language = useUiStore((state) => state.language);
  const selectedRegion = useUiStore((state) => state.region);
  const selectedArea = useUiStore((state) => state.area);
  const setRegion = useUiStore((state) => state.setRegion);
  const setArea = useUiStore((state) => state.setArea);
  const regionsQuery = useQuery({
    queryKey: ["pakistan-province-boundaries"],
    queryFn: getPakistanProvinceRegions,
    staleTime: Infinity,
  });
  const areasQuery = useQuery({
    queryKey: ["areas-config"],
    queryFn: getAreas,
    enabled: !isDemoMode,
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
  const selectedValue = !isDemoMode && selectedArea ? selectedArea : selectedRegion;

  return (
    <div className="filter-field-group">
      <label className="map-field" htmlFor={selectId}>
        <span>{messages.mapRegionList}</span>
        <select
          id={selectId}
          value={selectedValue}
          dir="ltr"
          onChange={(event) => {
            const value = event.currentTarget.value;
            const selectedAreaOption = areasQuery.data?.areas.find(
              (area) => area.id === value,
            );
            if (!isDemoMode && selectedAreaOption) {
              if (selectedAreaOption.status === "available") {
                setArea(selectedAreaOption.id);
              } else {
                requestCoverageDialog("no-data", selectedAreaOption.name);
              }
              return;
            }
            const parsedRegion = regionIdSchema.safeParse(value);
            if (parsedRegion.success) {
              setRegion(parsedRegion.data);
              if (!isDemoMode && parsedRegion.data !== "punjab") {
                requestCoverageDialog("no-data", getRegionLabel(parsedRegion.data, language));
              }
            }
          }}
        >
          {regions.map((feature) => (
            <option key={feature.id} value={feature.id}>
              {getRegionLabel(feature.id, language)}
            </option>
          ))}
          {!isDemoMode && areasQuery.data?.areas.length ? (
            <optgroup label={getRegionLabel("punjab", language)}>
              {areasQuery.data.areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name} — {area.status === "available" ? messages.mapAvailableStatus : messages.mapComingSoonStatus}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </label>
      {!isDemoMode && areasQuery.isError && (
        <p className="map-inline-error" role="alert">{areasQuery.error.message}</p>
      )}
    </div>
  );
}
