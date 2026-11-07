"use client";

import { useId } from "react";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";
import type { TrendResponse, VariableId } from "@/types/api";
import { SignificanceBadge } from "./SignificanceBadge";
import { TrendTakeaway } from "./TrendTakeaway";

type TrendSummaryCardProps = {
  trend: TrendResponse | undefined;
  variable: VariableId;
  variableUnit: string;
  start: number;
  end: number;
  loading: boolean;
  error: string | undefined;
  onRetry: () => void;
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
    return (
      <div className="trend-error-state" role="alert">
        <p>{messages.trendError}</p>
        <button type="button" onClick={onRetry}>{messages.trendRetry}</button>
      </div>
    );
  }

  if (!trend) {
    return <p className="map-empty-state">{messages.trendDataUnavailable}</p>;
  }

  const direction = {
    increasing: messages.trendIncreasing,
    decreasing: messages.trendDecreasing,
    no_change: messages.trendNoChange,
  }[trend.direction];
  const directionIcon = {
    increasing: "↑",
    decreasing: "↓",
    no_change: "→",
  }[trend.direction];
  return (
    <section className="trend-summary-card" aria-labelledby={headingId} aria-busy={loading}>
      <h3 id={headingId}>{messages.trendSummaryTitle}</h3>
      <SignificanceBadge
        significant={trend.significant}
        pValue={trend.pValue}
        confidence={trend.confidence}
      />
      {error && (
        <div className="trend-error-state" role="alert">
          <p>{messages.trendError}</p>
          <button type="button" onClick={onRetry}>{messages.trendRetry}</button>
        </div>
      )}
      <div className="trend-metrics">
        <div className="trend-metric">
          <span>{messages.trendSlope}</span>
          <bdi dir="ltr">{formatNumber(trend.slope)} {trend.unit}</bdi>
        </div>
        <div className="trend-metric">
          <span>{messages.trendTotalChange}</span>
          <bdi dir="ltr">{formatNumber(trend.changeTotal)} {variableUnit}</bdi>
        </div>
        <div className="trend-metric">
          <span>{messages.trendPercentChange}</span>
          <bdi dir="ltr">{formatNumber(trend.changePercent)}%</bdi>
        </div>
        <div className="trend-metric">
          <span>{messages.trendDirection}</span>
          <strong className="trend-direction">
            <span aria-hidden="true">{directionIcon}</span>
            {direction}
          </strong>
        </div>
      </div>
      <TrendTakeaway trend={trend} variable={variable} variableUnit={variableUnit} start={start} end={end} />
      <div className="trend-backend-summary">
        <span className="map-panel-eyebrow">{messages.trendBackendSummaryEnglish}</span>
        <p lang="en" dir="ltr">{trend.summary}</p>
        {language === "ur" && <small>{messages.trendSummaryEnglishNote}</small>}
      </div>
    </section>
  );
}
