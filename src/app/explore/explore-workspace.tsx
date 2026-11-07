"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { getPakistanProvinceRegions, getTimeSeries, getTrend, getVariables } from "@/lib/api";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";
import type { PakistanMapProps } from "@/components/map/PakistanMap";
import { VariableSelect } from "@/components/filters/VariableSelect";
import { YearRangeSlider } from "@/components/filters/YearRangeSlider";
import { LayerToggle } from "@/components/filters/LayerToggle";
import { RegionPicker } from "@/components/filters/RegionPicker";
import { TimelineControl } from "@/components/filters/TimelineControl";
import { useEffect, useState } from "react";
import { TrendSummaryCard } from "@/components/insights/TrendSummaryCard";
import { HotspotsList } from "@/components/insights/HotspotsList";
import type { TrendChartView } from "@/components/charts/TrendChart";
import type { TimeSeriesQuery, Variable } from "@/types/api";
import { ExportMenu } from "@/components/layout/ExportMenu";
import { getRegionLabel, getVariableLabel } from "@/lib/i18n";

const PakistanMap = dynamic<PakistanMapProps>(
  () => import("@/components/map/PakistanMap").then((module) => module.PakistanMap),
  {
    ssr: false,
    loading: () => <MapChunkSkeleton />,
  },
);

const TrendChart = dynamic(
  () => import("@/components/charts/TrendChart").then((module) => module.TrendChart),
  { ssr: false, loading: () => <div className="trend-chart-loading" role="status" /> },
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
  const language = useUiStore((state) => state.language);
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
  const [mobileInsightTab, setMobileInsightTab] = useState<"summary" | TrendChartView>("summary");
  const [chartOpen, setChartOpen] = useState(true);
  const [chartExpanded, setChartExpanded] = useState(false);
  const [chartResolution, setChartResolution] =
    useState<TimeSeriesQuery["resolution"]>("monthly");
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
  const trendQuery = useQuery({
    queryKey: ["trend", variableId, selectedRegion, yearRange[0], yearRange[1]],
    queryFn: () =>
      getTrend({
        variable: variableId,
        region: selectedRegion,
        start: yearRange[0],
        end: yearRange[1],
      }),
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });
  const exportSeriesQuery = useQuery({
    queryKey: ["timeseries", variableId, selectedRegion, yearRange[0], yearRange[1], chartResolution],
    queryFn: () =>
      getTimeSeries({
        variable: variableId,
        region: selectedRegion,
        start: yearRange[0],
        end: yearRange[1],
        resolution: chartResolution,
      }),
    enabled: Boolean(variable),
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });
  const exportSeries =
    exportSeriesQuery.data?.variable === variableId &&
    exportSeriesQuery.data.region === selectedRegion
      ? [{
          label: getRegionLabel(selectedRegion, language),
          unit: exportSeriesQuery.data.unit,
          points: exportSeriesQuery.data.points,
        }]
      : [];
  const trendChartProps = {
    variable: variableId,
    region: selectedRegion,
    start: yearRange[0],
    end: yearRange[1],
    trendLine: trendQuery.data?.trendLine,
    trendLineLoaded: Boolean(trendQuery.data),
    resolution: chartResolution,
    onResolutionChange: setChartResolution,
  };

  function renderTrendSummary() {
    return (
      <TrendSummaryCard
        trend={trendQuery.data}
        variable={variableId}
        variableUnit={variable?.unit ?? ""}
        start={yearRange[0]}
        end={yearRange[1]}
        loading={trendQuery.isPending}
        error={trendQuery.error?.message}
        onRetry={() => void trendQuery.refetch()}
      />
    );
  }

  function renderTrendChart(displayMode?: TrendChartView, onDisplayModeChange?: (mode: TrendChartView) => void) {
    return (
      <TrendChart
        {...trendChartProps}
        displayMode={displayMode}
        onDisplayModeChange={onDisplayModeChange}
        expanded={chartExpanded}
        onToggleExpanded={() => setChartExpanded((expanded) => !expanded)}
      />
    );
  }
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
  }

  return (
    <main className="explore-page">
      <div className="explore-heading">
        <div>
          <span className="eyebrow">{messages.country}</span>
          <h1>{messages.exploreTitle}</h1>
          <p>{messages.exploreDescription}</p>
        </div>
        <div className="explore-heading-actions">
          <ExportMenu
            metadata={{
              fileName: `${variableId}-${selectedRegion}-${yearRange[0]}-${yearRange[1]}`,
              title: messages.trendChartTitle
                .replace("{variable}", getVariableLabel(variableId, language))
                .replace("{region}", getRegionLabel(selectedRegion, language)),
              variableLabel: getVariableLabel(variableId, language),
              regionLabel: getRegionLabel(selectedRegion, language),
              unitLabel: variable?.unit ?? messages.mapUnitUnavailable,
              yearRangeLabel: `${yearRange[0]}–${yearRange[1]}`,
              source: variable?.source ?? messages.exportSourceUnavailable,
              demoLabel: messages.exportSyntheticCredit,
            }}
            series={exportSeries}
          />
        </div>
      </div>

      <section
        className="explore-map-frame"
        aria-label={messages.exploreTitle}
        data-mobile-insight={mobileInsightTab}
      >
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
            <HotspotsList variable={variableId} />
          </div>
        </div>

        <details className="map-floating-panel map-region-panel" open>
          <summary>{messages.mapSelectedRegion}</summary>
          <div className="map-panel-content">
            <RegionPicker />
            {renderTrendSummary()}
          </div>
        </details>

        <section className={`explore-mobile-insights${mobileInsightTab === "summary" ? "" : " has-active-view"}`}>
          <div className="mobile-insights-heading">
            <span>{messages.mapSelectedRegion}</span>
            <RegionPicker />
          </div>
          <div className="mobile-insight-tabs" role="tablist" aria-label={messages.trendPanelTitle}>
            {([
              ["summary", messages.trendSummaryTab],
              ["chart", messages.trendChartTab],
              ["table", messages.trendTableTab],
            ] as const).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                role="tab"
                id={`mobile-insight-tab-${tab}`}
                aria-selected={mobileInsightTab === tab}
                tabIndex={mobileInsightTab === tab ? 0 : -1}
                aria-controls="mobile-insight-content"
                onKeyDown={(event) => {
                  const target = event.currentTarget;
                  const tabs = Array.from(
                    target.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
                  );
                  const index = tabs.indexOf(target);
                  const forwardKey =
                    document.documentElement.dir === "rtl" ? "ArrowLeft" : "ArrowRight";
                  const backwardKey = forwardKey === "ArrowRight" ? "ArrowLeft" : "ArrowRight";
                  let nextIndex = index;
                  if (event.key === forwardKey) nextIndex = (index + 1) % tabs.length;
                  if (event.key === backwardKey) nextIndex = (index - 1 + tabs.length) % tabs.length;
                  if (event.key === "Home") nextIndex = 0;
                  if (event.key === "End") nextIndex = tabs.length - 1;
                  if (nextIndex === index) return;
                  event.preventDefault();
                  tabs[nextIndex]?.focus();
                  const nextTab = tabs[nextIndex]?.id.replace("mobile-insight-tab-", "");
                  if (nextTab === "summary" || nextTab === "chart" || nextTab === "table") {
                    setMobileInsightTab(nextTab);
                  }
                }}
                onClick={() => setMobileInsightTab(tab)}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            className="mobile-insight-content"
            id="mobile-insight-content"
            role="tabpanel"
            aria-labelledby={`mobile-insight-tab-${mobileInsightTab}`}
          >
            {mobileInsightTab === "summary"
              ? renderTrendSummary()
              : renderTrendChart(mobileInsightTab, setMobileInsightTab)}
          </div>
        </section>

        <section
          className={`map-floating-panel explore-chart-panel${chartExpanded ? " is-expanded" : ""}${chartOpen ? "" : " is-collapsed"}`}
          aria-label={messages.trendPanelTitle}
        >
          <div className="explore-chart-panel-heading">
            <h2>{messages.trendPanelTitle}</h2>
            <button type="button" onClick={() => setChartOpen((open) => !open)}>
              {chartOpen ? messages.trendCollapse : messages.trendOpen}
            </button>
          </div>
          {chartOpen && (
            <div className="explore-chart-panel-content">
              {renderTrendChart()}
            </div>
          )}
        </section>

        <div className="timeline-bar" dir="ltr">
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
