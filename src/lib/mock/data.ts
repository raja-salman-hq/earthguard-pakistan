import type {
  MapLayerQuery,
  MapLayerResponse,
  RegionId,
  RegionsResponse,
  TimeSeriesQuery,
  TimeSeriesResponse,
  TrendQuery,
  TrendResponse,
  Variable,
  VariableId,
} from "@/types/api";

const DEMO_SOURCE = "Synthetic demo data — not NASA observations";

// All values and regional offsets below are illustrative and are not observations.
const variables: Variable[] = [
  {
    id: "air_temperature",
    name: "Air temperature",
    unit: "°C",
    description: "Illustrative monthly near-surface air temperature.",
    source: DEMO_SOURCE,
    availableFrom: 2000,
    availableTo: 2025,
  },
  {
    id: "precipitation",
    name: "Precipitation",
    unit: "mm/month",
    description: "Illustrative monthly precipitation total.",
    source: DEMO_SOURCE,
    availableFrom: 2000,
    availableTo: 2025,
  },
  {
    id: "vegetation_index",
    name: "Vegetation index",
    unit: "index",
    description: "Illustrative normalized vegetation index (0 to 1).",
    source: DEMO_SOURCE,
    availableFrom: 2000,
    availableTo: 2025,
  },
  {
    id: "snow_cover",
    name: "Snow cover",
    unit: "km²",
    description: "Illustrative snow-covered area.",
    source: DEMO_SOURCE,
    availableFrom: 2000,
    availableTo: 2025,
  },
  {
    id: "soil_moisture",
    name: "Soil moisture",
    unit: "m³/m³",
    description: "Illustrative volumetric soil moisture.",
    source: DEMO_SOURCE,
    availableFrom: 2000,
    availableTo: 2025,
  },
  {
    id: "evapotranspiration",
    name: "Evapotranspiration",
    unit: "mm/day",
    description: "Illustrative daily evapotranspiration rate.",
    source: DEMO_SOURCE,
    availableFrom: 2000,
    availableTo: 2025,
  },
  {
    id: "land_surface_temperature",
    name: "Land surface temperature",
    unit: "°C",
    description: "Illustrative land surface temperature.",
    source: DEMO_SOURCE,
    availableFrom: 2000,
    availableTo: 2025,
  },
];

const regionNames: Record<RegionId, string> = {
  punjab: "Punjab",
  sindh: "Sindh",
  "khyber-pakhtunkhwa": "Khyber Pakhtunkhwa",
  balochistan: "Balochistan",
  "gilgit-baltistan": "Gilgit-Baltistan",
  "azad-kashmir": "Azad Kashmir",
  islamabad: "Islamabad",
};

const regionIds: RegionId[] = [
  "punjab",
  "sindh",
  "khyber-pakhtunkhwa",
  "balochistan",
  "gilgit-baltistan",
  "azad-kashmir",
  "islamabad",
];

const syntheticModels: Record<
  VariableId,
  { baseline: number; annualChange: number; amplitude: number; phase: number; spread: number; precision: number }
> = {
  air_temperature: {
    baseline: 24,
    annualChange: 0.035,
    amplitude: 10,
    phase: -Math.PI / 2,
    spread: 0.8,
    precision: 1,
  },
  precipitation: {
    baseline: 38,
    annualChange: -0.12,
    amplitude: 48,
    phase: -Math.PI / 2,
    spread: 5,
    precision: 1,
  },
  vegetation_index: {
    baseline: 0.38,
    annualChange: 0.002,
    amplitude: 0.2,
    phase: -Math.PI / 2,
    spread: 0.02,
    precision: 3,
  },
  snow_cover: {
    baseline: 3600,
    annualChange: -12,
    amplitude: 2600,
    phase: Math.PI / 2,
    spread: 350,
    precision: 0,
  },
  soil_moisture: {
    baseline: 0.19,
    annualChange: -0.0004,
    amplitude: 0.09,
    phase: -Math.PI / 2,
    spread: 0.012,
    precision: 3,
  },
  evapotranspiration: {
    baseline: 2.8,
    annualChange: 0.006,
    amplitude: 1.8,
    phase: -Math.PI / 2,
    spread: 0.2,
    precision: 2,
  },
  land_surface_temperature: {
    baseline: 27,
    annualChange: 0.04,
    amplitude: 13,
    phase: -Math.PI / 2,
    spread: 1,
    precision: 1,
  },
};

const syntheticTrends: Record<VariableId, TrendResponse> = {
  air_temperature: {
    slope: 0.035,
    unit: "°C/year",
    pValue: 0.03,
    significant: true,
    direction: "increasing",
    changeTotal: 0.9,
    changePercent: 3.8,
    confidence: 0.95,
    summary: "Demo only: this generated series has a gentle upward pattern.",
  },
  precipitation: {
    slope: -0.12,
    unit: "mm/month/year",
    pValue: 0.38,
    significant: false,
    direction: "decreasing",
    changeTotal: -3,
    changePercent: -7.9,
    confidence: 0.95,
    summary: "Demo only: this generated series varies seasonally with a slight downward pattern.",
  },
  vegetation_index: {
    slope: 0.002,
    unit: "index/year",
    pValue: 0.04,
    significant: true,
    direction: "increasing",
    changeTotal: 0.05,
    changePercent: 13.2,
    confidence: 0.95,
    summary: "Demo only: this generated series has a small upward pattern.",
  },
  snow_cover: {
    slope: -12,
    unit: "km²/year",
    pValue: 0.12,
    significant: false,
    direction: "decreasing",
    changeTotal: -300,
    changePercent: -8.3,
    confidence: 0.95,
    summary: "Demo only: this generated series has a slight downward pattern.",
  },
  soil_moisture: {
    slope: -0.0004,
    unit: "m³/m³/year",
    pValue: 0.22,
    significant: false,
    direction: "decreasing",
    changeTotal: -0.01,
    changePercent: -5.3,
    confidence: 0.95,
    summary: "Demo only: this generated series has a small downward pattern.",
  },
  evapotranspiration: {
    slope: 0.006,
    unit: "mm/day/year",
    pValue: 0.08,
    significant: false,
    direction: "increasing",
    changeTotal: 0.15,
    changePercent: 5.4,
    confidence: 0.95,
    summary: "Demo only: this generated series has a gentle upward pattern.",
  },
  land_surface_temperature: {
    slope: 0.04,
    unit: "°C/year",
    pValue: 0.02,
    significant: true,
    direction: "increasing",
    changeTotal: 1,
    changePercent: 3.7,
    confidence: 0.95,
    summary: "Demo only: this generated series has a gentle upward pattern.",
  },
};

const syntheticTrendSummaries: Record<VariableId, Record<"en" | "ur", string>> = {
  air_temperature: {
    en: syntheticTrends.air_temperature.summary,
    ur: "صرف ڈیمو: یہ مصنوعی سلسلہ بتدریج بڑھتا ہوا نمونہ دکھاتا ہے۔",
  },
  precipitation: {
    en: syntheticTrends.precipitation.summary,
    ur: "صرف ڈیمو: اس مصنوعی سلسلے میں موسمی اتار چڑھاؤ اور معمولی کمی دکھائی گئی ہے۔",
  },
  vegetation_index: {
    en: syntheticTrends.vegetation_index.summary,
    ur: "صرف ڈیمو: اس مصنوعی سلسلے میں معمولی اضافہ دکھایا گیا ہے۔",
  },
  snow_cover: {
    en: syntheticTrends.snow_cover.summary,
    ur: "صرف ڈیمو: اس مصنوعی سلسلے میں معمولی کمی دکھائی گئی ہے۔",
  },
  soil_moisture: {
    en: syntheticTrends.soil_moisture.summary,
    ur: "صرف ڈیمو: اس مصنوعی سلسلے میں معمولی کمی دکھائی گئی ہے۔",
  },
  evapotranspiration: {
    en: syntheticTrends.evapotranspiration.summary,
    ur: "صرف ڈیمو: اس مصنوعی سلسلے میں بتدریج اضافہ دکھایا گیا ہے۔",
  },
  land_surface_temperature: {
    en: syntheticTrends.land_surface_temperature.summary,
    ur: "صرف ڈیمو: یہ مصنوعی سلسلہ بتدریج بڑھتا ہوا نمونہ دکھاتا ہے۔",
  },
};

export function getMockVariables(): Variable[] {
  return variables;
}

export function getMockRegions(): RegionsResponse {
  return {
    type: "FeatureCollection",
    features: regionIds.map((id) => ({
      type: "Feature",
      id,
      properties: { id, name: regionNames[id] },
      geometry: null,
    })),
  };
}

function getSyntheticValue(
  variable: VariableId,
  region: RegionId,
  year: number,
  month: number,
): number {
  const model = syntheticModels[variable];
  const yearIndex = year - 2000;
  const regionIndex = regionIds.indexOf(region);
  const seasonal = model.amplitude * Math.sin(((month - 1) / 12) * 2 * Math.PI + model.phase);
  const smallCycle = Math.sin(yearIndex * 1.7 + month * 0.9 + regionIndex) * model.amplitude * 0.025;
  const value =
    model.baseline +
    model.annualChange * yearIndex +
    model.spread * regionIndex +
    seasonal +
    smallCycle;

  return Number(Math.max(0, value).toFixed(model.precision));
}

export function getMockTimeSeries(query: TimeSeriesQuery): TimeSeriesResponse {
  const variable = variables.find((item) => item.id === query.variable);

  if (!variable) {
    throw new Error(`No synthetic demo model is configured for ${query.variable}.`);
  }

  const points: TimeSeriesResponse["points"] = [];

  for (let year = query.start; year <= query.end; year += 1) {
    if (query.resolution === "yearly") {
      const month = 6;
      points.push({
        date: `${year}-01-01`,
        value: getSyntheticValue(query.variable, query.region, year, month),
      });
      continue;
    }

    for (let month = 1; month <= 12; month += 1) {
      points.push({
        date: `${year}-${String(month).padStart(2, "0")}-01`,
        value: getSyntheticValue(query.variable, query.region, year, month),
      });
    }
  }

  return {
    variable: query.variable,
    region: query.region,
    unit: variable.unit,
    points,
  };
}

export function getMockTrendForVariable(query: TrendQuery): TrendResponse {
  const { variable, region, start, end } = query;

  return {
    ...syntheticTrends[variable],
    summary: syntheticTrendSummaries[variable][query.lang],
    trendLine: [
      {
        date: `${start}-01-01`,
        value: getSyntheticValue(variable, region, start, 1),
      },
      {
        date: `${end}-01-01`,
        value: getSyntheticValue(variable, region, end, 1),
      },
    ],
  };
}

export function getMockMapLayer(query: MapLayerQuery): MapLayerResponse {
  return regionIds.map((regionId) => ({
    regionId,
    value: mapLayerValue(query, regionId),
  }));
}

function mapLayerValue(query: MapLayerQuery, regionId: RegionId): number {
  const value = getSyntheticValue(query.variable, regionId, query.year, 6);

  if (query.comparison === "absolute") {
    return value;
  }

  if (query.comparison === "backend") {
    return Number(
      (value - getSyntheticValue(query.variable, regionId, 2000, 6)).toFixed(3),
    );
  }

  const baselineYear =
    query.comparison === "range-start"
      ? query.baselineYear
      : query.year - 1;

  if (baselineYear === undefined) {
    throw new Error("A baseline year is required for a range-start map comparison.");
  }

  return Number(
    (value - getSyntheticValue(query.variable, regionId, baselineYear, 6)).toFixed(3),
  );
}

export function getMockHotspots(variable: VariableId, limit: number) {
  const trend = syntheticTrends[variable];
  const definition = variables.find((item) => item.id === variable);
  if (!definition) {
    throw new Error(`No synthetic demo model is configured for ${variable}.`);
  }

  const direction = trend.direction === "decreasing" ? "decreasing" : "increasing";
  return regionIds
    .map((regionId, index) => ({
    regionId,
    value: getSyntheticValue(variable, regionId, 2025, 6),
    unit: definition.unit,
    direction,
    changePercent: trend.changePercent + index * 0.5,
    significant: true as const,
    summary: `Demo only: generated change pattern for ${regionNames[regionId]}.`,
    }))
    .sort((left, right) => Math.abs(right.changePercent) - Math.abs(left.changePercent))
    .slice(0, limit);
}
