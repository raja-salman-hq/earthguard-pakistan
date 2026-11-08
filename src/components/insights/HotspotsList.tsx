"use client";

import { useQuery } from "@tanstack/react-query";
import { getHotspots } from "@/lib/api";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";
import { getRegionLabel } from "@/lib/i18n";
import type { RegionId, VariableId } from "@/types/api";

type HotspotsListProps = {
  variable: VariableId;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en", { maximumSignificantDigits: 4 }).format(value);
}

export function HotspotsList({ variable }: HotspotsListProps) {
  const messages = useMessages();
  const language = useUiStore((state) => state.language);
  const selectedRegion = useUiStore((state) => state.region);
  const setRegion = useUiStore((state) => state.setRegion);
  const hotspotsQuery = useQuery({
    queryKey: ["hotspots", variable, 5],
    queryFn: () => getHotspots({ variable, limit: 5 }),
    staleTime: 5 * 60_000,
    placeholderData: (previousData) => previousData,
  });

  if (hotspotsQuery.isPending) {
    return (
      <section className="hotspots-section">
        <h2>{messages.hotspotsTitle}</h2>
        <div className="hotspots-loading" role="status" aria-label={messages.hotspotsLoading}>
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line-short" />
        </div>
      </section>
    );
  }

  if (hotspotsQuery.isError && !hotspotsQuery.data) {
    return (
      <section className="hotspots-section">
        <h2>{messages.hotspotsTitle}</h2>
        <div className="trend-error-state" role="alert">
          <p>{messages.hotspotsError}</p>
          <button type="button" onClick={() => void hotspotsQuery.refetch()}>
            {messages.hotspotsRetry}
          </button>
        </div>
      </section>
    );
  }

  if (!hotspotsQuery.data?.length) {
    return (
      <section className="hotspots-section">
        <h2>{messages.hotspotsTitle}</h2>
        <p className="map-empty-state">{messages.hotspotsEmpty}</p>
      </section>
    );
  }

  return (
    <section className="hotspots-section" aria-labelledby="hotspots-heading" aria-busy={hotspotsQuery.isFetching}>
      <div className="hotspots-heading">
        <div>
          <h2 id="hotspots-heading">{messages.hotspotsTitle}</h2>
          <p>{messages.hotspotsSubtitle}</p>
        </div>
        {hotspotsQuery.isFetching && <span className="sr-only" role="status">{messages.hotspotsLoading}</span>}
      </div>
      {hotspotsQuery.isError && (
        <p className="map-inline-error" role="alert">
          {messages.hotspotsError}{" "}
          <button type="button" onClick={() => void hotspotsQuery.refetch()}>
            {messages.hotspotsRetry}
          </button>
        </p>
      )}
      <ol className="hotspots-list">
        {hotspotsQuery.data.map((hotspot) => {
          const region: RegionId = hotspot.regionId;
          const label = getRegionLabel(region, language);
          const selected = region === selectedRegion;
          const directionIcon = hotspot.direction === "increasing" ? "↑" : "↓";
          const directionText =
            hotspot.direction === "increasing" ? messages.trendIncreasing : messages.trendDecreasing;

          return (
            <li key={hotspot.regionId}>
              <button
                className="hotspot-item"
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => setRegion(region)}
              >
                <span className="hotspot-main">
                  <strong>{label}</strong>
                  <span className="hotspot-direction">
                    <span aria-hidden="true">{directionIcon}</span>
                    {" "}{directionText}
                  </span>
                </span>
                <span className="hotspot-values">
                  <bdi dir="ltr">{formatNumber(hotspot.value)} {hotspot.unit}</bdi>
                  <span className="hotspot-significance">
                    <span aria-hidden="true">✓</span>
                    <span className="sr-only">{messages.trendSignificant}</span>
                    <bdi dir="ltr">{formatNumber(hotspot.changePercent)}%</bdi>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
