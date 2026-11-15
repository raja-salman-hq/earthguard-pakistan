import { z } from "zod";

export const areaLSTStatisticSchema = z.object({
  category: z.string().min(1),
  changeCelsius: z.number().finite(),
  year2001: z.number().finite(),
  year2024: z.number().finite(),
});

export const areaLULCStatisticSchema = z.object({
  category: z.string().min(1),
  areaHectares: z.number().finite(),
  areaKm2: z.number().finite(),
});

export const areaStatisticsSchema = z.object({
  area: z.literal("faisalabad"),
  lst: z.array(areaLSTStatisticSchema),
  lulc: z.array(areaLULCStatisticSchema),
  source: z.string().min(1),
});

export type AreaLSTStatistic = z.infer<typeof areaLSTStatisticSchema>;
export type AreaLULCStatistic = z.infer<typeof areaLULCStatisticSchema>;
export type AreaStatistics = z.infer<typeof areaStatisticsSchema>;
