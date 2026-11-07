"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getTimeSeries } from "@/lib/api";
import { useMessages } from "@/hooks/use-messages";
import { getRegionLabel, getVariableLabel } from "@/lib/i18n";
import { useUiStore } from "@/store/ui-store";
import type { RegionId, TimeSeriesQuery, VariableId } from "@/types/api";
import { useId } from "react";

export type TrendChartView = "chart" | "table";

type TrendChartProps = {
  variable: VariableId;
  region: RegionId;
  start: number;
  end: number;
  trendLine: Array<{ date: string; value: number }> | undefined;
  trendLineLoaded: boolean;
  displayMode?: TrendChartView;
  onDisplayModeChange?: (mode: TrendChartView) => void;
  expanded?: boolean;
  onToggleExpanded?: () => void;
};

type ChartRow = {
  date: string;
  value?: number;
  trendValue?: number;
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
  start,
  end,
  trendLine,
  trendLineLoaded,
  displayMode,
  onDisplayModeChange,
  expanded = false,
  onToggleExpanded,
}: TrendChartProps) {
  const messages = useMessages();
  const language = useUiStore((state) => state.language);
  const headingId = useId();
  const descriptionId = useId();
  const [resolution, setResolution] = useState<TimeSeriesQuery["resolution"]>("monthly");
  const [localDisplayMode, setLocalDisplayMode] = useState<TrendChartView>("chart");
  const view = displayMode ?? localDisplayMode;
  const title = messages.trendChartTitle
    .replace("{variable}", getVariableLabel(variable, language))
    .replace("{region}", getRegionLabel(region, language));
  const query = useQuery({
    queryKey: ["timeseries", variable, region, start, end, resolution],
    queryFn: () => getTimeSeries({ variable, region, start, end, resolution }),
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });
  const chartData = useMemo(() => {
    const rows = new Map<string, ChartRow>();
    for (const point of query.data?.points ?? []) {
      rows.set(point.date, { date: point.date, value: point.value });
    }
    for (const point of trendLine ?? []) {
      const row = rows.get(point.date) ?? { date: point.date };
      row.trendValue = point.value;
      rows.set(point.date, row);
    }
    return Array.from(rows.values()).sort((left, right) => left.date.localeCompare(right.date));
  }, [query.data?.points, trendLine]);

  function changeDisplayMode(mode: TrendChartView) {
    if (onDisplayModeChange) {
      onDisplayModeChange(mode);
    } else {
      setLocalDisplayMode(mode);
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
  const accessibleSummary = interpolateTemplate(messages.trendAccessibleSummary, {
    variable: getVariableLabel(variable, language),
    region: getRegionLabel(region, language),
    count: <bdi dir="ltr">{observations.length}</bdi>,
    start: <bdi dir="ltr">{start}</bdi>,
    end: <bdi dir="ltr">{end}</bdi>,
  });
  const tableCaption = interpolateTemplate(messages.trendTableCaption, {
    variable: getVariableLabel(variable, language),
    region: getRegionLabel(region, language),
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
          <label className="trend-resolution-control">
            <span>{messages.trendResolution}</span>
            <select
              value={resolution}
              onChange={(event) => {
                if (event.currentTarget.value === "monthly" || event.currentTarget.value === "yearly") {
                  setResolution(event.currentTarget.value);
                }
              }}
            >
              <option value="monthly">{messages.trendMonthly}</option>
              <option value="yearly">{messages.trendYearly}</option>
            </select>
          </label>
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
              </tr>
            </thead>
            <tbody>
              {observations.map((point) => (
                <tr key={point.date}>
                  <th scope="row">
                    <bdi dir={language === "ur" ? "auto" : "ltr"}>
                      {formatDate(point.date, resolution, language)}
                    </bdi>
                  </th>
                  <td><bdi dir="ltr">{formatNumber(point.value)}</bdi></td>
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
                  tickFormatter={(value: string) => formatDate(value, resolution, language)}
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
                  labelFormatter={(value) => formatDate(String(value), resolution, language)}
                  formatter={(value, name) => [
                    `${formatNumber(Number(value))} ${query.data.unit}`,
                    String(name),
                  ]}
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
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
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
