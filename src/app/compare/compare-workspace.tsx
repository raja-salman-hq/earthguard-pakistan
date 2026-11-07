"use client";

import dynamic from "next/dynamic";
import { useId, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ExportMenu } from "@/components/layout/ExportMenu";
import { VariableSelect } from "@/components/filters/VariableSelect";
import { YearRangeSlider } from "@/components/filters/YearRangeSlider";
import { SignificanceBadge } from "@/components/insights/SignificanceBadge";
import { TrendTakeaway } from "@/components/insights/TrendTakeaway";
import { useMessages } from "@/hooks/use-messages";
import { getRegions, getTimeSeries, getTrend, getVariables } from "@/lib/api";
import { getRegionLabel, getVariableLabel } from "@/lib/i18n";
import { useUiStore } from "@/store/ui-store";
import type { ExportSeries } from "@/lib/utils/data-export";
import { regionIdSchema } from "@/types/api";
import type { CompareMode, RegionId, VariableId } from "@/types/api";

const CompareLineChart = dynamic(
  () => import("@/components/charts/CompareLineChart").then((module) => module.CompareLineChart),
  {
    ssr: false,
    loading: () => <div className="trend-chart-loading" role="status" />,
  },
);

type ComparisonItem = {
  key: string;
  region: RegionId;
  variable: VariableId;
  label: string;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en", { maximumSignificantDigits: 4 }).format(value);
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
  const regionSelectId = useId();
  const variablesQuery = useQuery({ queryKey: ["variables"], queryFn: getVariables });
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
          queryKey: ["trend", item.variable, item.region, yearRange[0], yearRange[1]],
          queryFn: () =>
            getTrend({
              variable: item.variable,
              region: item.region,
              start: yearRange[0],
              end: yearRange[1],
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
              <CompareLineChart
                mode={mode}
                series={exportSeries}
                title={chartTitle}
                start={yearRange[0]}
                end={yearRange[1]}
              />
              <div className="compare-table-wrap" role="region" aria-label={messages.compareTableCaption} tabIndex={0}>
                <table className="compare-table">
                  <caption>{messages.compareTableCaption}</caption>
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
                        <td><bdi dir="ltr">{trend.unit}</bdi></td>
                        <td>
                          <bdi dir="ltr">
                            {formatNumber(trend.changeTotal)} {variableInfo.unit}
                          </bdi>
                        </td>
                        <td><bdi dir="ltr">{formatNumber(trend.changePercent)}%</bdi></td>
                        <td><bdi dir="ltr">{formatNumber(trend.pValue)}</bdi></td>
                        <td>
                          <SignificanceBadge
                            compact
                            significant={trend.significant}
                            pValue={trend.pValue}
                            confidence={trend.confidence}
                          />
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
