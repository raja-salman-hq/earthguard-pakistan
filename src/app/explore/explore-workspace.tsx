"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { getPakistanProvinceRegions, getVariables } from "@/lib/api";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";
import type { PakistanMapProps } from "@/components/map/PakistanMap";
import { VariableSelect } from "@/components/filters/VariableSelect";
import { YearRangeSlider } from "@/components/filters/YearRangeSlider";
import { LayerToggle } from "@/components/filters/LayerToggle";
import { RegionPicker } from "@/components/filters/RegionPicker";
import { TimelineControl } from "@/components/filters/TimelineControl";
import { useEffect, useState } from "react";
import type { Variable } from "@/types/api";

const PakistanMap = dynamic<PakistanMapProps>(
  () => import("@/components/map/PakistanMap").then((module) => module.PakistanMap),
  {
    ssr: false,
    loading: () => <MapChunkSkeleton />,
  },
);

function MapChunkSkeleton() {
  const messages = useMessages();

  return (
    <div className="map-chunk-skeleton" role="status">
      <div className="map-state-card">
        <div className="skeleton skeleton-heading" />
        <div className="skeleton skeleton-line" />
        <span>{messages.mapLoading}</span>
      </div>
    </div>
  );
}

export default function ExploreWorkspace() {
  const messages = useMessages();
  const selectedRegion = useUiStore((state) => state.region);
  const setRegion = useUiStore((state) => state.setRegion);
  const variableId = useUiStore((state) => state.variable);
  const yearRange = useUiStore((state) => state.yearRange);
  const setVariable = useUiStore((state) => state.setVariable);
  const setYearRange = useUiStore((state) => state.setYearRange);
  const setCurrentYear = useUiStore((state) => state.setCurrentYear);
  const setLayer = useUiStore((state) => state.setLayer);
  const setMapLayerType = useUiStore((state) => state.setMapLayerType);
  const setChangeBasis = useUiStore((state) => state.setChangeBasis);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<"copied" | "error" | null>(null);
  const variablesQuery = useQuery({
    queryKey: ["variables"],
    queryFn: getVariables,
  });
  const boundariesQuery = useQuery({
    queryKey: ["pakistan-province-boundaries"],
    queryFn: getPakistanProvinceRegions,
    staleTime: Infinity,
  });
  const variable = variablesQuery.data?.find(
    (item) => item.id === variableId,
  );
  const regions = boundariesQuery.data?.features ?? [];
  const selectedName =
    regions.find((feature) => feature.id === selectedRegion)?.properties.name ??
    selectedRegion;

  useEffect(() => {
    if (!variable) {
      return;
    }

    const state = useUiStore.getState();
    const start = Math.min(
      variable.availableTo,
      Math.max(variable.availableFrom, state.yearRange[0]),
    );
    const end = Math.min(variable.availableTo, Math.max(start, state.yearRange[1]));
    if (start !== state.yearRange[0] || end !== state.yearRange[1]) {
      setYearRange([start, end]);
    }
    if (state.currentYear < start || state.currentYear > end) {
      setCurrentYear(Math.min(end, Math.max(start, state.currentYear)));
    }
  }, [setCurrentYear, setYearRange, variable]);

  function resetFilters() {
    const defaults =
      variablesQuery.data?.find((item) => item.id === "air_temperature") ??
      variablesQuery.data?.[0];
    if (!defaults) {
      return;
    }

    setVariable(defaults.id);
    setRegion("punjab");
    setYearRange([defaults.availableFrom, defaults.availableTo]);
    setCurrentYear(defaults.availableTo);
    setLayer(defaults.id);
    setMapLayerType("absolute");
    setChangeBasis("previous-year");
    setShareStatus(null);
  }

  async function copyShareableLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus("copied");
    } catch (error) {
      console.error("Could not copy the shareable explore URL.", error);
      setShareStatus("error");
    }
  }

  return (
    <main className="explore-page">
      <div className="explore-heading">
        <div>
          <span className="eyebrow">{messages.country}</span>
          <h1>{messages.exploreTitle}</h1>
          <p>{messages.exploreDescription}</p>
        </div>
      </div>

      <section className="explore-map-frame" aria-label={messages.exploreTitle}>
        <PakistanMap
          regions={boundariesQuery.data}
          boundaryLoading={boundariesQuery.isPending}
          boundaryError={boundariesQuery.error?.message}
          variable={variable}
        />

        <button
          className="filters-mobile-toggle"
          type="button"
          aria-expanded={filtersOpen}
          aria-controls="explore-filters"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          {filtersOpen ? messages.filterClose : messages.filterButton}
        </button>

        <div
          className={`map-floating-panel map-controls-panel explore-filters-panel${filtersOpen ? " filters-open" : ""}`}
          id="explore-filters"
          aria-label={messages.filterPanelTitle}
        >
          <div className="explore-filter-heading">
            <h2>{messages.filterPanelTitle}</h2>
            <button
              type="button"
              onClick={resetFilters}
              disabled={variablesQuery.isPending || variablesQuery.isError || !variablesQuery.data?.length}
            >
              {messages.filterReset}
            </button>
          </div>
          <div className="map-panel-content explore-filter-content">
            <VariableSelect />
            <YearRangeSlider
              key={`${variableId}-${yearRange[0]}-${yearRange[1]}-${yearRangeKey(variablesQuery.data, variableId)}`}
              variable={variable}
              loading={variablesQuery.isPending}
              error={variablesQuery.error?.message}
            />
            <LayerToggle />
            <RegionPicker />
            <div className="explore-share-actions">
              <button type="button" onClick={copyShareableLink}>{messages.filterCopyLink}</button>
              {shareStatus && (
                <span className={shareStatus === "error" ? "map-inline-error" : "share-status"} role="status">
                  {shareStatus === "copied" ? messages.filterLinkCopied : messages.filterCopyError}
                </span>
              )}
            </div>
          </div>
        </div>

        <details className="map-floating-panel map-region-panel" open>
          <summary>{messages.mapSelectedRegion}</summary>
          <div className="map-panel-content">
            <span className="map-panel-eyebrow">{messages.mapSelectedRegion}</span>
            <h2>{selectedName}</h2>
          </div>
        </details>

        <div className="timeline-bar">
          <TimelineControl
            variable={variable}
            loading={variablesQuery.isPending}
            error={variablesQuery.error?.message}
          />
        </div>
      </section>
    </main>
  );
}

function yearRangeKey(
  variables: Variable[] | undefined,
  variableId: string,
): string {
  const variable = variables?.find((item) => item.id === variableId);
  return variable ? `${variable.availableFrom}-${variable.availableTo}` : "loading";
}
