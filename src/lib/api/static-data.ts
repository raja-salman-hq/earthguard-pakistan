import {
  areaIdSchema,
  areaIndicatorsSchema,
  areasConfigSchema,
  studyAreaFeatureCollectionSchema,
  type AreaId,
  type AreaIndicators,
  type AreasConfig,
} from "@/types/area-data";
import { readStaticJson } from "./client";
import { areasConfig } from "@/lib/areas";

export class NoDataError extends Error {
  readonly requestedLabel: string;

  constructor(requestedLabel: string) {
    super(`No data yet for ${requestedLabel}. Available now: Faisalabad (Punjab).`);
    this.name = "NoDataError";
    this.requestedLabel = requestedLabel;
  }
}

export async function getAreasConfig(): Promise<AreasConfig> {
  return areasConfigSchema.parse(areasConfig);
}

export async function getAreaIndicators(areaId: string): Promise<AreaIndicators> {
  const parsedAreaId = areaIdSchema.safeParse(areaId);
  if (!parsedAreaId.success) {
    throw new NoDataError(areaId || "this area");
  }

  const config = await getAreasConfig();
  const area = config.areas.find((candidate) => candidate.id === parsedAreaId.data);
  if (!area || area.status !== "available") {
    throw new NoDataError(area?.name ?? areaId);
  }

  return areaIndicatorsSchema.parse(await readStaticJson(area.dataPath));
}

export async function getAreaStudyGeometry(areaId: AreaId) {
  if (areaId !== "faisalabad") {
    throw new NoDataError(areaId);
  }
  const payload = await readStaticJson(`/data/areas/${areaId}/study-area.geojson`);
  return studyAreaFeatureCollectionSchema.parse(payload);
}
