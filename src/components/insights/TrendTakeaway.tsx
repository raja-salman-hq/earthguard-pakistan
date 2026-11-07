"use client";

import type { ReactNode } from "react";
import { getVariableLabel } from "@/lib/i18n";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";
import type { TrendResponse, VariableId } from "@/types/api";

type TrendTakeawayProps = {
  trend: TrendResponse;
  variable: VariableId;
  variableUnit: string;
  start: number;
  end: number;
  label?: string;
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

export function TrendTakeaway({
  trend,
  variable,
  variableUnit,
  start,
  end,
  label,
}: TrendTakeawayProps) {
  const messages = useMessages();
  const language = useUiStore((state) => state.language);
  const direction = {
    increasing: messages.trendIncreasing,
    decreasing: messages.trendDecreasing,
    no_change: messages.trendNoChange,
  }[trend.direction];
  const template = {
    increasing: messages.trendSentenceIncreasing,
    decreasing: messages.trendSentenceDecreasing,
    no_change: messages.trendSentenceNoChange,
  }[trend.direction];
  const sentence = interpolateSentence(template, {
    start: <bdi dir="ltr">{start}</bdi>,
    end: <bdi dir="ltr">{end}</bdi>,
    variable: getVariableLabel(variable, language),
    direction: direction.toLocaleLowerCase(language),
    change: <bdi dir="ltr">{formatNumber(trend.changeTotal)}</bdi>,
    unit: <bdi dir="ltr">{variableUnit}</bdi>,
    percent: <bdi dir="ltr">{formatNumber(trend.changePercent)}</bdi>,
  });

  return (
    <p className="trend-plain-language">
      {label && <strong>{label}: </strong>}
      {sentence}
    </p>
  );
}
