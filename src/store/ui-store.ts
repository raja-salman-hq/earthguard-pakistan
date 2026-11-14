"use client";

import { create } from "zustand";
import type { Language } from "@/lib/i18n";
import type { CompareMode, ProvinceId as ApiProvinceId, RegionId, VariableId } from "@/types/api";
import { isDemoMode } from "@/lib/api/client";
import type { AreaId } from "@/types/area-data";

export type Theme = "dark" | "light";
export type LayerId = "none" | VariableId;
export type MapLayerType = "absolute" | "change";
export type ChangeBasis = "previous-year" | "range-start" | "backend";
export type ProvinceId = "pakistan" | ApiProvinceId;

const initialVariable: VariableId = isDemoMode ? "air_temperature" : "land_surface_temperature";
const initialYearRange: [number, number] = isDemoMode ? [2000, 2025] : [2001, 2024];

type UiState = {
  variable: VariableId;
  region: RegionId;
  province: ProvinceId;
  area: AreaId | null;
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
  setProvince: (province: ProvinceId) => void;
  setArea: (area: AreaId | null) => void;
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
  variable: initialVariable,
  region: "punjab",
  province: "punjab",
  area: isDemoMode ? null : "faisalabad",
  yearRange: initialYearRange,
  currentYear: initialYearRange[1],
  layer: initialVariable,
  mapLayerType: "absolute",
  changeBasis: "previous-year",
  language: "en",
  theme: "dark",
  compareMode: isDemoMode ? "regions" : "variables",
  compareRegions: ["punjab", "sindh"],
  compareVariables: isDemoMode
    ? ["air_temperature", "precipitation"]
    : ["land_surface_temperature", "precipitation", "vegetation_index"],
  setVariable: (variable) => set({ variable }),
  setRegion: (region) =>
    region === "faisalabad"
      ? set({ region: "punjab", province: "punjab", area: "faisalabad" })
      : set({ region, province: region, area: null }),
  setProvince: (province) =>
    set({
      province,
      area: null,
      ...(province === "pakistan" ? {} : { region: province }),
    }),
  setArea: (area) =>
    set({
      area,
      ...(area === "faisalabad" ? { province: "punjab", region: "punjab" } : {}),
    }),
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
