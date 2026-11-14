"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getTimeSeries } from "@/lib/api";
import { isDemoMode } from "@/lib/api/client";
import { NoDataError } from "@/lib/api/static-data";
import { NoDataNotice } from "@/components/ui/no-data-notice";
import { useMessages } from "@/hooks/use-messages";
import { getRegionLabel, getVariableLabel } from "@/lib/i18n";
import { useUiStore } from "@/store/ui-store";
import type { RegionId, TimeSeriesQuery, VariableId } from "@/types/api";
import type { AreaId } from "@/types/area-data";
import { useId } from "react";

export type TrendChartView = "chart" | "table";

type TrendChartProps = {
  variable: VariableId;
  region: RegionId;
  area?: AreaId | null;
  start: number;
  end: number;
  trendLine: Array<{ date: string; value: number }> | undefined;
  trendLineLoaded: boolean;
  resolution?: TimeSeriesQuery["resolution"];
  onResolutionChange?: (resolution: TimeSeriesQuery["resolution"]) => void;
  showResolutionSelector?: boolean;
  exportId?: string;
  displayMode?: TrendChartView;
  onDisplayModeChange?: (mode: TrendChartView) => void;
  expanded?: boolean;
  onToggleExpanded?: () => void;
};

type ChartRow = {
  date: string;
  value?: number | null;
  trendValue?: number;
  valid_months?: number | null;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en", { maximumSignificantDigits: 4 }).format(value);
}

function formatDate(
  value: string,
  resolution: TimeSeriesQuery["resolution"],
  language: "en" | "ur",
): string {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat(language === "ur" ? "ur-u-nu-latn" : "en", {
    month: resolution === "monthly" ? "short" : undefined,
    year: resolution === "monthly" ? "2-digit" : "numeric",
    timeZone: "UTC",
  }).format(date);
}

function interpolateTemplate(template: string, values: Record<string, ReactNode>): ReactNode[] {
  return template.split(/(\{[a-zA-Z]+\})/g).map((part, index) => {
    const key = part.slice(1, -1);
    return part.startsWith("{") && key in values ? (
      <span key={`${key}-${index}`}>{values[key]}</span>
    ) : (
      part
    );
  });
}

export function TrendChart({
  variable,
  region,
  area,
  start,
  end,
  trendLine,
  trendLineLoaded,
  resolution: controlledResolution,
  onResolutionChange,
  showResolutionSelector = true,
  exportId,
  displayMode,
  onDisplayModeChange,
  expanded = false,
  onToggleExpanded,
}: TrendChartProps) {
  const messages = useMessages();
  const language = useUiStore((state) => state.language);
  const currentYear = useUiStore((state) => state.currentYear);
  const headingId = useId();
  const descriptionId = useId();
  const [localResolution, setLocalResolution] = useState<TimeSeriesQuery["resolution"]>(
    isDemoMode ? "monthly" : "yearly",
  );
  const [localDisplayMode, setLocalDisplayMode] = useState<TrendChartView>("chart");
  const resolution = controlledResolution ?? localResolution;
  const view = displayMode ?? localDisplayMode;
  const areaLabel = area ? messages.areaFaisalabad : getRegionLabel(region, language);
  const title = messages.trendChartTitle
    .replace("{variable}", getVariableLabel(variable, language))
    .replace("{region}", areaLabel);
  const query = useQuery({
    queryKey: ["timeseries", variable, region, area, start, end, resolution],
    queryFn: () => getTimeSeries({ variable, region, area: area ?? undefined, start, end, resolution }),
    staleTime: 60_000,
    placeholderData: isDemoMode ? (previousData) => previousData : undefined,
  });
  const chartData = useMemo(() => {
    const rows = new Map<string, ChartRow>();
    for (const point of query.data?.points ?? []) {
      rows.set(point.date, {
        date: point.date,
        value: point.value,
        valid_months: point.valid_months,
      });
    }
    for (const point of trendLine ?? []) {
      const row = rows.get(point.date) ?? { date: point.date };
      row.trendValue = point.value;
      rows.set(point.date, row);
    }
    return Array.from(rows.values()).sort((left, right) => left.date.localeCompare(right.date));
  }, [query.data?.points, trendLine]);

  const availableResolutions = useMemo(
    () => query.data?.availableResolutions ?? (isDemoMode ? ["monthly", "yearly"] : ["yearly"]),
    [query.data?.availableResolutions],
  );
  const activeResolution = availableResolutions.includes(resolution) ? resolution : "yearly";

  function changeDisplayMode(mode: TrendChartView) {
    if (onDisplayModeChange) {
      onDisplayModeChange(mode);
    } else {
      setLocalDisplayMode(mode);
    }
  }

  function changeResolution(nextResolution: TimeSeriesQuery["resolution"]) {
    if (onResolutionChange) {
      onResolutionChange(nextResolution);
    } else {
      setLocalResolution(nextResolution);
    }
  }

  if (query.isPending) {
    return (
      <div className="trend-chart-loading" role="status" aria-label={messages.trendLoading}>
        <div className="skeleton skeleton-heading" />
        <div className="skeleton skeleton-block" />
      </div>
    );
  }

  if (query.isError && !query.data) {
    if (query.error instanceof NoDataError) {
      return <NoDataNotice error={query.error} />;
    }
    return (
      <div className="trend-error-state" role="alert">
        <p>{messages.trendError}</p>
        <button type="button" onClick={() => void query.refetch()}>{messages.trendRetry}</button>
      </div>
    );
  }

  if (!query.data?.points.length) {
    return <p className="map-empty-state">{messages.trendEmpty}</p>;
  }

  const observations = query.data.points;
  const selectedPoint =
    activeResolution === "yearly"
      ? observations.find((point) => point.date.slice(0, 4) === String(currentYear))
      : undefined;
  const accessibleSummary = interpolateTemplate(messages.trendAccessibleSummary, {
    variable: getVariableLabel(variable, language),
    region: areaLabel,
    count: <bdi dir="ltr">{observations.length}</bdi>,
    start: <bdi dir="ltr">{start}</bdi>,
    end: <bdi dir="ltr">{end}</bdi>,
  });
  const tableCaption = interpolateTemplate(messages.trendTableCaption, {
    variable: getVariableLabel(variable, language),
    region: areaLabel,
    start: <bdi dir="ltr">{start}</bdi>,
    end: <bdi dir="ltr">{end}</bdi>,
  });

  return (
    <section
      className="trend-chart-content"
      aria-busy={query.isFetching}
      aria-labelledby={headingId}
    >
    <div className="trend-chart-toolbar">
      <h3 id={headingId} dir="auto">{title}</h3>
        <div className="trend-chart-actions">
          {showResolutionSelector && availableResolutions.length > 1 && (
            <label className="trend-resolution-control">
              <span>{messages.trendResolution}</span>
              <select
                value={activeResolution}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  if (
                    (value === "monthly" || value === "yearly") &&
                    availableResolutions.includes(value)
                  ) {
                    changeResolution(value);
                  }
                }}
              >
                {availableResolutions.includes("monthly") && (
                  <option value="monthly">{messages.trendMonthly}</option>
                )}
                {availableResolutions.includes("yearly") && (
                  <option value="yearly">{messages.trendYearly}</option>
                )}
              </select>
            </label>
          )}
          <div className="trend-view-toggle" role="group" aria-label={messages.trendPanelTitle}>
            <button
              type="button"
              aria-pressed={view === "chart"}
              onClick={() => changeDisplayMode("chart")}
            >
              {messages.trendChartToggle}
            </button>
            <button
              type="button"
              aria-pressed={view === "table"}
              onClick={() => changeDisplayMode("table")}
            >
              {messages.trendTableToggle}
            </button>
          </div>
          {onToggleExpanded && (
            <button
              className="trend-expand-button"
              type="button"
              aria-label={expanded ? messages.trendCollapse : messages.trendExpand}
              onClick={onToggleExpanded}
            >
              {expanded ? "↙" : "⛶"}
            </button>
          )}
        </div>
      </div>
      {query.isError && (
        <p className="map-inline-error" role="status">
          {messages.trendError}{" "}
          <button type="button" onClick={() => void query.refetch()}>{messages.trendRetry}</button>
        </p>
      )}
      {trendLineLoaded && !trendLine && view === "chart" && (
        <p className="trend-line-note">{messages.trendLineUnavailable}</p>
      )}
      {!isDemoMode && selectedPoint && (
        <p className="selected-year-value" role="status">
          {messages.timelineYearValues}: <bdi dir="ltr">{currentYear}</bdi> ·{" "}
          {selectedPoint.value === null
            ? "—"
            : `${formatNumber(selectedPoint.value)} ${query.data.unit}`}
          {selectedPoint.valid_months !== null && selectedPoint.valid_months !== undefined
            ? ` · ${messages.validMonths}: ${selectedPoint.valid_months}`
            : ""}
        </p>
      )}
      {view === "table" ? (
        <div className="trend-table-wrap">
          <table className="trend-data-table">
            <caption>
              {tableCaption}
            </caption>
            <thead>
              <tr>
                <th scope="col">{messages.trendTableDate}</th>
                <th scope="col">{messages.trendTableValue} (<bdi dir="ltr">{query.data.unit}</bdi>)</th>
                {activeResolution === "yearly" && (
                  <th scope="col">{messages.validMonths}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {observations.map((point) => (
                <tr key={point.date}>
                  <th scope="row">
                    <bdi dir={language === "ur" ? "auto" : "ltr"}>
                      {formatDate(point.date, activeResolution, language)}
                    </bdi>
                  </th>
                  <td>
                    <bdi dir="ltr">
                      {point.value === null ? "—" : formatNumber(point.value)}
                    </bdi>
                  </td>
                  {activeResolution === "yearly" && (
                    <td>
                      <bdi dir="ltr">
                        {point.valid_months === null || point.valid_months === undefined
                          ? "—"
                          : point.valid_months}
                      </bdi>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <p className="sr-only" id={descriptionId}>
            {accessibleSummary}
          </p>
          <div
            className="trend-chart-plot"
            data-export-chart={exportId ?? "default"}
            role="img"
            aria-labelledby={headingId}
            aria-describedby={descriptionId}
            dir="ltr"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 22, left: 12 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string) => formatDate(value, activeResolution, language)}
                  minTickGap={24}
                  tick={{
                    fill: "var(--muted)",
                    fontSize: 10,
                    direction: language === "ur" ? "rtl" : "ltr",
                  }}
                  label={{ value: messages.trendAxisDate, position: "insideBottom", offset: -14, fill: "var(--muted)" }}
                />
                <YAxis
                  width={58}
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                  tickFormatter={(value: number) => formatNumber(value)}
                  label={{
                    value: messages.trendAxisValue.replace("{unit}", query.data.unit),
                    angle: -90,
                    position: "insideLeft",
                    fill: "var(--muted)",
                  }}
                />
                <Tooltip
                  labelFormatter={(value) => formatDate(String(value), activeResolution, language)}
                  formatter={(value, name, item) => {
                    const numberValue = typeof value === "number" ? value : Number(value);
                    const formatted =
                      Number.isFinite(numberValue)
                        ? `${formatNumber(numberValue)} ${query.data.unit}`
                        : "—";
                    const validMonths = item.payload?.valid_months;
                    return [
                      validMonths === null || validMonths === undefined
                        ? formatted
                        : `${formatted} · ${messages.validMonths}: ${validMonths}`,
                      String(name),
                    ];
                  }}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    color: "var(--text)",
                  }}
                />
                <Legend verticalAlign="top" height={28} />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={messages.trendSeriesLabel}
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{ r: 2.5, strokeWidth: 1 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                {!isDemoMode && selectedPoint && (
                  <ReferenceLine
                    x={selectedPoint.date}
                    stroke="var(--primary)"
                    strokeDasharray="4 4"
                    label={{ value: String(currentYear), fill: "var(--primary)", position: "insideTop" }}
                  />
                )}
                {trendLine && (
                  <Line
                    type="linear"
                    dataKey="trendValue"
                    name={messages.trendLineLabel}
                    stroke="var(--heat)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}
