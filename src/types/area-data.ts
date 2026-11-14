import { z } from "zod";
import { PROVINCE_IDS, VARIABLE_IDS } from "./api.ts";

export const DATA_STATUSES = ["draft", "verified", "placeholder"] as const;
export const dataStatusSchema = z.enum(DATA_STATUSES);
export const areaIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const areaProvinceIdSchema = z.enum(PROVINCE_IDS);

const positionSchema = z.tuple([z.number().finite(), z.number().finite()]).rest(z.number().finite());
const polygonSchema = z.array(z.array(positionSchema).min(4)).min(1);
const geometrySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Polygon"), coordinates: polygonSchema }),
  z.object({
    type: z.literal("MultiPolygon"),
    coordinates: z.array(polygonSchema).min(1),
  }),
]);

export const provincesConfigSchema = z.object({
  id: areaProvinceIdSchema,
  name: z.string().min(1),
});

export const areaConfigSchema = z.object({
  id: areaIdSchema,
  name: z.string().min(1),
  provinceId: areaProvinceIdSchema,
  status: z.enum(["available", "coming_soon"]),
  center: z.tuple([z.number().finite(), z.number().finite()]),
  bounds: z.tuple([
    z.number().finite(),
    z.number().finite(),
    z.number().finite(),
    z.number().finite(),
  ]),
  indicators: z.array(z.enum(VARIABLE_IDS)),
  dataPath: z.string().startsWith("/data/"),
});

export const areasConfigSchema = z.object({
  provinces: z.array(provincesConfigSchema),
  areas: z.array(areaConfigSchema),
});

export const annualSeriesPointSchema = z.object({
  year: z.number().int(),
  value: z.number().finite().nullable(),
  valid_months: z.number().int().min(0).max(12).nullable(),
});

export const monthlySeriesPointSchema = z.object({
  date: z.string().date(),
  value: z.number().finite().nullable(),
  valid_months: z.number().int().min(0).max(1).nullable(),
});

export const trendResultSchema = z.object({
  test: z.string().min(1).optional(),
  tau: z.number().finite().nullable().optional(),
  z: z.number().finite().nullable().optional(),
  p_value: z.number().min(0).max(1).nullable().optional(),
  significant: z.boolean().nullable().optional(),
  direction: z.enum(["increasing", "decreasing", "no_change"]).nullable().optional(),
  sen_slope: z.number().finite().nullable().optional(),
  slope_unit: z.string().min(1).nullable().optional(),
  slope_ci95: z.tuple([z.number().finite(), z.number().finite()]).nullable().optional(),
  trend_line: z
    .array(z.object({ year: z.number().int(), value: z.number().finite() }))
    .optional(),
  n_years: z.number().int().min(1).nullable().optional(),
  notes: z.array(z.string()).optional(),
});

export const indicatorDataSchema = z.object({
  id: z.enum(VARIABLE_IDS),
  name: z.string().min(1),
  unit: z.string().min(1),
  monthly_unit: z.string().min(1).optional(),
  description: z.string().min(1),
  source: z.string().min(1),
  monthly_source: z.string().min(1).optional(),
  series: z.array(annualSeriesPointSchema),
  monthly_series: z.array(monthlySeriesPointSchema).optional(),
  trend: trendResultSchema.nullable(),
}).superRefine((indicator, context) => {
  if (indicator.monthly_series?.length && !indicator.monthly_source) {
    context.addIssue({
      code: "custom",
      message: "Indicators with monthly observations must identify their monthly source.",
      path: ["monthly_source"],
    });
  }
});

export const areaIndicatorsSchema = z.object({
  meta: z.object({
    areaId: areaIdSchema,
    areaName: z.string().min(1),
    provinceId: areaProvinceIdSchema,
    period: z.object({ start: z.number().int(), end: z.number().int() }),
    status: dataStatusSchema,
    warnings: z.array(z.string()),
  }),
  indicators: z.array(indicatorDataSchema).min(1),
});

export const studyAreaFeatureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z
    .array(
      z.object({
        type: z.literal("Feature"),
        id: z.string().min(1),
        properties: z.object({
          kind: z.enum(["district", "buffer"]),
          name: z.string().min(1),
        }),
        geometry: geometrySchema,
      }),
    )
    .length(2),
});

export const lulcDataSchema = z.object({
  status: z.enum(["available", "in_progress", "unavailable"]),
  images: z
    .array(
      z.object({
        year: z.number().int(),
        src: z.string().startsWith("/"),
      }),
    )
    .optional(),
  bounds: z.tuple([
    z.number().finite(),
    z.number().finite(),
    z.number().finite(),
    z.number().finite(),
  ]).optional(),
  legend: z
    .array(z.object({ label: z.string().min(1), color: z.string().min(1) }))
    .optional(),
  areaChange: z
    .array(
      z.object({
        category: z.string().min(1),
        areaHectares: z.number().finite(),
        areaKm2: z.number().finite(),
      }),
    )
    .optional(),
});

export type AreaId = z.infer<typeof areaIdSchema>;
export type AreaConfig = z.infer<typeof areaConfigSchema>;
export type AreasConfig = z.infer<typeof areasConfigSchema>;
export type AreaIndicators = z.infer<typeof areaIndicatorsSchema>;
export type IndicatorData = z.infer<typeof indicatorDataSchema>;
export type AnnualSeriesPoint = z.infer<typeof annualSeriesPointSchema>;
export type MonthlySeriesPoint = z.infer<typeof monthlySeriesPointSchema>;
export type TrendResult = z.infer<typeof trendResultSchema>;
