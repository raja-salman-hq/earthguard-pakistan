import { z } from "zod";

export const FAISALABAD_WEATHER_COORDINATES = {
  latitude: 31.4504,
  longitude: 73.135,
} as const;

const weatherResponseSchema = z.object({
  timezone_abbreviation: z.string().min(1),
  current: z.object({
    temperature_2m: z.number().finite(),
    apparent_temperature: z.number().finite(),
  }),
});

export type FaisalabadWeather = z.infer<typeof weatherResponseSchema>;

export async function getFaisalabadWeather(): Promise<FaisalabadWeather> {
  const params = new URLSearchParams({
    latitude: String(FAISALABAD_WEATHER_COORDINATES.latitude),
    longitude: String(FAISALABAD_WEATHER_COORDINATES.longitude),
    current: "temperature_2m,apparent_temperature",
    timezone: "auto",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo weather request failed (${response.status}).`);
  }

  const result = weatherResponseSchema.safeParse(await response.json());
  if (!result.success) {
    throw new Error("Open-Meteo returned an unexpected weather response.");
  }

  return result.data;
}
