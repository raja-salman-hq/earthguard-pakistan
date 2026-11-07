import type { ChangeBasis, MapLayerType } from "@/store/ui-store";
import type { MapLayerQuery, VariableId } from "@/types/api";

export function createMapLayerQuery(
  variable: VariableId,
  year: number,
  layerType: MapLayerType,
  changeBasis: ChangeBasis,
  startYear: number,
): MapLayerQuery {
  if (layerType === "absolute") {
    return { variable, year, comparison: "absolute" };
  }

  if (changeBasis === "range-start") {
    return { variable, year, comparison: "range-start", baselineYear: startYear };
  }

  return { variable, year, comparison: changeBasis };
}
