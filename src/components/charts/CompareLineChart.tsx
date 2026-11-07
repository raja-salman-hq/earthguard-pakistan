"use client";

import { useId, useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";
import type { CompareMode } from "@/types/api";
import type { ExportSeries } from "@/lib/utils/data-export";

type CompareLineChartProps = {
  mode: CompareMode;
  series: ExportSeries[];
  title: string;
  start: number;
  end: number;
};

const lineStyles = [undefined, "6 4", "2 3", "8 3 2 3"];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en", { maximumSignificantDigits: 4 }).format(value);
}

function formatDate(value: string, language: "en" | "ur"): string {
  return new Intl.DateTimeFormat(language === "ur" ? "ur-u-nu-latn" : "en", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function CompareLineChart({
  mode,
  series,
  title,
  start,
  end,
}: CompareLineChartProps) {
  const messages = useMessages();
  const language = useUiStore((state) => state.language);
  const summaryId = useId();
  const data = useMemo(() => {
    const valuesByDate = new Map<string, Record<string, string | number>>();
    for (const [index, item] of series.entries()) {
      for (const point of item.points) {
        const values = valuesByDate.get(point.date) ?? { date: point.date };
        values[`series-${index}`] = point.value;
        valuesByDate.set(point.date, values);
      }
    }

    return Array.from(valuesByDate.values()).sort((left, right) =>
      String(left.date).localeCompare(String(right.date)),
    );
  }, [series]);
  const accessibleSummary = messages.compareChartSummary
    .replace("{series}", series.map((item) => item.label).join(", "))
    .replace("{start}", String(start))
    .replace("{end}", String(end));
  const axisLabel = (index: number) => `${series[index]?.label} (${series[index]?.unit})`;

  return (
    <section className="compare-chart" aria-labelledby={`${summaryId}-title`}>
      <h2 id={`${summaryId}-title`}>{title}</h2>
      {mode === "variables" ? (
        <p className="compare-axis-note">
          {messages.compareDualAxisNote
            .replace("{left}", axisLabel(0))
            .replace("{right}", axisLabel(1))}
        </p>
      ) : (
        <p className="compare-axis-note">
          {messages.compareSingleAxisNote.replace("{unit}", series[0]?.unit ?? "")}
        </p>
      )}
      <p className="sr-only" id={summaryId}>{accessibleSummary}</p>
      <ul className="compare-chart-legend" aria-label={messages.compareSeriesLegend}>
        {series.map((item, index) => (
          <li key={`${item.label}-${item.unit}`}>
            <span
              className="compare-series-swatch"
              data-series-style={index % lineStyles.length}
              style={{ borderBlockStartColor: `var(--chart-series-${index + 1})` }}
              aria-hidden="true"
            />
            <span>{item.label}</span>
            <bdi dir="ltr">({item.unit})</bdi>
          </li>
        ))}
      </ul>
      <div
        className="trend-chart-plot compare-chart-plot"
        data-export-chart
        role="img"
        aria-labelledby={`${summaryId}-title`}
        aria-describedby={summaryId}
        dir="ltr"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 12, bottom: 24, left: 12 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) => formatDate(value, language)}
              minTickGap={24}
              tick={{ fill: "var(--muted)", fontSize: 10, direction: language === "ur" ? "rtl" : "ltr" }}
              label={{
                value: messages.trendAxisDate,
                position: "insideBottom",
                offset: -14,
                fill: "var(--muted)",
              }}
            />
            <YAxis
              yAxisId="left"
              width={58}
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              tickFormatter={(value: number) => formatNumber(value)}
              label={{
                value:
                  mode === "variables"
                    ? axisLabel(0)
                    : messages.trendAxisValue.replace("{unit}", series[0]?.unit ?? ""),
                angle: -90,
                position: "insideLeft",
                fill: "var(--muted)",
              }}
            />
            {mode === "variables" && (
              <YAxis
                yAxisId="right"
                orientation="right"
                width={58}
                tick={{ fill: "var(--muted)", fontSize: 10 }}
                tickFormatter={(value: number) => formatNumber(value)}
                label={{
                  value: axisLabel(1),
                  angle: 90,
                  position: "insideRight",
                  fill: "var(--muted)",
                }}
              />
            )}
            <Tooltip
              labelFormatter={(value) => formatDate(String(value), language)}
              formatter={(value, name) => {
                const item = series.find((candidate) => candidate.label === String(name));
                return [`${formatNumber(Number(value))} ${item?.unit ?? ""}`, String(name)];
              }}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                color: "var(--text)",
              }}
            />
            {series.map((item, index) => (
              <Line
                key={`${item.label}-${item.unit}`}
                type="monotone"
                dataKey={`series-${index}`}
                name={item.label}
                yAxisId={mode === "variables" && index === 1 ? "right" : "left"}
                stroke={`var(--chart-series-${index + 1})`}
                strokeWidth={2}
                strokeDasharray={lineStyles[index % lineStyles.length]}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
