"use client";

import { useEffect, useRef, useState } from "react";
import type { Variable } from "@/types/api";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";

type YearRangeSliderProps = {
  variable: Variable | undefined;
  loading: boolean;
  error: string | undefined;
};

export function YearRangeSlider({ variable, loading, error }: YearRangeSliderProps) {
  const messages = useMessages();
  const [startYear, endYear] = useUiStore((state) => state.yearRange);
  const currentYear = useUiStore((state) => state.currentYear);
  const setYearRange = useUiStore((state) => state.setYearRange);
  const setCurrentYear = useUiStore((state) => state.setCurrentYear);
  const debounceTimer = useRef<number | null>(null);
  const [draft, setDraft] = useState<[number, number]>([startYear, endYear]);

  useEffect(() => () => {
    if (debounceTimer.current !== null) {
      window.clearTimeout(debounceTimer.current);
    }
  }, []);

  if (loading) {
    return <div className="map-form-skeleton" role="status" aria-label={messages.filterLoadingYears} />;
  }

  if (error) {
    return <p className="map-inline-error" role="alert">{error}</p>;
  }

  if (!variable) {
    return <p className="map-empty-state" role="status">{messages.filterNoVariable}</p>;
  }

  function scheduleCommit(nextRange: [number, number]) {
    setDraft(nextRange);
    if (debounceTimer.current !== null) {
      window.clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = window.setTimeout(() => {
      setYearRange(nextRange);
      setCurrentYear(Math.min(nextRange[1], Math.max(nextRange[0], currentYear)));
      debounceTimer.current = null;
    }, 250);
  }

  const span = Math.max(1, variable.availableTo - variable.availableFrom);
  const left = ((draft[0] - variable.availableFrom) / span) * 100;
  const right = ((draft[1] - variable.availableFrom) / span) * 100;

  return (
    <div className="filter-field-group">
      <div className="range-label-row">
        <span className="map-field-label">{messages.filterYearRange}</span>
        <bdi className="map-number" dir="ltr">{draft[0]}–{draft[1]}</bdi>
      </div>
      <div className="dual-range">
        <div className="dual-range-track" aria-hidden="true">
          <span style={{ left: `${left}%`, right: `${100 - right}%` }} />
        </div>
        <input
          className="dual-range-input"
          type="range"
          min={variable.availableFrom}
          max={variable.availableTo}
          step={1}
          value={draft[0]}
          aria-label={messages.filterStartYear}
          aria-valuetext={`${messages.filterStartYear}: ${draft[0]}`}
          onChange={(event) => {
            const start = Math.min(Number(event.currentTarget.value), draft[1]);
            scheduleCommit([start, draft[1]]);
          }}
        />
        <input
          className="dual-range-input"
          type="range"
          min={variable.availableFrom}
          max={variable.availableTo}
          step={1}
          value={draft[1]}
          aria-label={messages.filterEndYear}
          aria-valuetext={`${messages.filterEndYear}: ${draft[1]}`}
          onChange={(event) => {
            const end = Math.max(Number(event.currentTarget.value), draft[0]);
            scheduleCommit([draft[0], end]);
          }}
        />
      </div>
      <div className="range-bound-labels">
        <bdi dir="ltr">{variable.availableFrom}</bdi>
        <bdi dir="ltr">{variable.availableTo}</bdi>
      </div>
    </div>
  );
}
