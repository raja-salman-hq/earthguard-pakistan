"use client";

import { useId } from "react";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";
import { NoDataError } from "@/lib/api/static-data";
import { NoDataNotice } from "@/components/ui/no-data-notice";
import type { TrendResponse, VariableId } from "@/types/api";
import type { AreaStatistics } from "@/types/area-statistics";
import { SignificanceBadge } from "./SignificanceBadge";
import { TrendTakeaway } from "./TrendTakeaway";

type TrendSummaryCardProps = {
  trend: TrendResponse | null | undefined;
  variable: VariableId;
  variableUnit: string;
  start: number;
  end: number;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  areaStatistics?: AreaStatistics;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en", { maximumSignificantDigits: 4 }).format(value);
}

export function TrendSummaryCard({
  trend,
  variable,
  variableUnit,
  start,
  end,
  loading,
  error,
  onRetry,
  areaStatistics,
}: TrendSummaryCardProps) {
  const messages = useMessages();
  const language = useUiStore((state) => state.language);
  const headingId = useId();

  if (loading && !trend) {
    return (
      <div className="trend-summary-loading" role="status" aria-label={messages.trendLoading}>
        <div className="skeleton skeleton-heading" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line-short" />
      </div>
    );
  }

  if (error && !trend) {
    if (error instanceof NoDataError) {
      return <NoDataNotice error={error} />;
    }
    return (
      <div className="trend-error-state" role="alert">
        <p>{messages.trendError}</p>
        <button type="button" onClick={onRetry}>{messages.trendRetry}</button>
      </div>
    );
  }

  if (!trend || !trend.available) {
    return (
      <section className="trend-summary-card" aria-labelledby={headingId}>
        <h2 id={headingId}>{messages.trendSummaryTitle}</h2>
        {areaStatistics ? (
          <AreaStatisticsSummary statistics={areaStatistics} />
        ) : (
          <p>{messages.trendStatisticsUnavailable}</p>
        )}
      </section>
    );
  }

  const directions = {
    increasing: messages.trendIncreasing,
    decreasing: messages.trendDecreasing,
    no_change: messages.trendNoChange,
  };
  const directionIcons = {
    increasing: "↑",
    decreasing: "↓",
    no_change: "→",
  };
  const direction = trend.direction ? directions[trend.direction] : undefined;
  const directionIcon = trend.direction ? directionIcons[trend.direction] : undefined;
  const hasStatistics = [
    trend.test,
    trend.tau,
    trend.z,
    trend.pValue,
    trend.significant,
    trend.direction,
    trend.slope,
    trend.senSlope,
    trend.slopeCi95,
    trend.nYears,
  ].some((value) => value !== undefined && value !== null);
  if (!hasStatistics && !trend.summary) {
    return (
      <section className="trend-summary-card" aria-labelledby={headingId}>
        <h2 id={headingId}>{messages.trendSummaryTitle}</h2>
        {areaStatistics ? (
          <AreaStatisticsSummary statistics={areaStatistics} />
        ) : (
          <p>{messages.trendStatisticsUnavailable}</p>
        )}
      </section>
    );
  }

  function AreaStatisticsSummary({ statistics }: { statistics: AreaStatistics }) {
    const total = statistics.lst.find((row) => row.category === "Total Study Area");
    const lulc = statistics.lulc.filter((row) =>
      ["Urban_2001", "Urban_2024", "Agriculture_2001", "Agriculture_2024"].includes(row.category),
    );

    return (
      <div className="area-statistics-summary">
        <p className="area-statistics-summary-intro">
          Static Faisalabad area statistics from the supplied CSV files. These values describe the study area and are not a computed trend test.
        </p>
        {total && (
          <div className="area-statistics-highlight">
            <span>Study-area LST change</span>
            <strong dir="ltr">+{total.changeCelsius.toFixed(2)} °C</strong>
            <small dir="ltr">{total.year2001.toFixed(2)} °C → {total.year2024.toFixed(2)} °C</small>
          </div>
        )}
        <div className="area-statistics-grid">
          {lulc.map((row) => (
            <div className="area-statistics-metric" key={row.category}>
              <span>{row.category.replaceAll("_", " ")}</span>
              <bdi dir="ltr">{row.areaKm2.toFixed(1)} km²</bdi>
            </div>
          ))}
        </div>
        <small className="area-statistics-source">Source: {statistics.source}</small>
      </div>
    );
  }

  return (
    <section className="trend-summary-card" aria-labelledby={headingId} aria-busy={loading}>
      <h2 id={headingId}>{messages.trendSummaryTitle}</h2>
      {typeof trend.significant === "boolean" && (
        <SignificanceBadge
          significant={trend.significant}
          pValue={trend.pValue}
          confidence={trend.confidence}
        />
      )}
      {Boolean(error) && (
        <div className="trend-error-state" role="alert">
          <p>{messages.trendError}</p>
          <button type="button" onClick={onRetry}>{messages.trendRetry}</button>
        </div>
      )}
      <div className="trend-metrics">
        {trend.test && (
          <div className="trend-metric">
            <span>{messages.trendTestLabel}</span>
            <bdi dir="auto">{trend.test}</bdi>
          </div>
        )}
        {typeof trend.slope === "number" && (
          <div className="trend-metric">
            <span>{messages.trendSlope}</span>
            <bdi dir="ltr">{formatNumber(trend.slope)} {trend.unit ?? variableUnit}</bdi>
          </div>
        )}
        {trend.slopeCi95 && (
          <div className="trend-metric">
            <span>{messages.trendSlopeCi95}</span>
            <bdi dir="ltr">
              [{formatNumber(trend.slopeCi95[0])}, {formatNumber(trend.slopeCi95[1])}]
            </bdi>
          </div>
        )}
        {typeof trend.tau === "number" && (
          <div className="trend-metric">
            <span>{messages.trendTau}</span>
            <bdi dir="ltr">{formatNumber(trend.tau)}</bdi>
          </div>
        )}
        {typeof trend.z === "number" && (
          <div className="trend-metric">
            <span>{messages.trendZ}</span>
            <bdi dir="ltr">{formatNumber(trend.z)}</bdi>
          </div>
        )}
        {typeof trend.nYears === "number" && (
          <div className="trend-metric">
            <span>{messages.trendNYearsLabel}</span>
            <bdi dir="ltr">{trend.nYears}</bdi>
          </div>
        )}
        {typeof trend.changeTotal === "number" && (
          <div className="trend-metric">
            <span>{messages.trendTotalChange}</span>
            <bdi dir="ltr">{formatNumber(trend.changeTotal)} {variableUnit}</bdi>
          </div>
        )}
        {typeof trend.changePercent === "number" && (
          <div className="trend-metric">
            <span>{messages.trendPercentChange}</span>
            <bdi dir="ltr">{formatNumber(trend.changePercent)}%</bdi>
          </div>
        )}
        {direction && (
          <div className="trend-metric">
            <span>{messages.trendDirection}</span>
            <strong className="trend-direction">
              {directionIcon && <span aria-hidden="true">{directionIcon}</span>}
              {direction}
            </strong>
          </div>
        )}
      </div>
      {trend.direction &&
        typeof trend.changeTotal === "number" &&
        typeof trend.changePercent === "number" && (
          <TrendTakeaway trend={trend} variable={variable} variableUnit={variableUnit} start={start} end={end} />
        )}
      {trend.summary && (
        <div className="trend-backend-summary">
          <span className="map-panel-eyebrow">{messages.trendBackendSummary}</span>
          <p lang={language} dir={language === "ur" ? "rtl" : "ltr"}>{trend.summary}</p>
        </div>
      )}
      {trend.notes?.length ? (
        <ul className="trend-notes">
          {trend.notes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      ) : null}
    </section>
  );
}
