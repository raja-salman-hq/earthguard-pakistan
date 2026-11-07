"use client";

import { create } from "zustand";
import type { Language } from "@/lib/i18n";
import type { CompareMode, RegionId, VariableId } from "@/types/api";

export type Theme = "dark" | "light";
export type LayerId = "none" | VariableId;
export type MapLayerType = "absolute" | "change";
export type ChangeBasis = "previous-year" | "range-start" | "backend";

type UiState = {
  variable: VariableId;
  region: RegionId;
  yearRange: [number, number];
  currentYear: number;
  layer: LayerId;
  mapLayerType: MapLayerType;
  changeBasis: ChangeBasis;
  language: Language;
  theme: Theme;
  compareMode: CompareMode;
  compareRegions: RegionId[];
  compareVariables: VariableId[];
  setVariable: (variable: VariableId) => void;
  setRegion: (region: RegionId) => void;
  setYearRange: (yearRange: [number, number]) => void;
  setCurrentYear: (year: number) => void;
  setLayer: (layer: LayerId) => void;
  setMapLayerType: (mapLayerType: MapLayerType) => void;
  setChangeBasis: (changeBasis: ChangeBasis) => void;
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
  setCompareMode: (compareMode: CompareMode) => void;
  setCompareRegions: (compareRegions: RegionId[]) => void;
  setCompareVariables: (compareVariables: VariableId[]) => void;
};

export const useUiStore = create<UiState>()((set) => ({
  variable: "air_temperature",
  region: "punjab",
  yearRange: [2000, 2025],
  currentYear: 2025,
  layer: "air_temperature",
  mapLayerType: "absolute",
  changeBasis: "previous-year",
  language: "en",
  theme: "dark",
  compareMode: "regions",
  compareRegions: ["punjab", "sindh"],
  compareVariables: ["air_temperature", "precipitation"],
  setVariable: (variable) => set({ variable }),
  setRegion: (region) => set({ region }),
  setYearRange: (yearRange) => set({ yearRange }),
  setCurrentYear: (currentYear) => set({ currentYear }),
  setLayer: (layer) => set({ layer }),
  setMapLayerType: (mapLayerType) => set({ mapLayerType }),
  setChangeBasis: (changeBasis) => set({ changeBasis }),
  setLanguage: (language) => set({ language }),
  setTheme: (theme) => set({ theme }),
  setCompareMode: (compareMode) => set({ compareMode }),
  setCompareRegions: (compareRegions) => set({ compareRegions }),
  setCompareVariables: (compareVariables) => set({ compareVariables }),
}));
