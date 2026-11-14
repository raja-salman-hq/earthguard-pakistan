"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type YearComparisonBarChartProps = {
  title: string;
  unit: string;
  previousYear: number;
  previousValue: number | null;
  year: number;
  value: number | null;
};

function formatValue(value: number | null): string {
  return value === null ? "—" : new Intl.NumberFormat("en", { maximumSignificantDigits: 5 }).format(value);
}

export function YearComparisonBarChart({
  title,
  unit,
  previousYear,
  previousValue,
  year,
  value,
}: YearComparisonBarChartProps) {
  const data = [
    { year: String(previousYear), value: previousValue },
    { year: String(year), value },
  ];

  return (
    <figure className="compare-bar-chart" aria-label={`${title}: ${previousYear} and ${year} values`}>
      <figcaption>{title} <span>({unit})</span></figcaption>
      <div className="compare-bar-chart-plot" role="img" aria-label={`${title}, ${previousYear}: ${formatValue(previousValue)} ${unit}; ${year}: ${formatValue(value)} ${unit}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 24, right: 12, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: "var(--muted)", fontSize: 11 }} />
            <YAxis
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              tickFormatter={(tick: number) => formatValue(tick)}
              label={{ value: unit, angle: -90, position: "insideLeft", fill: "var(--muted)", fontSize: 10 }}
              width={52}
            />
            <Tooltip
              formatter={(chartValue) => [`${formatValue(Number(chartValue))} ${unit}`, title]}
              contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)" }}
            />
            <Bar dataKey="value" fill="var(--primary)" radius={[5, 5, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="value" position="top" formatter={(label) => formatValue(typeof label === "number" ? label : null)} fill="var(--text)" fontSize={10} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
