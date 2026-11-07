"use client";

import { useId, useState } from "react";
import { useMessages } from "@/hooks/use-messages";

type SignificanceBadgeProps = {
  significant: boolean;
  pValue: number;
  confidence: number;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en", { maximumSignificantDigits: 4 }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("en", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

export function SignificanceBadge({
  significant,
  pValue,
  confidence,
}: SignificanceBadgeProps) {
  const messages = useMessages();
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const label = significant ? messages.trendSignificant : messages.trendNotSignificant;

  return (
    <div className={`significance-badge ${significant ? "is-significant" : "is-not-significant"}`}>
      <span className="significance-status">
        <span aria-hidden="true">{significant ? "✓" : "○"}</span>
        {label}
      </span>
      <div className="significance-values">
        <span>
          {messages.trendPValue}: <bdi dir="ltr">{formatNumber(pValue)}</bdi>
        </span>
        <span>
          {messages.trendConfidence}: <bdi dir="ltr">{formatPercent(confidence)}</bdi>
        </span>
      </div>
      <span className="significance-tooltip-wrap">
        <button
          className="significance-tooltip-trigger"
          type="button"
          aria-label={messages.trendTooltipOpen}
          aria-describedby={open ? tooltipId : undefined}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span aria-hidden="true">i</span>
        </button>
        <span className="significance-tooltip" id={tooltipId} role="tooltip">
          {messages.trendPValueExplanation}
        </span>
      </span>
    </div>
  );
}
