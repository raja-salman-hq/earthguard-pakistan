import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  areaIndicatorsSchema,
  areasConfigSchema,
  lulcDataSchema,
  studyAreaFeatureCollectionSchema,
} from "../src/types/area-data.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = path.join(root, "public", "data");

async function readJson(filePath) {
  const payload = JSON.parse(await readFile(filePath, "utf8"));
  return payload;
}

function nullCount(series) {
  return series.reduce((count, point) => count + (point.value === null ? 1 : 0), 0);
}

const areasPath = path.join(dataRoot, "areas.json");
const areas = areasConfigSchema.parse(await readJson(areasPath));
console.log(`areas.json: valid; ${areas.areas.length} area(s), ${areas.provinces.length} provinces`);

for (const area of areas.areas) {
  const areaFile = path.join(root, "public", area.dataPath.replace(/^\//, ""));
  const indicatorData = areaIndicatorsSchema.parse(await readJson(areaFile));
  console.log(
    `${area.id}: status=${indicatorData.meta.status}; years=${indicatorData.meta.period.start}-${indicatorData.meta.period.end}`,
  );
  for (const indicator of indicatorData.indicators) {
    const firstYear = indicator.series[0]?.year ?? "none";
    const lastYear = indicator.series.at(-1)?.year ?? "none";
    console.log(
      `  ${indicator.id}: annual=${firstYear}-${lastYear}, null_values=${nullCount(indicator.series)}, ` +
        `monthly=${indicator.monthly_series?.length ?? 0}, ` +
        `monthly_null_values=${indicator.monthly_series ? nullCount(indicator.monthly_series) : 0}`,
    );
  }

  const studyPath = path.join(root, "public", "data", "areas", area.id, "study-area.geojson");
  const studyData = studyAreaFeatureCollectionSchema.parse(await readJson(studyPath));
  const studySize = (await stat(studyPath)).size;
  if (studySize >= 500 * 1024) {
    throw new Error(`${area.id} study-area.geojson must be under 500 KB (actual ${studySize} bytes).`);
  }
  if (studyData.features.length !== 2) {
    throw new Error(`${area.id} study-area.geojson must include district and buffer features.`);
  }
  console.log(`  study-area.geojson: valid; ${studySize} bytes; district + buffer features`);

  const lulcPath = path.join(root, "public", "data", "areas", area.id, "lulc.json");
  try {
    const lulcStats = await stat(lulcPath);
    if (lulcStats.isFile()) {
      const lulc = lulcDataSchema.parse(await readJson(lulcPath));
      console.log(`  lulc.json: valid; status=${lulc.status}`);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
    console.log("  lulc.json: not supplied");
  }
}
