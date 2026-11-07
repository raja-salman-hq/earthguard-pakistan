"use client";

import type { ReactNode } from "react";
import { useId } from "react";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";
import { getVariableLabel } from "@/lib/i18n";
import type { TrendResponse, VariableId } from "@/types/api";
import { SignificanceBadge } from "./SignificanceBadge";

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

function interpolateSentence(
  template: string,
  values: Record<string, ReactNode>,
): ReactNode[] {
  return template.split(/(\{[a-zA-Z]+\})/g).map((part, index) => {
    const key = part.slice(1, -1);
    return part.startsWith("{") && key in values ? (
      <span key={`${key}-${index}`}>{values[key]}</span>
    ) : (
      part
    );
  });
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
  const sentenceTemplate = {
    increasing: messages.trendSentenceIncreasing,
    decreasing: messages.trendSentenceDecreasing,
    no_change: messages.trendSentenceNoChange,
  }[trend.direction];
  const sentence = interpolateSentence(sentenceTemplate, {
    start: <bdi dir="ltr">{start}</bdi>,
    end: <bdi dir="ltr">{end}</bdi>,
    variable: getVariableLabel(variable, language),
    direction,
    change: <bdi dir="ltr">{formatNumber(trend.changeTotal)}</bdi>,
    unit: <bdi dir="ltr">{variableUnit}</bdi>,
    percent: <bdi dir="ltr">{formatNumber(trend.changePercent)}</bdi>,
  });

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
      <p className="trend-plain-language">{sentence}</p>
      <div className="trend-backend-summary">
        <span className="map-panel-eyebrow">
          {language === "ur" ? messages.trendBackendSummaryEnglish : messages.trendBackendSummary}
        </span>
        <p lang="en" dir="ltr">{trend.summary}</p>
        {language === "ur" && <small>{messages.trendSummaryEnglishNote}</small>}
      </div>
    </section>
  );
}
