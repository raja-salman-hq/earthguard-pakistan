import type { AreasConfig } from "@/types/area-data";

/** Editable coverage hierarchy. Coordinates are intentionally only stored for available areas. */
export const areasConfig = {
  provinces: [
    { id: "punjab", name: "Punjab" },
    { id: "sindh", name: "Sindh" },
    { id: "khyber-pakhtunkhwa", name: "Khyber Pakhtunkhwa" },
    { id: "balochistan", name: "Balochistan" },
    { id: "gilgit-baltistan", name: "Gilgit-Baltistan" },
    { id: "azad-kashmir", name: "Azad Kashmir" },
    { id: "islamabad", name: "Islamabad" },
  ],
  areas: [
    {
      id: "faisalabad",
      name: "Faisalabad",
      provinceId: "punjab",
      status: "available",
      center: [73.19163228649819, 31.230950622396065],
      bounds: [72.59720331218332, 30.584880923958803, 73.78606126081307, 31.877020320833328],
      indicators: ["land_surface_temperature", "precipitation", "vegetation_index"],
      dataPath: "/data/areas/faisalabad/indicators.json",
    },
    { id: "lahore", name: "Lahore", provinceId: "punjab", status: "coming_soon", indicators: [], dataPath: "/data/areas/lahore/indicators.json" },
    { id: "rawalpindi", name: "Rawalpindi", provinceId: "punjab", status: "coming_soon", indicators: [], dataPath: "/data/areas/rawalpindi/indicators.json" },
    { id: "multan", name: "Multan", provinceId: "punjab", status: "coming_soon", indicators: [], dataPath: "/data/areas/multan/indicators.json" },
    { id: "gujranwala", name: "Gujranwala", provinceId: "punjab", status: "coming_soon", indicators: [], dataPath: "/data/areas/gujranwala/indicators.json" },
  ],
} satisfies AreasConfig;
