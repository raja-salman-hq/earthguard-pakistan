"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { IndicatorData } from "@/types/area-data";

type IndicatorOverTimeChartsProps = {
  indicators: IndicatorData[];
  previousYear: number;
  selectedYear: number;
};

const colors = ["var(--chart-series-1)", "var(--chart-series-2)", "var(--chart-series-3)"];

function formatValue(value: number | null, indicator: IndicatorData): string {
  if (value === null) return "—";
  const maximumFractionDigits =
    indicator.id === "land_surface_temperature" ? 2 : indicator.id === "vegetation_index" ? 4 : 1;
  return new Intl.NumberFormat("en", {
    minimumFractionDigits: maximumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

export function IndicatorOverTimeCharts({
  indicators,
  previousYear,
  selectedYear,
}: IndicatorOverTimeChartsProps) {
  const [tablesOpen, setTablesOpen] = useState<Record<string, boolean>>({});

  return (
    <section className="compare-over-time-grid" aria-label="Indicators over time">
      {indicators.map((indicator, index) => {
        const data = indicator.series.map((point) => ({ year: point.year, value: point.value }));
        const previousValue = data.find((point) => point.year === previousYear)?.value ?? null;
        const selectedValue = data.find((point) => point.year === selectedYear)?.value ?? null;
        const tableOpen = Boolean(tablesOpen[indicator.id]);
        const chartDescription = `${indicator.name} from ${data[0]?.year ?? previousYear} to ${data.at(-1)?.year ?? selectedYear}, measured in ${indicator.unit}. Selected years ${previousYear} and ${selectedYear} are highlighted.`;

        return (
          <article className="compare-over-time-card" key={indicator.id}>
            <header className="compare-over-time-heading">
              <div>
                <h2>{indicator.name}</h2>
                <p>{indicator.unit}</p>
              </div>
            </header>
            <p className="sr-only">{chartDescription}</p>
            <div className="compare-over-time-chart" data-export-chart role="img" aria-label={chartDescription}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 28, right: 12, bottom: 24, left: 8 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: "var(--muted)", fontSize: 10 }} />
                  <YAxis
                    width={54}
                    tick={{ fill: "var(--muted)", fontSize: 10 }}
                    tickFormatter={(value: number) => formatValue(value, indicator)}
                    label={{ value: indicator.unit, angle: -90, position: "insideLeft", fill: "var(--muted)", fontSize: 10 }}
                  />
                  <Tooltip
                    formatter={(value) => [`${formatValue(typeof value === "number" ? value : null, indicator)} ${indicator.unit}`, indicator.name]}
                    labelFormatter={(value) => `Year ${value}`}
                    contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={indicator.name}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2.5}
                    connectNulls={false}
                    dot={false}
                    isAnimationActive={false}
                  />
                  {previousValue !== null && (
                    <ReferenceDot
                      x={previousYear}
                      y={previousValue}
                      r={4}
                      fill="var(--surface)"
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      label={{ value: String(previousYear), position: "top", fill: "var(--muted)", fontSize: 10 }}
                    />
                  )}
                  {selectedValue !== null && (
                    <ReferenceDot
                      x={selectedYear}
                      y={selectedValue}
                      r={5}
                      fill="var(--primary)"
                      stroke="var(--surface)"
                      strokeWidth={2}
                      label={{ value: String(selectedYear), position: "top", fill: "var(--text)", fontSize: 10 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <button
              className="compare-table-toggle"
              type="button"
              aria-expanded={tableOpen}
              onClick={() => setTablesOpen((open) => ({ ...open, [indicator.id]: !tableOpen }))}
            >
              {tableOpen ? "Hide table" : "View as table"}
            </button>
            {tableOpen && (
              <div className="compare-year-table-wrap">
                <table className="compare-year-table">
                  <caption>{indicator.name}, annual values from {data[0]?.year ?? previousYear} to {data.at(-1)?.year ?? selectedYear}</caption>
                  <thead><tr><th scope="col">Year</th><th scope="col">Value</th><th scope="col">Unit</th></tr></thead>
                  <tbody>
                    {data.map((point) => (
                      <tr key={point.year}>
                        <th scope="row">{point.year}</th>
                        <td><bdi dir="ltr">{formatValue(point.value, indicator)}</bdi></td>
                        <td>{indicator.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
