"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getMapLayer } from "@/lib/api";
import { useMessages } from "@/hooks/use-messages";
import { createMapLayerQuery } from "@/lib/map-layer-query";
import { useUiStore } from "@/store/ui-store";
import type { Variable } from "@/types/api";

type TimelineControlProps = {
  variable: Variable | undefined;
  loading: boolean;
  error: string | undefined;
};

type PlaybackSpeed = 1 | 2;

function subscribeToMotionPreference(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getMotionPreference(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function TimelineControl({ variable, loading, error }: TimelineControlProps) {
  const messages = useMessages();
  const queryClient = useQueryClient();
  const yearRange = useUiStore((state) => state.yearRange);
  const currentYear = useUiStore((state) => state.currentYear);
  const variableId = useUiStore((state) => state.variable);
  const layerType = useUiStore((state) => state.mapLayerType);
  const changeBasis = useUiStore((state) => state.changeBasis);
  const setCurrentYear = useUiStore((state) => state.setCurrentYear);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [loop, setLoop] = useState(true);
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    getMotionPreference,
    () => true,
  );
  const [rangeStart, rangeEnd] = yearRange;

  useEffect(() => {
    if (!playing || reducedMotion) {
      return;
    }

    const timer = window.setInterval(() => {
      const state = useUiStore.getState();
      const [, end] = state.yearRange;
      if (state.currentYear >= end) {
        if (loop) {
          const firstYear =
            state.mapLayerType === "change" && state.changeBasis === "previous-year"
              ? Math.max(state.yearRange[0], 2001)
              : state.yearRange[0];
          setCurrentYear(firstYear);
        } else {
          setPlaying(false);
        }
        return;
      }

      setCurrentYear(Math.min(end, state.currentYear + speed));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [loop, playing, reducedMotion, setCurrentYear, speed]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.visibilityState === "hidden") {
        setPlaying(false);
      }
    };

    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  const prefetchQueries = useMemo(() => {
    if (!playing || !variable) {
      return [];
    }

    return [1, 2]
      .map((offset) => {
        const nextYear = currentYear + offset * speed;
        if (nextYear > rangeEnd) {
          return loop
            ? rangeStart + (nextYear - rangeEnd - 1)
            : undefined;
        }
        return nextYear;
      })
      .filter((year): year is number => year !== undefined && year >= rangeStart && year <= rangeEnd)
      .filter((year) => !(layerType === "change" && changeBasis === "previous-year" && year === 2000))
      .map((year) => createMapLayerQuery(variableId, year, layerType, changeBasis, rangeStart));
  }, [changeBasis, currentYear, layerType, loop, playing, rangeEnd, rangeStart, speed, variable, variableId]);

  useEffect(() => {
    for (const query of prefetchQueries) {
      void queryClient.prefetchQuery({
        queryKey: ["map-layer", query],
        queryFn: () => getMapLayer(query),
      });
    }
  }, [prefetchQueries, queryClient]);

  if (loading) {
    return <div className="timeline-skeleton" role="status" aria-label={messages.timelineLoading} />;
  }

  if (error) {
    return <p className="map-inline-error" role="alert">{error}</p>;
  }

  if (!variable) {
    return <p className="map-empty-state" role="status">{messages.filterNoVariable}</p>;
  }

  return (
    <div className="timeline-control">
      <button
        className="timeline-play-button"
        type="button"
        aria-label={playing && !reducedMotion ? messages.timelinePause : messages.timelinePlay}
        title={reducedMotion ? messages.timelineReducedMotion : undefined}
        disabled={reducedMotion || rangeStart === rangeEnd}
        onClick={() => setPlaying((current) => !current)}
      >
        {playing && !reducedMotion ? "Ⅱ" : "▶"}
      </button>
      <label className="timeline-slider-group">
        <span className="timeline-year">{currentYear}</span>
        <input
          type="range"
          min={rangeStart}
          max={rangeEnd}
          step={1}
          value={currentYear}
          aria-label={messages.timelineCurrentYear}
          aria-valuetext={`${messages.timelineCurrentYear}: ${currentYear}`}
          onChange={(event) => setCurrentYear(Number(event.currentTarget.value))}
        />
      </label>
      <label className="timeline-option">
        <span>{messages.timelineSpeed}</span>
        <select
          aria-label={messages.timelineSpeed}
          value={speed}
          onChange={(event) => {
            const value = Number(event.currentTarget.value);
            if (value === 1) setSpeed(1);
            if (value === 2) setSpeed(2);
          }}
        >
          <option value={1}>1×</option>
          <option value={2}>2×</option>
        </select>
      </label>
      <label className="timeline-loop">
        <input
          type="checkbox"
          checked={loop}
          onChange={(event) => setLoop(event.currentTarget.checked)}
        />
        <span>{messages.timelineLoop}</span>
      </label>
    </div>
  );
}
