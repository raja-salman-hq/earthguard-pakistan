"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { getHotspots, getTrend, getVariables } from "@/lib/api";
import { isDemoMode } from "@/lib/api/client";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";
import { getRegionLabel, getVariableLabel } from "@/lib/i18n";
import type { RegionId, VariableId } from "@/types/api";
import { SignificanceBadge } from "./SignificanceBadge";

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
  const selectedArea = useUiStore((state) => state.area);
  const setRegion = useUiStore((state) => state.setRegion);
  const setArea = useUiStore((state) => state.setArea);
  const setVariable = useUiStore((state) => state.setVariable);
  const hotspotsQuery = useQuery({
    queryKey: ["hotspots", variable, 5],
    queryFn: () => getHotspots({ variable, limit: 5 }),
    staleTime: 5 * 60_000,
    placeholderData: (previousData) => previousData,
    enabled: isDemoMode,
  });
  const realVariables = useQuery({
    queryKey: ["variables"],
    queryFn: getVariables,
    enabled: !isDemoMode,
  });
  const realTrends = useQueries({
    queries:
      !isDemoMode && selectedArea
        ? (["land_surface_temperature", "precipitation", "vegetation_index"] as const).map(
            (variableId) => ({
              queryKey: ["trend", variableId, selectedRegion, selectedArea, 2001, 2024, language],
              queryFn: () =>
                getTrend({
                  variable: variableId,
                  region: selectedRegion,
                  area: selectedArea,
                  start: 2001,
                  end: 2024,
                  lang: language,
                }),
              staleTime: 60_000,
            }),
          )
        : [],
  });

  if (!isDemoMode) {
    const indicatorIds = [
      "land_surface_temperature",
      "precipitation",
      "vegetation_index",
    ] as const;
    const loading = realVariables.isPending || realTrends.some((query) => query.isPending);
    const failed = realVariables.isError || realTrends.some((query) => query.isError && !query.data);
    return (
      <section className="hotspots-section" aria-labelledby="key-findings-heading">
        <div className="hotspots-heading">
          <div>
            <h2 id="key-findings-heading">{messages.keyFindingsTitle}</h2>
            <p>{messages.keyFindingsSubtitle}</p>
          </div>
        </div>
        {loading ? (
          <div className="hotspots-loading" role="status" aria-label={messages.hotspotsLoading}>
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line-short" />
          </div>
        ) : failed ? (
          <div className="trend-error-state" role="alert">
            <p>{messages.hotspotsError}</p>
            <button
              type="button"
              onClick={() => {
                void realVariables.refetch();
                realTrends.forEach((query) => void query.refetch());
              }}
            >
              {messages.hotspotsRetry}
            </button>
          </div>
        ) : (
          <ol className="hotspots-list">
            {indicatorIds.map((indicatorId, index) => {
              const trend = realTrends[index]?.data;
              const selected = indicatorId === variable;
              const indicator = realVariables.data?.find((item) => item.id === indicatorId);
              const magnitude =
                typeof trend?.slope === "number"
                  ? `${formatNumber(trend.slope)} ${trend.unit ?? indicator?.unit ?? ""}`
                  : typeof trend?.changeTotal === "number"
                    ? `${formatNumber(trend.changeTotal)} ${indicator?.unit ?? ""}`
                    : null;
              const direction =
                trend?.direction === "increasing"
                  ? messages.trendIncreasing
                  : trend?.direction === "decreasing"
                    ? messages.trendDecreasing
                    : trend?.direction === "no_change"
                      ? messages.trendNoChange
                      : null;
              return (
                <li key={indicatorId}>
                  <button
                    className="hotspot-item"
                    type="button"
                    aria-current={selected ? "true" : undefined}
                    onClick={() => setVariable(indicatorId)}
                  >
                    <span className="hotspot-main">
                      <strong>{getVariableLabel(indicatorId, language)}</strong>
                      {direction ? (
                        <span className="hotspot-direction">
                          <span aria-hidden="true">
                            {trend?.direction === "increasing"
                              ? "↑"
                              : trend?.direction === "decreasing"
                                ? "↓"
                                : "→"}
                          </span>{" "}
                          {direction}
                        </span>
                      ) : (
                        <span>{messages.trendStatisticsUnavailable}</span>
                      )}
                    </span>
                    <span className="hotspot-values">
                      {magnitude && <bdi dir="ltr">{magnitude}</bdi>}
                      {typeof trend?.significant === "boolean" && (
                        <SignificanceBadge
                          compact
                          significant={trend.significant}
                          pValue={trend.pValue}
                          confidence={trend.confidence}
                        />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        {!selectedArea && (
          <button type="button" onClick={() => setArea("faisalabad")}>
            {messages.selectFaisalabad}
          </button>
        )}
      </section>
    );
  }

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
