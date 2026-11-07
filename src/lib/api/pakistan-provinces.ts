import { z } from "zod";
import { REGION_IDS, regionsResponseSchema, type RegionId, type RegionsResponse } from "@/types/api";

const positionSchema = z.tuple([z.number(), z.number()]).rest(z.number());
const ringSchema = z.array(positionSchema).min(4);
const polygonSchema = z.array(ringSchema).min(1);
const geometrySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Polygon"), coordinates: polygonSchema }),
  z.object({
    type: z.literal("MultiPolygon"),
    coordinates: z.array(polygonSchema).min(1),
  }),
]);

const boundarySchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(
    z.object({
      type: z.literal("Feature"),
      geometry: geometrySchema,
      properties: z.object({ shapeName: z.string().min(1) }),
    }),
  ),
});

const regionIdByShapeName: Readonly<Record<string, RegionId>> = {
  Balochistan: "balochistan",
  Sindh: "sindh",
  "Gilgit-Baltistan": "gilgit-baltistan",
  "Azad Kashmir": "azad-kashmir",
  "Khyber Pakhtunkhwa": "khyber-pakhtunkhwa",
  Punjab: "punjab",
  "Islamabad Capital Territory": "islamabad",
};

export async function getPakistanProvinceBoundaries(): Promise<RegionsResponse> {
  const response = await fetch("/data/pakistan-provinces.geojson", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Could not load Pakistan boundaries (/data/pakistan-provinces.geojson, ${response.status}).`,
    );
  }

  const payload: unknown = await response.json();
  const boundaries = boundarySchema.parse(payload);
  const seen = new Set<RegionId>();
  const features = boundaries.features.map((feature) => {
    const regionId = regionIdByShapeName[feature.properties.shapeName];

    if (!regionId) {
      throw new Error(
        `Pakistan boundary name "${feature.properties.shapeName}" does not match a mock region ID.`,
      );
    }

    if (seen.has(regionId)) {
      throw new Error(`Pakistan boundaries contain a duplicate region: ${regionId}.`);
    }

    seen.add(regionId);
    return {
      type: "Feature" as const,
      id: regionId,
      properties: { id: regionId, name: feature.properties.shapeName },
      geometry: feature.geometry,
    };
  });

  const missingRegions = REGION_IDS.filter((regionId) => !seen.has(regionId));
  if (missingRegions.length > 0) {
    throw new Error(
      `Pakistan boundaries are missing mock regions: ${missingRegions.join(", ")}.`,
    );
  }

  return regionsResponseSchema.parse({
    type: "FeatureCollection",
    features,
  });
}
