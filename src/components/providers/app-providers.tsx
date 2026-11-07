"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { REGION_IDS, VARIABLE_IDS } from "@/types/api";
import { useUiStore } from "@/store/ui-store";

const urlStateSchema = z
  .object({
    variable: z.enum(VARIABLE_IDS).optional(),
    region: z.enum(REGION_IDS).optional(),
    start: z.coerce.number().int().min(2000).max(2025).optional(),
    end: z.coerce.number().int().min(2000).max(2025).optional(),
    layer: z.enum(["none", ...VARIABLE_IDS]).optional(),
    mapLayerType: z.enum(["absolute", "change"]).optional(),
    changeBasis: z.enum(["previous-year", "range-start", "backend"]).optional(),
    language: z.enum(["en", "ur"]).optional(),
    theme: z.enum(["dark", "light"]).optional(),
  })
  .superRefine((state, context) => {
    if (state.start !== undefined && state.end !== undefined && state.start > state.end) {
      context.addIssue({
        code: "custom",
        message: "The start year must not be after the end year.",
        path: ["start"],
      });
    }
  });

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const parsed = urlStateSchema.safeParse({
    variable: params.get("variable") ?? undefined,
    region: params.get("region") ?? undefined,
    start: params.get("start") ?? undefined,
    end: params.get("end") ?? undefined,
    layer: params.get("layer") ?? undefined,
    mapLayerType: params.get("mapLayerType") ?? undefined,
    changeBasis: params.get("changeBasis") ?? undefined,
    language: params.get("language") ?? undefined,
    theme: params.get("theme") ?? undefined,
  });

  if (!parsed.success) {
    console.error("Invalid UI state in URL search parameters.", parsed.error);
    return {};
  }

  return parsed.data;
}

function writeUrlState(): void {
  const state = useUiStore.getState();
  const url = new URL(window.location.href);

  url.searchParams.set("variable", state.variable);
  url.searchParams.set("region", state.region);
  url.searchParams.set("start", String(state.yearRange[0]));
  url.searchParams.set("end", String(state.yearRange[1]));
  url.searchParams.set("layer", state.layer);
  url.searchParams.set("mapLayerType", state.mapLayerType);
  url.searchParams.set("changeBasis", state.changeBasis);
  url.searchParams.set("language", state.language);
  url.searchParams.set("theme", state.theme);

  window.history.replaceState(window.history.state, "", url);
}

function UrlStateSync() {
  useEffect(() => {
    const applyUrlState = () => {
      const values = readUrlState();
      const current = useUiStore.getState();
      useUiStore.setState({
        variable: values.variable ?? current.variable,
        region: values.region ?? current.region,
        yearRange: [values.start ?? current.yearRange[0], values.end ?? current.yearRange[1]],
        layer: values.layer ?? current.layer,
        mapLayerType: values.mapLayerType ?? current.mapLayerType,
        changeBasis: values.changeBasis ?? current.changeBasis,
        language: values.language ?? current.language,
        theme: values.theme ?? current.theme,
      });
    };

    applyUrlState();
    const unsubscribe = useUiStore.subscribe(writeUrlState);
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
          queries: { staleTime: 60_000, retry: 1 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <UrlStateSync />
      <DocumentPreferences />
      {children}
    </QueryClientProvider>
  );
}
