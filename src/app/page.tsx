import HomeContent from "./home-content";
import { getPageMetadata } from "@/lib/site-metadata";
import {
  getMockMapLayer,
  getMockTimeSeries,
  getMockTrendForVariable,
  getMockVariables,
} from "@/lib/mock/data";
import {
  HERO_MAP_VIEWBOX,
  pakistanHeroProvincePaths,
} from "@/components/landing/pakistan-hero-map-data";
import type { RegionId, VariableId } from "@/types/api";

export const metadata = getPageMetadata("home");

export default function HomePage() {
  const variables = getMockVariables();
  const mapVariable = variables.find((variable) => variable.id === "land_surface_temperature");
  if (!mapVariable) {
    throw new Error("The landing demo layer requires land surface temperature mock data.");
  }

  const mapValues = getMockMapLayer({
    variable: mapVariable.id,
    year: mapVariable.availableTo,
    comparison: "absolute",
  });
  const values = mapValues.map(({ value }) => value);
  const minimumValue = Math.min(...values);
  const maximumValue = Math.max(...values);
  const valueSpan = maximumValue - minimumValue || 1;
  const mapShapes = pakistanHeroProvincePaths.map((shape) => {
    const value = mapValues.find((item) => item.regionId === shape.regionId)?.value;
    if (value === undefined) {
      throw new Error(`The landing demo layer is missing ${shape.regionId}.`);
    }

    return {
      ...shape,
      colorStep: Math.min(5, Math.floor(((value - minimumValue) / valueSpan) * 5) + 1),
    };
  });

  const heroValue = mapValues.find((item) => item.regionId === "punjab");
  if (!heroValue) {
    throw new Error("The landing demo layer is missing Punjab.");
  }

  const temperatureVariable = variables.find((variable) => variable.id === "air_temperature");
  if (!temperatureVariable) {
    throw new Error("The landing demo requires air temperature mock data.");
  }
  const heroSeries = getMockTimeSeries({
    variable: temperatureVariable.id,
    region: "punjab",
    start: temperatureVariable.availableFrom,
    end: temperatureVariable.availableTo,
    resolution: "monthly",
  });
  const heroTrend = getMockTrendForVariable({
    variable: "air_temperature",
    region: "punjab",
    start: temperatureVariable.availableFrom,
    end: temperatureVariable.availableTo,
    lang: "en",
  });
  const insightSetups = [
    { variable: "air_temperature", region: "punjab" },
    { variable: "precipitation", region: "sindh" },
    { variable: "vegetation_index", region: "khyber-pakhtunkhwa" },
  ] as const;
  const insights = insightSetups.map(({ variable, region }) => {
    const definition = variables.find((item) => item.id === variable);
    if (!definition) {
      throw new Error(`The landing demo is missing ${variable}.`);
    }

    const trend = getMockTrendForVariable({
      variable,
      region,
      start: definition.availableFrom,
      end: definition.availableTo,
      lang: "en",
    });
    return {
      variable,
      region,
      unit: definition.unit,
      start: definition.availableFrom,
      end: definition.availableTo,
      direction: trend.direction,
      significant: trend.significant,
      changeTotal: trend.changeTotal,
      changePercent: trend.changePercent,
    };
  });

  const variableCards = variables.map(({ id, unit }) => ({ id, unit }));
  const heroMap = {
    viewBox: HERO_MAP_VIEWBOX,
    shapes: mapShapes,
    value: heroValue.value,
    unit: mapVariable.unit,
    variable: mapVariable.id as VariableId,
    region: "punjab" as RegionId,
    year: mapVariable.availableTo,
  };

  return (
    <HomeContent
      variables={variableCards}
      heroMap={heroMap}
      heroSparklineValues={heroSeries.points.map((point) => point.value)}
      heroTrend={{
        direction: heroTrend.direction,
        significant: heroTrend.significant,
      }}
      insights={insights}
    />
  );
}
