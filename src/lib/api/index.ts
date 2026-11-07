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
  });
}

export function getRegions() {
  return requestValidated({
    path: "api/regions",
    schema: regionsResponseSchema,
    mock: getMockRegions,
  });
}

export function getPakistanProvinceRegions() {
  return getPakistanProvinceBoundaries();
}

export function getTimeSeries(query: TimeSeriesQuery) {
  const validQuery = timeSeriesQuerySchema.parse(query);

  return requestValidated({
    path: "api/timeseries",
    schema: timeSeriesResponseSchema,
    query: validQuery,
    mock: () => getMockTimeSeries(validQuery),
  });
}

export function getTrend(query: TrendQuery) {
  const validQuery = trendQuerySchema.parse(query);

  return requestValidated({
    path: "api/trend",
    schema: trendResponseSchema,
    query: validQuery,
    mock: () => getMockTrendForVariable(validQuery.variable),
  });
}

export function getMapLayer(query: MapLayerQuery) {
  const validQuery = mapLayerQuerySchema.parse(query);

  return requestValidated({
    path: "api/map-layer",
    schema: mapLayerResponseSchema,
    query: validQuery,
    mock: () => getMockMapLayer(validQuery),
  });
}

export function getHotspots(query: HotspotsQuery) {
  const validQuery = hotspotsQuerySchema.parse(query);

  return requestValidated({
    path: "api/hotspots",
    schema: hotspotsResponseSchema,
    query: validQuery,
    mock: () => getMockHotspots(validQuery.variable, validQuery.limit),
  });
}
