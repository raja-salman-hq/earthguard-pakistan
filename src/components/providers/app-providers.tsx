"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  compareModeSchema,
  compareRegionsSchema,
  compareVariablesSchema,
  REGION_IDS,
  VARIABLE_IDS,
} from "@/types/api";
import { useUiStore } from "@/store/ui-store";
import { ApiWakeupNotice } from "./api-wakeup-notice";

const defaultCompareRegions = ["punjab", "sindh"] as const;
const defaultCompareVariables = ["air_temperature", "precipitation"] as const;

const urlStateSchema = z
  .object({
    variable: z.enum(VARIABLE_IDS).catch("air_temperature"),
    region: z.enum(REGION_IDS).catch("punjab"),
    start: z.coerce.number().int().min(2000).max(2025).catch(2000),
    end: z.coerce.number().int().min(2000).max(2025).catch(2025),
    year: z.coerce.number().int().min(2000).max(2025).catch(2025),
    layer: z.enum(["none", ...VARIABLE_IDS]).catch("air_temperature"),
    mapLayerType: z.enum(["absolute", "change"]).catch("absolute"),
    changeBasis: z.enum(["previous-year", "range-start", "backend"]).catch("previous-year"),
    language: z.enum(["en", "ur"]).catch("en"),
    theme: z.enum(["dark", "light"]).catch("dark"),
    compareMode: compareModeSchema.catch("regions"),
    compareRegions: compareRegionsSchema.catch([...defaultCompareRegions]),
    compareVariables: compareVariablesSchema.catch([...defaultCompareVariables]),
  });

function parseListParameter(value: string | null, defaults: readonly string[]): string[] {
  if (value === null) {
    return [...defaults];
  }
  return value === "" ? [] : value.split(",");
}

function listsMatch(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const parsed = urlStateSchema.safeParse({
    variable: params.get("variable"),
    region: params.get("region"),
    start: params.get("start"),
    end: params.get("end"),
    year: params.get("year"),
    layer: params.get("layer"),
    mapLayerType: params.get("mapLayerType"),
    changeBasis: params.get("changeBasis"),
    language: params.get("language"),
    theme: params.get("theme"),
    compareMode: params.get("compareMode"),
    compareRegions: parseListParameter(params.get("compareRegions"), defaultCompareRegions),
    compareVariables: parseListParameter(params.get("compareVariables"), defaultCompareVariables),
  });

  if (!parsed.success) {
    console.error("Invalid UI state in URL search parameters.", parsed.error);
    return {
      variable: "air_temperature" as const,
      region: "punjab" as const,
      start: 2000,
      end: 2025,
      year: 2025,
      layer: "air_temperature" as const,
      mapLayerType: "absolute" as const,
      changeBasis: "previous-year" as const,
      language: "en" as const,
      theme: "dark" as const,
      compareMode: "regions" as const,
      compareRegions: [...defaultCompareRegions],
      compareVariables: [...defaultCompareVariables],
    };
  }

  const { start, end } = parsed.data;
  const validRange = start <= end ? [start, end] as const : [2000, 2025] as const;

  return {
    ...parsed.data,
    start: validRange[0],
    end: validRange[1],
    year: Math.min(validRange[1], Math.max(validRange[0], parsed.data.year)),
  };
}

function writeUrlState(): void {
  const state = useUiStore.getState();
  const url = new URL(window.location.href);

  url.searchParams.set("variable", state.variable);
  url.searchParams.set("region", state.region);
  url.searchParams.set("start", String(state.yearRange[0]));
  url.searchParams.set("end", String(state.yearRange[1]));
  url.searchParams.set("year", String(state.currentYear));
  url.searchParams.set("layer", state.layer);
  url.searchParams.set("mapLayerType", state.mapLayerType);
  url.searchParams.set("changeBasis", state.changeBasis);
  url.searchParams.set("language", state.language);
  url.searchParams.set("theme", state.theme);
  url.searchParams.set("compareMode", state.compareMode);
  url.searchParams.set("compareRegions", state.compareRegions.join(","));
  url.searchParams.set("compareVariables", state.compareVariables.join(","));

  if (url.href !== window.location.href) {
    window.history.replaceState(window.history.state, "", url);
  }
}

function UrlStateSync() {
  useEffect(() => {
    const applyUrlState = () => {
      const values = readUrlState();
      const current = useUiStore.getState();

      const stateMatchesUrl =
        current.variable === values.variable &&
        current.region === values.region &&
        current.yearRange[0] === values.start &&
        current.yearRange[1] === values.end &&
        current.currentYear === values.year &&
        current.layer === values.layer &&
        current.mapLayerType === values.mapLayerType &&
        current.changeBasis === values.changeBasis &&
        current.language === values.language &&
        current.theme === values.theme &&
        current.compareMode === values.compareMode &&
        listsMatch(current.compareRegions, values.compareRegions) &&
        listsMatch(current.compareVariables, values.compareVariables);

      if (stateMatchesUrl) {
        return;
      }

      useUiStore.setState({
        variable: values.variable,
        region: values.region,
        yearRange: [values.start, values.end],
        currentYear: values.year,
        layer: values.layer,
        mapLayerType: values.mapLayerType,
        changeBasis: values.changeBasis,
        language: values.language,
        theme: values.theme,
        compareMode: values.compareMode,
        compareRegions: values.compareRegions,
        compareVariables: values.compareVariables,
      });
    };

    applyUrlState();
    const unsubscribe = useUiStore.subscribe(writeUrlState);
    writeUrlState();
    window.addEventListener("popstate", applyUrlState);

    return () => {
      unsubscribe();
      window.removeEventListener("popstate", applyUrlState);
    };
  }, []);

  return null;
}

function DocumentPreferences() {
  const language = useUiStore((state) => state.language);
  const theme = useUiStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ur" ? "rtl" : "ltr";
    document.documentElement.dataset.theme = theme;
  }, [language, theme]);

  return null;
}

export function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <UrlStateSync />
      <DocumentPreferences />
      <ApiWakeupNotice />
      {children}
    </QueryClientProvider>
  );
}
