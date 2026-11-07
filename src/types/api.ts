import { z } from "zod";

export const VARIABLE_IDS = [
  "air_temperature",
  "precipitation",
  "vegetation_index",
  "snow_cover",
  "soil_moisture",
  "evapotranspiration",
  "land_surface_temperature",
] as const;

export const REGION_IDS = [
  "punjab",
  "sindh",
  "khyber-pakhtunkhwa",
  "balochistan",
  "gilgit-baltistan",
  "azad-kashmir",
  "islamabad",
] as const;

export const variableIdSchema = z.enum(VARIABLE_IDS);
export const regionIdSchema = z.enum(REGION_IDS);
export const compareModeSchema = z.enum(["regions", "variables"]);
export const compareRegionsSchema = z
  .array(regionIdSchema)
  .max(4)
  .refine((regions) => new Set(regions).size === regions.length);
export const compareVariablesSchema = z
  .array(variableIdSchema)
  .max(2)
  .refine((variables) => new Set(variables).size === variables.length);

export const variableSchema = z.object({
  id: variableIdSchema,
  name: z.string().min(1),
  unit: z.string().min(1),
  description: z.string().min(1),
  source: z.string().min(1),
  availableFrom: z.number().int(),
  availableTo: z.number().int(),
});

export const variablesResponseSchema = z.array(variableSchema);

const positionSchema = z.tuple([z.number(), z.number()]).rest(z.number());
const polygonSchema = z.array(z.array(positionSchema).min(4)).min(1);
const multiPolygonSchema = z.array(polygonSchema).min(1);

const regionGeometrySchema = z.union([
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("Polygon"), coordinates: polygonSchema }),
    z.object({ type: z.literal("MultiPolygon"), coordinates: multiPolygonSchema }),
  ]),
  z.null(),
]);

export const regionFeatureSchema = z.object({
  type: z.literal("Feature"),
  id: regionIdSchema,
  properties: z.object({
    id: regionIdSchema,
    name: z.string().min(1),
  }),
  geometry: regionGeometrySchema,
});

export const regionsResponseSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(regionFeatureSchema),
});

export const timeSeriesQuerySchema = z
  .object({
    variable: variableIdSchema,
    region: regionIdSchema,
    start: z.number().int().min(2000).max(2025),
    end: z.number().int().min(2000).max(2025),
    resolution: z.enum(["monthly", "yearly"]),
  })
  .refine((query) => query.start <= query.end, {
    message: "The start year must not be after the end year.",
    path: ["start"],
  });

export const timeSeriesResponseSchema = z.object({
  variable: variableIdSchema,
  region: regionIdSchema,
  unit: z.string().min(1),
  points: z.array(
    z.object({
      date: z.string().date(),
      value: z.number().finite(),
    }),
  ),
});

export const trendQuerySchema = z
  .object({
    variable: variableIdSchema,
    region: regionIdSchema,
    start: z.number().int().min(2000).max(2025),
    end: z.number().int().min(2000).max(2025),
    lang: z.enum(["en", "ur"]),
  })
  .refine((query) => query.start <= query.end, {
    message: "The start year must not be after the end year.",
    path: ["start"],
  });

export const trendResponseSchema = z.object({
  slope: z.number().finite(),
  unit: z.string().min(1),
  pValue: z.number().min(0).max(1),
  significant: z.boolean(),
  direction: z.enum(["increasing", "decreasing", "no_change"]),
  changeTotal: z.number().finite(),
  changePercent: z.number().finite(),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1),
  trendLine: z
    .array(
      z.object({
        date: z.string().date(),
        value: z.number().finite(),
      }),
    )
    .min(2)
    .optional(),
});

export const mapLayerQuerySchema = z
  .object({
    variable: variableIdSchema,
    year: z.number().int().min(2000).max(2025),
    comparison: z
      .enum(["absolute", "previous-year", "range-start", "backend"])
      .default("absolute"),
    baselineYear: z.number().int().min(2000).max(2025).optional(),
  })
  .superRefine((query, context) => {
    if (query.comparison === "previous-year" && query.year === 2000) {
      context.addIssue({
        code: "custom",
        message: "A previous-year comparison is unavailable for 2000.",
        path: ["year"],
      });
    }

    if (query.comparison === "range-start") {
      if (query.baselineYear === undefined || query.baselineYear > query.year) {
        context.addIssue({
          code: "custom",
          message: "A range-start comparison requires a baseline year no later than the selected year.",
          path: ["baselineYear"],
        });
      }
    } else if (query.baselineYear !== undefined) {
      context.addIssue({
        code: "custom",
        message: "A baseline year is only used for range-start comparisons.",
        path: ["baselineYear"],
      });
    }
  });

export const mapLayerResponseSchema = z.array(
  z.object({
    regionId: regionIdSchema,
    value: z.number().finite(),
  }),
);

export const hotspotsQuerySchema = z.object({
  variable: variableIdSchema,
  limit: z.number().int().min(1).max(25),
});

export const hotspotsResponseSchema = z.array(
  z.object({
    regionId: regionIdSchema,
    value: z.number().finite(),
    unit: z.string().min(1),
    direction: z.enum(["increasing", "decreasing"]),
    changePercent: z.number().finite(),
    significant: z.literal(true),
    summary: z.string().min(1),
  }),
);

export type VariableId = z.infer<typeof variableIdSchema>;
export type RegionId = z.infer<typeof regionIdSchema>;
export type CompareMode = z.infer<typeof compareModeSchema>;
export type Variable = z.infer<typeof variableSchema>;
export type VariablesResponse = z.infer<typeof variablesResponseSchema>;
export type RegionsResponse = z.infer<typeof regionsResponseSchema>;
export type TimeSeriesQuery = z.infer<typeof timeSeriesQuerySchema>;
export type TimeSeriesResponse = z.infer<typeof timeSeriesResponseSchema>;
export type TrendQuery = z.infer<typeof trendQuerySchema>;
export type TrendResponse = z.infer<typeof trendResponseSchema>;
export type MapLayerQuery = z.infer<typeof mapLayerQuerySchema>;
export type MapLayerResponse = z.infer<typeof mapLayerResponseSchema>;
export type HotspotsQuery = z.infer<typeof hotspotsQuerySchema>;
export type HotspotsResponse = z.infer<typeof hotspotsResponseSchema>;
