import {
  hotspotsQuerySchema,
  hotspotsResponseSchema,
  mapLayerQuerySchema,
  mapLayerResponseSchema,
  regionsResponseSchema,
  timeSeriesQuerySchema,
  timeSeriesResponseSchema,
  trendQuerySchema,
  trendResponseSchema,
  variablesResponseSchema,
} from "@/types/api";
import {
  getMockHotspots,
  getMockMapLayer,
  getMockRegions,
  getMockTimeSeries,
  getMockTrendForVariable,
  getMockVariables,
} from "@/lib/mock/data";
import { requestValidated } from "./client";
import { getPakistanProvinceBoundaries } from "./pakistan-provinces";
import {
  getAreaIndicators,
  getAreasConfig,
  getAreaStudyGeometry,
  NoDataError,
} from "./static-data";
import type {
  HotspotsQuery,
  MapLayerQuery,
  TimeSeriesQuery,
  TrendQuery,
} from "@/types/api";

export function getVariables() {
  return requestValidated({
    path: "api/variables",
    schema: variablesResponseSchema,
    mock: getMockVariables,
    real: async () => {
      const { indicators, meta } = await getAreaIndicators("faisalabad");
      return indicators.map((indicator) => ({
        id: indicator.id,
        name: indicator.name,
        unit: indicator.unit,
        description: indicator.description,
        source: indicator.source,
        availableFrom: meta.period.start,
        availableTo: meta.period.end,
      }));
    },
  });
}

export function getRegions() {
  return requestValidated({
    path: "api/regions",
    schema: regionsResponseSchema,
    mock: getMockRegions,
    real: () => getPakistanProvinceBoundaries(),
  });
}

export function getPakistanProvinceRegions() {
  return getPakistanProvinceBoundaries();
}

export function getAreas() {
  return getAreasConfig();
}

export { getAreaIndicators };

export function getAreaStudyArea(areaId: "faisalabad") {
  return getAreaStudyGeometry(areaId);
}

export function getTimeSeries(query: TimeSeriesQuery) {
  const validQuery = timeSeriesQuerySchema.parse(query);

  return requestValidated({
    path: "api/timeseries",
    schema: timeSeriesResponseSchema,
    mock: () => getMockTimeSeries(validQuery),
    real: async () => {
      const areaId =
        validQuery.area ??
        (validQuery.region === "faisalabad" ? "faisalabad" : undefined);
      if (!areaId) {
        throw new NoDataError(validQuery.region);
      }

      const data = await getAreaIndicators(areaId);
      const indicator = data.indicators.find((item) => item.id === validQuery.variable);
      if (!indicator) {
        throw new NoDataError(data.meta.areaName);
      }

      const points =
        validQuery.resolution === "yearly"
          ? indicator.series
              .filter((point) => point.year >= validQuery.start && point.year <= validQuery.end)
              .map((point) => ({
                date: `${point.year}-01-01`,
                value: point.value,
                valid_months: point.valid_months,
              }))
          : (indicator.monthly_series ?? [])
              .filter((point) => {
                const year = Number(point.date.slice(0, 4));
                return year >= validQuery.start && year <= validQuery.end;
              })
              .map((point) => ({
                date: point.date,
                value: point.value,
                valid_months: point.valid_months,
              }));

      return {
        variable: indicator.id,
        region: validQuery.region,
        unit:
          validQuery.resolution === "monthly"
            ? (indicator.monthly_unit ?? indicator.unit)
            : indicator.unit,
        points,
        availableResolutions: [
          "yearly" as const,
          ...(indicator.monthly_series?.length ? ["monthly" as const] : []),
        ],
        source:
          validQuery.resolution === "monthly"
            ? indicator.monthly_source
            : indicator.source,
        dataStatus: data.meta.status,
      };
    },
  });
}

export function getTrend(query: TrendQuery) {
  const validQuery = trendQuerySchema.parse(query);

  return requestValidated({
    path: "api/trend",
    schema: trendResponseSchema.nullable(),
    mock: () => getMockTrendForVariable(validQuery),
    real: async () => {
      const areaId =
        validQuery.area ??
        (validQuery.region === "faisalabad" ? "faisalabad" : undefined);
      if (!areaId) {
        throw new NoDataError(validQuery.region);
      }

      const data = await getAreaIndicators(areaId);
      const indicator = data.indicators.find((item) => item.id === validQuery.variable);
      if (!indicator) {
        throw new NoDataError(data.meta.areaName);
      }
      if (!indicator.trend) {
        return null;
      }

      const trend = indicator.trend;
      return {
        slope: trend.sen_slope ?? undefined,
        unit: trend.slope_unit ?? undefined,
        pValue: trend.p_value,
        significant: trend.significant,
        direction: trend.direction,
        tau: trend.tau,
        z: trend.z,
        senSlope: trend.sen_slope,
        slopeCi95: trend.slope_ci95,
        nYears: trend.n_years,
        test: trend.test,
        notes: trend.notes,
        trendLine: trend.trend_line?.map((point) => ({
          date: `${point.year}-01-01`,
          value: point.value,
        })),
      };
    },
  });
}

export function getMapLayer(query: MapLayerQuery) {
  const validQuery = mapLayerQuerySchema.parse(query);

  return requestValidated({
    path: "api/map-layer",
    schema: mapLayerResponseSchema,
    mock: () => getMockMapLayer(validQuery),
    real: async () => [],
  });
}

export function getHotspots(query: HotspotsQuery) {
  const validQuery = hotspotsQuerySchema.parse(query);

  return requestValidated({
    path: "api/hotspots",
    schema: hotspotsResponseSchema,
    mock: () => getMockHotspots(validQuery.variable, validQuery.limit),
    real: async () => [],
  });
}

export { NoDataError };
