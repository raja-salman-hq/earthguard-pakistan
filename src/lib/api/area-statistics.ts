import { areaStatisticsSchema } from "@/types/area-statistics";
import { requestValidated } from "./client";

export function getAreaStatistics(area: "faisalabad") {
  return requestValidated({
    path: `api/area-statistics?area=${area}`,
    schema: areaStatisticsSchema,
    mock: () => ({ area, lst: [], lulc: [], source: "Static area statistics" }),
    real: async () => {
      const response = await fetch(`/api/area-statistics?area=${area}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`Area statistics request failed (${response.status}).`);
      }
      return response.json();
    },
  });
}
