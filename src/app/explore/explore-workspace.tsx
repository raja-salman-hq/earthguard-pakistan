"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { getPakistanProvinceRegions, getVariables } from "@/lib/api";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";
import { LayerControl } from "@/components/map/LayerControl";
import type { PakistanMapProps } from "@/components/map/PakistanMap";

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

        <details className="map-floating-panel map-controls-panel" open>
          <summary>{messages.controlsPlaceholder}</summary>
          <div className="map-panel-content">
            <LayerControl />
          </div>
        </details>

        <details className="map-floating-panel map-region-panel" open>
          <summary>{messages.mapSelectedRegion}</summary>
          <div className="map-panel-content">
            <span className="map-panel-eyebrow">{messages.mapSelectedRegion}</span>
            <h2>{selectedName}</h2>
            <span className="map-panel-eyebrow">{messages.mapRegionList}</span>
            {boundariesQuery.isPending && <div className="map-form-skeleton" />}
            {boundariesQuery.isError && (
              <p className="map-inline-error" role="alert">
                {messages.mapBoundaryError}
              </p>
            )}
            {regions.length > 0 && (
              <ul className="map-region-list">
                {regions.map((feature) => (
                  <li key={feature.id}>
                    <button
                      type="button"
                      aria-pressed={selectedRegion === feature.id}
                      onClick={() => setRegion(feature.id)}
                    >
                      <span>{feature.properties.name}</span>
                      <span className="map-region-list-value">
                        {feature.id === selectedRegion ? "●" : "○"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </section>
    </main>
  );
}
