"use client";

import { create } from "zustand";
import type { Language } from "@/lib/i18n";
import type { RegionId, VariableId } from "@/types/api";

export type Theme = "dark" | "light";
export type LayerId = "none" | VariableId;

type UiState = {
  variable: VariableId;
  region: RegionId;
  yearRange: [number, number];
  layer: LayerId;
  language: Language;
  theme: Theme;
  setVariable: (variable: VariableId) => void;
  setRegion: (region: RegionId) => void;
  setYearRange: (yearRange: [number, number]) => void;
  setLayer: (layer: LayerId) => void;
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
};

export const useUiStore = create<UiState>()((set) => ({
  variable: "air_temperature",
  region: "punjab",
  yearRange: [2000, 2025],
  layer: "air_temperature",
  language: "en",
  theme: "dark",
  setVariable: (variable) => set({ variable }),
  setRegion: (region) => set({ region }),
  setYearRange: (yearRange) => set({ yearRange }),
  setLayer: (layer) => set({ layer }),
  setLanguage: (language) => set({ language }),
  setTheme: (theme) => set({ theme }),
}));
