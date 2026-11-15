"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
import type { KeyboardEvent } from "react";
import { ArrowDown, ArrowRight, ArrowUp, ChevronLeft, ChevronRight, CloudRain, Leaf, Lock, Plus, Table2, ThermometerSun } from "lucide-react";
import { z } from "zod";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ExportMenu } from "@/components/layout/ExportMenu";
import { VariableSelect } from "@/components/filters/VariableSelect";
import { YearRangeSlider } from "@/components/filters/YearRangeSlider";
import { SignificanceBadge } from "@/components/insights/SignificanceBadge";
import { TrendTakeaway } from "@/components/insights/TrendTakeaway";
import { ComponentErrorBoundary } from "@/components/ui/component-error-boundary";
import { useMessages } from "@/hooks/use-messages";
import { getAreaIndicators, getAreaMaps, getRegions, getTimeSeries, getTrend, getVariables } from "@/lib/api";
import { isDemoMode } from "@/lib/api/client";
import { getRegionLabel, getVariableLabel } from "@/lib/i18n";
import { useUiStore } from "@/store/ui-store";
import type { ComparisonExportRow, ExportSeries } from "@/lib/utils/data-export";
import { requestCoverageDialog } from "@/components/ui/CoverageDialog";
import { LiveNowCard } from "@/components/live/live-now-card";
import { regionIdSchema } from "@/types/api";
import type { CompareMode, RegionId, VariableId } from "@/types/api";
import { IndicatorOverTimeCharts } from "@/components/charts/IndicatorOverTimeCharts";
import { FaisalabadMapsView } from "@/components/compare/FaisalabadMapsView";

const compareTabSchema = z.enum(["year", "indicators", "maps", "regions"]);
type CompareTab = z.infer<typeof compareTabSchema>;

const compareTabs: Array<{ id: CompareTab }> = [
  { id: "year" },
  { id: "indicators" },
  { id: "maps" },
  { id: "regions" },
];

const CompareLineChart = dynamic(
  () => import("@/components/charts/CompareLineChart").then((module) => module.CompareLineChart),
  {
    ssr: false,
    loading: () => <div className="trend-chart-loading" role="status" />,
  },
);
const YearComparisonBarChart = dynamic(
  () => import("@/components/charts/YearComparisonBarChart").then((module) => module.YearComparisonBarChart),
  { ssr: false, loading: () => <div className="compare-bar-chart-skeleton" role="status" aria-label="Loading comparison chart" /> },
);

type ComparisonItem = {
  key: string;
  region: RegionId;
  variable: VariableId;
  label: string;
};

function formatNumber(value: number | null | undefined): string {
  if (typeof value !== "number") {
    return "—";
  }
  return new Intl.NumberFormat("en", { maximumSignificantDigits: 4 }).format(value);
}

function formatIndicatorValue(indicatorId: VariableId | undefined, value: number | null): string {
  if (value === null) return "—";
  const maximumFractionDigits =
    indicatorId === "land_surface_temperature" ? 2 : indicatorId === "vegetation_index" ? 4 : 1;
  return new Intl.NumberFormat("en", { minimumFractionDigits: maximumFractionDigits, maximumFractionDigits }).format(value);
}

function indicatorIcon(indicatorId: VariableId) {
  if (indicatorId === "land_surface_temperature") return ThermometerSun;
  if (indicatorId === "precipitation") return CloudRain;
  return Leaf;
}

function SelectionSkeleton({ label }: { label: string }) {
  return (
    <div className="compare-selection-skeleton" role="status" aria-label={label}>
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line-short" />
    </div>
  );
}

function useComparisonItems(
  mode: CompareMode,
  selectedRegions: RegionId[],
  selectedVariables: VariableId[],
  variable: VariableId,
  region: RegionId,
  language: "en" | "ur",
): ComparisonItem[] {
  return useMemo(() => {
    if (mode === "regions") {
      return selectedRegions.map((item) => ({
        key: `region:${item}`,
        region: item,
        variable,
        label: getRegionLabel(item, language),
      }));
    }

    return selectedVariables.map((item) => ({
      key: `variable:${item}`,
      region,
      variable: item,
      label: getVariableLabel(item, language),
    }));
  }, [language, mode, region, selectedRegions, selectedVariables, variable]);
}

export default function CompareWorkspace() {
  const messages = useMessages();
  const language = useUiStore((state) => state.language);
  const variable = useUiStore((state) => state.variable);
  const region = useUiStore((state) => state.region);
  const yearRange = useUiStore((state) => state.yearRange);
  const mode = useUiStore((state) => state.compareMode);
  const selectedRegions = useUiStore((state) => state.compareRegions);
  const selectedVariables = useUiStore((state) => state.compareVariables);
  const setMode = useUiStore((state) => state.setCompareMode);
  const setRegions = useUiStore((state) => state.setCompareRegions);
  const setVariables = useUiStore((state) => state.setCompareVariables);
  const setRegion = useUiStore((state) => state.setRegion);
  const [selectorsOpen, setSelectorsOpen] = useState(false);
  const [compareYear, setCompareYear] = useState(2024);
  const [activeTab, setActiveTab] = useState<CompareTab>("year");
  const [tablesOpen, setTablesOpen] = useState<Record<string, boolean>>({});
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const regionSelectId = useId();
  const variablesQuery = useQuery({ queryKey: ["variables"], queryFn: getVariables });
  const areaIndicatorsQuery = useQuery({
    queryKey: ["area-indicators", "faisalabad"],
    queryFn: () => getAreaIndicators("faisalabad"),
    enabled: !isDemoMode,
    staleTime: Infinity,
  });
  const mapsQuery = useQuery({
    queryKey: ["area-maps", "faisalabad"],
    queryFn: () => getAreaMaps("faisalabad"),
    enabled: !isDemoMode && activeTab === "maps",
    staleTime: Infinity,
  });
  useEffect(() => {
    const applyTabFromUrl = () => {
      const parsed = compareTabSchema.safeParse(new URLSearchParams(window.location.search).get("tab"));
      setActiveTab(parsed.success ? parsed.data : "year");
    };
    applyTabFromUrl();
    window.addEventListener("popstate", applyTabFromUrl);
    return () => window.removeEventListener("popstate", applyTabFromUrl);
  }, []);

  function selectTab(tab: CompareTab): void {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(window.history.state, "", url);
    if (tab === "regions") {
      requestCoverageDialog("no-data", undefined, messages.compareRegionsUnavailable);
    }
  }
  const regionsQuery = useQuery({ queryKey: ["regions"], queryFn: getRegions });
  const variableData = variablesQuery.data ?? [];
  const selectedVariableData = variableData.find((item) => item.id === variable);
  const selectedCompareVariable = variableData.find(
    (item) => item.id === selectedVariables[0],
  ) ?? selectedVariableData;
  const selectedVariableUnits = selectedVariables
    .map((id) => variableData.find((item) => item.id === id)?.unit)
    .filter((unit): unit is string => unit !== undefined);
  const sameUnits =
    mode === "variables" &&
    selectedVariables.length === 2 &&
    selectedVariableUnits.length === 2 &&
    selectedVariableUnits[0] === selectedVariableUnits[1];
  const items = useComparisonItems(
    mode,
    selectedRegions,
    selectedVariables,
    variable,
    region,
    language,
  );
  const canCompare =
    items.length >= 2 &&
    (mode === "regions" ? items.length <= 4 : items.length === 2 && !sameUnits) &&
    !variablesQuery.isPending &&
    !regionsQuery.isPending &&
    items.every(
      (item) =>
        variableData.some((candidate) => candidate.id === item.variable) &&
        regionsQuery.data?.features.some((feature) => feature.id === item.region),
    );
  const trendQueries = useQueries({
    queries: canCompare
      ? items.map((item) => ({
          queryKey: ["trend", item.variable, item.region, yearRange[0], yearRange[1], language],
          queryFn: () =>
            getTrend({
              variable: item.variable,
              region: item.region,
              start: yearRange[0],
              end: yearRange[1],
              lang: language,
            }),
          staleTime: 60_000,
        }))
      : [],
  });
  const seriesQueries = useQueries({
    queries: canCompare
      ? items.map((item) => ({
          queryKey: [
            "timeseries",
            item.variable,
            item.region,
            yearRange[0],
            yearRange[1],
            "monthly",
          ],
          queryFn: () =>
            getTimeSeries({
              variable: item.variable,
              region: item.region,
              start: yearRange[0],
              end: yearRange[1],
              resolution: "monthly",
            }),
          staleTime: 60_000,
        }))
      : [],
  });
  const realIndicatorIds = [
    "land_surface_temperature",
    "precipitation",
    "vegetation_index",
  ] as const satisfies readonly VariableId[];
  const queryResults = [...trendQueries, ...seriesQueries];
  const failedQueries = queryResults.filter((query) => query.isError && !query.data);
  const loading =
    variablesQuery.isPending ||
    regionsQuery.isPending ||
    (canCompare && queryResults.some((query) => query.isPending));
  const resourceError = variablesQuery.isError || regionsQuery.isError;
  const emptySeries = seriesQueries.some((query) => query.data?.points.length === 0);
  const dataReady =
    canCompare &&
    !loading &&
    failedQueries.length === 0 &&
    !emptySeries &&
    trendQueries.every((query) => query.data !== undefined) &&
    seriesQueries.every((query) => query.data !== undefined);
  const trendRows = dataReady
    ? items.flatMap((item, index) => {
        const trend = trendQueries[index]?.data;
        const variableInfo = variableData.find((candidate) => candidate.id === item.variable);
        return trend && variableInfo
          ? [{ item, trend, variableInfo }]
          : [];
      })
    : [];
  const exportSeries: ExportSeries[] = dataReady
    ? items.flatMap((item, index) => {
        const data = seriesQueries[index]?.data;
        const variableInfo = variableData.find((candidate) => candidate.id === item.variable);
        return data && variableInfo
          ? [{ label: item.label, unit: data.unit, points: data.points }]
          : [];
      })
    : [];
  const variableLabels = Array.from(
    new Set(items.map((item) => getVariableLabel(item.variable, language))),
  );
  const regionLabels = Array.from(new Set(items.map((item) => getRegionLabel(item.region, language))));
  const unitLabels = Array.from(new Set(exportSeries.map((item) => item.unit)));
  const sourceLabels = Array.from(
    new Set(
      items
        .map((item) => variableData.find((candidate) => candidate.id === item.variable)?.source)
        .filter((source): source is string => source !== undefined),
    ),
  );
  const chartTitle =
    mode === "regions"
      ? messages.compareRegionChartTitle.replace(
          "{variable}",
          getVariableLabel(variable, language),
        )
      : messages.compareVariableChartTitle.replace(
          "{region}",
          getRegionLabel(region, language),
        );
  const compareFileName = `compare-${mode}-${items.map((item) => item.key.split(":")[1]).join("-")}-${yearRange[0]}-${yearRange[1]}`;

  if (!isDemoMode) {
    const previousYear = compareYear - 1;
    const areaLabel = messages.areaFaisalabad;
    const status = areaIndicatorsQuery.data?.meta.status ?? "draft";
    const statusLabel = status === "verified" ? messages.verifiedDataBadge : messages.draftDataBadge;
    const rows = (areaIndicatorsQuery.data?.indicators ?? [])
      .filter((indicator) => (realIndicatorIds as readonly string[]).includes(indicator.id))
      .map((indicator): ComparisonExportRow => {
        const previous = indicator.series.find((point) => point.year === previousYear)?.value ?? null;
        const current = indicator.series.find((point) => point.year === compareYear)?.value ?? null;
        const difference = previous !== null && current !== null ? current - previous : null;
        return {
          area: areaLabel,
          indicator: indicator.name,
          previousYear,
          previousValue: previous,
          year: compareYear,
          value: current,
          difference,
          percentDifference: difference !== null && previous !== null && previous !== 0 ? (difference / previous) * 100 : null,
          unit: indicator.unit,
          source: indicator.source,
          status: statusLabel,
        };
      });
    const annualExportSeries: ExportSeries[] = (areaIndicatorsQuery.data?.indicators ?? [])
      .filter((indicator) => (realIndicatorIds as readonly string[]).includes(indicator.id))
      .map((indicator) => ({
        label: indicator.name,
        unit: indicator.unit,
        resolution: "yearly" as const,
        points: indicator.series.map((point) => ({
          date: `${point.year}-01-01`,
          value: point.value,
          valid_months: point.valid_months,
        })),
      }));
    const currentTabSeries = activeTab === "year" ? [] : annualExportSeries;

    return (
      <main className="compare-page">
        <header className="compare-heading">
          <div>
            <span className="eyebrow">{messages.areaFaisalabad}</span>
            <h1>{messages.compareTitle}</h1>
            <p>{messages.compareYearDescription}</p>
          </div>
          <div className="compare-heading-actions">
            <LiveNowCard />
            <span className={`data-status-badge is-${status}`}><span className="data-status-dot" aria-hidden="true" />{statusLabel}</span>
            <ExportMenu
              metadata={{
              fileName: `faisalabad_compare_${previousYear}-vs-${compareYear}_${status}`,
              title: messages.compareTitle,
              variableLabel: messages.compareIndicators,
              regionLabel: "Punjab",
              areaLabel,
              unitLabel: messages.compareMixedUnits,
              yearRangeLabel: `${previousYear}–${compareYear}`,
              source: areaIndicatorsQuery.data?.indicators[0]?.source ?? messages.exportSourceUnavailable,
              demoLabel: messages.exportSyntheticCredit,
              statusLabel,
              }}
              series={currentTabSeries}
              comparisonRows={activeTab === "year" ? rows : undefined}
              exportMode={activeTab}
              disabledReason={activeTab === "regions" ? "Region comparison is not available yet." : undefined}
              mapData={activeTab === "maps" ? mapsQuery.data : undefined}
              imageSrc={
                activeTab === "maps" && mapsQuery.data
                  ? `/data/areas/faisalabad/maps/${mapsQuery.data.images.lst_2024.file}`
                  : undefined
              }
            />
          </div>
        </header>
        <nav className="compare-tabs" role="tablist" aria-label="Compare views">
          {compareTabs.map((tab) => (
            <button
              key={tab.id}
              id={`compare-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`compare-tabpanel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => selectTab(tab.id)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                event.preventDefault();
                const index = compareTabs.findIndex((item) => item.id === tab.id);
                const nextIndex = event.key === "ArrowRight"
                  ? (index + 1) % compareTabs.length
                  : (index - 1 + compareTabs.length) % compareTabs.length;
                selectTab(compareTabs[nextIndex].id);
                document.getElementById(`compare-tab-${compareTabs[nextIndex].id}`)?.focus();
              }}
            >
              {tab.id === "year"
                ? messages.compareTabYear
                : tab.id === "indicators"
                  ? messages.compareTabIndicators
                  : tab.id === "maps"
                    ? messages.compareTabMaps
                    : messages.compareTabRegions}
            </button>
          ))}
        </nav>
        {activeTab === "indicators" && (
          <section id="compare-tabpanel-indicators" role="tabpanel" aria-labelledby="compare-tab-indicators">
            <IndicatorOverTimeCharts
              indicators={areaIndicatorsQuery.data?.indicators.filter((indicator) => (realIndicatorIds as readonly string[]).includes(indicator.id)) ?? []}
              previousYear={previousYear}
              selectedYear={compareYear}
            />
            <p className="compare-exploratory-note">{messages.compareExploratoryNote}</p>
          </section>
        )}
        {activeTab === "maps" && (
          <section id="compare-tabpanel-maps" role="tabpanel" aria-labelledby="compare-tab-maps">
            {mapsQuery.isPending ? (
              <div className="compare-selection-skeleton" role="status" aria-label="Loading maps"><div className="skeleton skeleton-block" /></div>
            ) : mapsQuery.isError ? (
              <p className="compare-state-card" role="status">{messages.compareMapsProgress}</p>
            ) : (
              <FaisalabadMapsView maps={mapsQuery.data} statusLabel={statusLabel} />
            )}
          </section>
        )}
        {activeTab === "regions" && (
          <section id="compare-tabpanel-regions" role="tabpanel" aria-labelledby="compare-tab-regions">
            <div className="compare-locked-card">
              <Lock aria-hidden="true" />
              <h2>Region comparison is not available yet</h2>
              <p>{messages.compareRegionsUnavailable}</p>
              <div>
                <button className="primary-button" type="button" onClick={() => selectTab("year")}>Compare years</button>
                <button className="control-button" type="button" onClick={() => selectTab("indicators")}>View indicators over time</button>
              </div>
            </div>
          </section>
        )}
        {activeTab === "year" && (
        <section id="compare-tabpanel-year" role="tabpanel" aria-labelledby="compare-tab-year">
        <section className="compare-toolbar" aria-label={messages.compareYearSelector}>
          <div className="compare-year-controls">
            <button type="button" aria-label={messages.comparePreviousYear} onClick={() => setCompareYear((year) => Math.max(2002, year - 1))} disabled={compareYear === 2002}>
              <ChevronLeft aria-hidden="true" />
            </button>
            <label>
              <span>{messages.compareYearSelector}</span>
              <select value={compareYear} onChange={(event) => setCompareYear(Number(event.currentTarget.value))}>
                {Array.from({ length: 23 }, (_, index) => 2002 + index).map((year) => (
                  <option key={year} value={year}>{year - 1} vs {year}</option>
                ))}
              </select>
            </label>
            <button type="button" aria-label={messages.compareNextYear} onClick={() => setCompareYear((year) => Math.min(2024, year + 1))} disabled={compareYear === 2024}>
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
          <button className="compare-add-region" type="button" onClick={() => requestCoverageDialog("no-data", undefined, messages.compareRegionsUnavailable)}>
            <Plus aria-hidden="true" /> {messages.compareAddRegion}
          </button>
        </section>
        {!hydrated || areaIndicatorsQuery.isPending ? (
          <div className="compare-selection-skeleton" role="status" aria-label={messages.trendLoading}>
            <div className="skeleton skeleton-line" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line-short" />
          </div>
        ) : areaIndicatorsQuery.isError ? (
          <div className="trend-error-state" role="alert"><p>{messages.compareError}</p><button type="button" onClick={() => void areaIndicatorsQuery.refetch()}>{messages.compareRetry}</button></div>
        ) : (
          <section className="area-small-multiples compare-year-cards" aria-label={messages.compareIndicators}>
            {rows.map((row) => {
              const indicator = areaIndicatorsQuery.data?.indicators.find((item) => item.name === row.indicator);
              return (
                <article className="area-small-multiple-card compare-year-card" key={row.indicator}>
                  {(() => {
                    const indicatorId = indicator?.id;
                    const Icon = indicatorId ? indicatorIcon(indicatorId) : Leaf;
                    const isOpen = Boolean(tablesOpen[row.indicator]);
                    const direction = row.difference === null ? "no_change" : row.difference > 0 ? "increasing" : row.difference < 0 ? "decreasing" : "no_change";
                    const DirectionIcon = direction === "increasing" ? ArrowUp : direction === "decreasing" ? ArrowDown : ArrowRight;
                    const directionLabel = direction === "increasing" ? messages.trendIncreasing : direction === "decreasing" ? messages.trendDecreasing : messages.trendNoChange;
                    return (
                      <>
                  <div className="area-small-multiple-heading"><div className="compare-indicator-title"><Icon aria-hidden="true" /><h2>{row.indicator}</h2></div><span className={`data-status-badge is-${status}`}>{statusLabel}</span></div>
                  <div className="compare-value-grid">
                    <div><span>{previousYear}</span><strong><bdi dir="ltr">{formatIndicatorValue(indicatorId, row.previousValue)}</bdi></strong><small>{indicatorId === "vegetation_index" ? "index (no unit)" : row.unit}</small></div>
                    <div><span>{compareYear}</span><strong><bdi dir="ltr">{formatIndicatorValue(indicatorId, row.value)}</bdi></strong><small>{indicatorId === "vegetation_index" ? "index (no unit)" : row.unit}</small></div>
                  </div>
                  <div className="compare-difference" data-direction={direction}>
                    <DirectionIcon aria-hidden="true" /><strong>{directionLabel}</strong>
                    <span>{messages.compareDifference}: <bdi dir="ltr">{formatIndicatorValue(indicatorId, row.difference)}</bdi> {indicatorId === "vegetation_index" ? "" : row.unit}</span>
                    <span>{messages.comparePercentDifference}: <bdi dir="ltr">{row.percentDifference === null ? "—" : row.percentDifference.toFixed(1)}%</bdi></span>
                  </div>
                  <YearComparisonBarChart title={row.indicator} unit={row.unit} previousYear={previousYear} previousValue={row.previousValue} year={compareYear} value={row.value} />
                  <p className="compare-year-sentence">
                    {messages.compareYearSentence
                      .replace("{indicator}", row.indicator)
                      .replace("{previousYear}", String(previousYear))
                      .replace("{previous}", `${formatNumber(row.previousValue)} ${row.unit}`)
                      .replace("{year}", String(compareYear))
                      .replace("{current}", `${formatNumber(row.value)} ${row.unit}`)
                      .replace("{difference}", `${formatIndicatorValue(indicatorId, row.difference)} ${row.unit}`)}
                  </p>
                  <button className="compare-table-toggle" type="button" aria-expanded={isOpen} onClick={() => setTablesOpen((open) => ({ ...open, [row.indicator]: !isOpen }))}><Table2 aria-hidden="true" /> {messages.compareViewTable}</button>
                  {isOpen && <div className="compare-year-table-wrap"><table className="compare-year-table"><caption>{messages.compareDifferenceHelper}</caption><thead><tr><th>{messages.compareYearColumn}</th><th>{messages.compareValueColumn}</th><th>{messages.compareUnitColumn}</th><th>{messages.compareSourceColumn}</th></tr></thead><tbody><tr><th>{previousYear}</th><td><bdi dir="ltr">{formatIndicatorValue(indicatorId, row.previousValue)}</bdi></td><td>{row.unit}</td><td>{indicator?.source ?? "—"}</td></tr><tr><th>{compareYear}</th><td><bdi dir="ltr">{formatIndicatorValue(indicatorId, row.value)}</bdi></td><td>{row.unit}</td><td>{indicator?.source ?? "—"}</td></tr></tbody></table></div>}
                  {indicator?.description && <p className="compare-axis-note">{indicator.description}</p>}
                      </>
                    );
                  })()}
                </article>
              );
            })}
          </section>
        )}
        </section>
        )}
      </main>
    );
  }

  function toggleRegion(regionId: RegionId, checked: boolean) {
    if (checked && selectedRegions.length < 4) {
      setRegions([...selectedRegions, regionId]);
    } else {
      setRegions(selectedRegions.filter((item) => item !== regionId));
    }
  }

  function toggleVariable(variableId: VariableId, checked: boolean) {
    if (checked) {
      const next = variableData.find((item) => item.id === variableId);
      const current = variableData.find((item) => item.id === selectedVariables[0]);
      if (
        selectedVariables.length < 2 &&
        (!current || !next || current.unit !== next.unit)
      ) {
        setVariables([...selectedVariables, variableId]);
      }
    } else {
      setVariables(selectedVariables.filter((item) => item !== variableId));
    }
  }

  async function retryQueries() {
    await Promise.all([
      ...trendQueries.map((query) => query.refetch()),
      ...seriesQueries.map((query) => query.refetch()),
    ]);
  }

  async function retryResources() {
    await Promise.all([variablesQuery.refetch(), regionsQuery.refetch()]);
  }

  function handleModeKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const forwardKey = language === "ur" ? "ArrowLeft" : "ArrowRight";
    if (event.key !== forwardKey && event.key !== (forwardKey === "ArrowLeft" ? "ArrowRight" : "ArrowLeft")) {
      return;
    }
    event.preventDefault();
    const nextMode = mode === "regions" ? "variables" : "regions";
    setMode(nextMode);
    document.getElementById(`compare-mode-${nextMode}`)?.focus();
  }

  return (
    <main className="compare-page">
      <header className="compare-heading">
        <div>
          <span className="eyebrow">{messages.country}</span>
          <h1>{messages.compareTitle}</h1>
          <p>{messages.compareDescription}</p>
        </div>
        <ExportMenu
          metadata={{
            fileName: compareFileName,
            title: chartTitle,
            variableLabel: variableLabels.join(", "),
            regionLabel: regionLabels.join(", "),
            unitLabel: unitLabels.join(", "),
            yearRangeLabel: `${yearRange[0]}–${yearRange[1]}`,
            source: sourceLabels.join("; ") || messages.exportSourceUnavailable,
            demoLabel: messages.exportSyntheticCredit,
          }}
          series={exportSeries}
        />
      </header>

      <div
        className="compare-mode-tabs"
        role="tablist"
        aria-label={messages.compareModes}
        onKeyDown={handleModeKeyDown}
      >
        <button
          id="compare-mode-regions"
          type="button"
          role="tab"
          aria-selected={mode === "regions"}
          aria-controls="compare-panel"
          tabIndex={mode === "regions" ? 0 : -1}
          onClick={() => setMode("regions")}
        >
          {messages.compareRegionsMode}
        </button>
        <button
          id="compare-mode-variables"
          type="button"
          role="tab"
          aria-selected={mode === "variables"}
          aria-controls="compare-panel"
          tabIndex={mode === "variables" ? 0 : -1}
          onClick={() => setMode("variables")}
        >
          {messages.compareVariablesMode}
        </button>
      </div>

      <button
        className="compare-mobile-toggle"
        type="button"
        aria-expanded={selectorsOpen}
        aria-controls="compare-selectors"
        onClick={() => setSelectorsOpen((open) => !open)}
      >
        {selectorsOpen ? messages.compareCloseFilters : messages.compareFilters}
      </button>

      <div className="compare-layout">
        <aside
          className={`compare-selectors${selectorsOpen ? " is-open" : ""}`}
          id="compare-selectors"
          aria-label={messages.compareFilters}
        >
          <div className="compare-selectors-heading">
            <h2>{messages.compareFilters}</h2>
            <button type="button" onClick={() => setSelectorsOpen(false)}>
              {messages.compareCloseFilters}
            </button>
          </div>

          {mode === "regions" ? (
            <>
              {variablesQuery.isError ? (
                <div className="compare-resource-error" role="alert">
                  <p>{messages.filterVariablesError}</p>
                  <button type="button" onClick={() => void variablesQuery.refetch()}>
                    {messages.compareRetry}
                  </button>
                </div>
              ) : (
                <VariableSelect />
              )}
              <fieldset className="compare-choice-group" disabled={regionsQuery.isPending || regionsQuery.isError}>
                <legend>{messages.compareSelectRegions}</legend>
                <p>{messages.compareRegionSelectionHelp}</p>
                {regionsQuery.isPending ? (
                  <SelectionSkeleton label={messages.filterLoadingRegions} />
                ) : regionsQuery.isError ? (
                  <div className="compare-resource-error" role="alert">
                    <p>{messages.filterRegionsError}</p>
                    <button type="button" onClick={() => void regionsQuery.refetch()}>
                      {messages.compareRetry}
                    </button>
                  </div>
                ) : !regionsQuery.data?.features.length ? (
                  <p className="map-empty-state">{messages.filterRegionsEmpty}</p>
                ) : (
                  <div className="compare-choice-list">
                    {regionsQuery.data.features.map((feature) => {
                      const regionId = feature.id;
                      const checked = selectedRegions.includes(regionId);
                      return (
                        <label key={regionId}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!checked && selectedRegions.length >= 4}
                            onChange={(event) => toggleRegion(regionId, event.currentTarget.checked)}
                          />
                          <span>{getRegionLabel(regionId, language)}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </fieldset>
              <YearRangeSlider
                variable={selectedVariableData}
                loading={variablesQuery.isPending}
                error={variablesQuery.error?.message}
              />
            </>
          ) : (
            <>
              {regionsQuery.isPending ? (
                <SelectionSkeleton label={messages.filterLoadingRegions} />
              ) : regionsQuery.isError ? (
                <div className="compare-resource-error" role="alert">
                  <p>{messages.filterRegionsError}</p>
                  <button type="button" onClick={() => void regionsQuery.refetch()}>
                    {messages.compareRetry}
                  </button>
                </div>
              ) : !regionsQuery.data?.features.length ? (
                <p className="map-empty-state">{messages.filterRegionsEmpty}</p>
              ) : (
                <label className="map-field" htmlFor={regionSelectId}>
                  <span>{messages.mapRegionList}</span>
                  <select
                    id={regionSelectId}
                    value={region}
                    dir="ltr"
                    onChange={(event) => {
                      const result = regionIdSchema.safeParse(event.currentTarget.value);
                      if (result.success) {
                        setRegion(result.data);
                      }
                    }}
                  >
                    {regionsQuery.data.features.map((feature) => (
                      <option key={feature.id} value={feature.id}>
                        {getRegionLabel(feature.id, language)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <fieldset className="compare-choice-group" disabled={variablesQuery.isPending || variablesQuery.isError}>
                <legend>{messages.compareSelectVariables}</legend>
                <p>{messages.compareVariableSelectionHelp}</p>
                {variablesQuery.isPending ? (
                  <SelectionSkeleton label={messages.filterLoadingVariables} />
                ) : variablesQuery.isError ? (
                  <div className="compare-resource-error" role="alert">
                    <p>{messages.filterVariablesError}</p>
                    <button type="button" onClick={() => void variablesQuery.refetch()}>
                      {messages.compareRetry}
                    </button>
                  </div>
                ) : !variableData.length ? (
                  <p className="map-empty-state">{messages.filterVariablesEmpty}</p>
                ) : (
                  <div className="compare-choice-list">
                    {variableData.map((item) => {
                      const checked = selectedVariables.includes(item.id);
                      const selectedUnit = variableData.find(
                        (candidate) => candidate.id === selectedVariables[0],
                      )?.unit;
                      const sameUnitUnavailable =
                        selectedVariables.length === 1 &&
                        !checked &&
                        selectedUnit === item.unit;
                      return (
                        <label key={item.id}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={
                              (!checked && selectedVariables.length >= 2) ||
                              sameUnitUnavailable
                            }
                            onChange={(event) => toggleVariable(item.id, event.currentTarget.checked)}
                          />
                          <span>{getVariableLabel(item.id, language)}</span>
                          <bdi dir="ltr">{item.unit}</bdi>
                        </label>
                      );
                    })}
                  </div>
                )}
              </fieldset>
              <YearRangeSlider
                variable={selectedCompareVariable}
                loading={variablesQuery.isPending}
                error={variablesQuery.error?.message}
              />
            </>
          )}
          {mode === "variables" && sameUnits && (
            <p className="compare-selection-error" role="alert">
              {messages.compareDifferentUnits}
            </p>
          )}
        </aside>

        <section
          className="compare-results"
          id="compare-panel"
          role="tabpanel"
          aria-labelledby={`compare-mode-${mode}`}
        >
          <h2>{messages.compareResults}</h2>
          {items.length < 2 ? (
            <p className="compare-state-card" role="status">{messages.compareSelectAtLeastTwo}</p>
          ) : mode === "variables" && sameUnits ? (
            <p className="compare-state-card" role="status">{messages.compareDifferentUnits}</p>
          ) : loading ? (
            <div className="compare-loading" role="status" aria-label={messages.compareLoading}>
              <div className="skeleton skeleton-heading" />
              <div className="skeleton skeleton-block" />
              <div className="skeleton skeleton-line" />
            </div>
          ) : resourceError ? (
            <div className="compare-state-card compare-error" role="alert">
              <p>{messages.compareError}</p>
              <button type="button" onClick={() => void retryResources()}>
                {messages.compareRetry}
              </button>
            </div>
          ) : failedQueries.length > 0 ? (
            <div className="compare-state-card compare-error" role="alert">
              <p>{messages.compareError}</p>
              <button type="button" onClick={() => void retryQueries()}>
                {messages.compareRetry}
              </button>
            </div>
          ) : emptySeries || !dataReady ? (
            <p className="compare-state-card" role="status">{messages.compareEmpty}</p>
          ) : (
            <>
              <ComponentErrorBoundary
                title={messages.componentErrorTitle}
                description={messages.componentErrorDescription}
                retryLabel={messages.errorRetry}
              >
                <CompareLineChart
                  mode={mode}
                  series={exportSeries}
                  title={chartTitle}
                  start={yearRange[0]}
                  end={yearRange[1]}
                />
              </ComponentErrorBoundary>
              <div className="compare-table-wrap" role="region" aria-label={messages.compareDifferenceHelper} tabIndex={0}>
                <table className="compare-table">
                  <caption>{messages.compareDifferenceHelper}</caption>
                  <thead>
                    <tr>
                      <th scope="col">
                        {mode === "regions" ? messages.compareRegion : messages.compareVariable}
                      </th>
                      <th scope="col">{messages.compareSlope}</th>
                      <th scope="col">{messages.compareUnit}</th>
                      <th scope="col">{messages.compareTotalChange}</th>
                      <th scope="col">{messages.comparePercentChange}</th>
                      <th scope="col">{messages.comparePValue}</th>
                      <th scope="col">{messages.compareSignificance}</th>
                      <th scope="col">{messages.compareTakeaway}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendRows.map(({ item, trend, variableInfo }) => (
                      <tr key={item.key}>
                        <th scope="row">{item.label}</th>
                        <td><bdi dir="ltr">{formatNumber(trend.slope)}</bdi></td>
                        <td><bdi dir="ltr">{trend.unit ?? variableInfo.unit}</bdi></td>
                        <td>
                          <bdi dir="ltr">
                            {formatNumber(trend.changeTotal)} {variableInfo.unit}
                          </bdi>
                        </td>
                        <td><bdi dir="ltr">{formatNumber(trend.changePercent)}%</bdi></td>
                        <td><bdi dir="ltr">{formatNumber(trend.pValue)}</bdi></td>
                        <td>
                          {typeof trend.significant === "boolean" ? (
                            <SignificanceBadge
                              compact
                              significant={trend.significant}
                              pValue={trend.pValue}
                              confidence={trend.confidence}
                            />
                          ) : (
                            messages.trendStatisticsUnavailable
                          )}
                        </td>
                        <td>
                          <TrendTakeaway
                            trend={trend}
                            variable={item.variable}
                            variableUnit={variableInfo.unit}
                            start={yearRange[0]}
                            end={yearRange[1]}
                            label={item.label}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
