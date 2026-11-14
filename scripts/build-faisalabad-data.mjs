import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  areaIndicatorsSchema,
  areasConfigSchema,
  studyAreaFeatureCollectionSchema,
} from "../src/types/area-data.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "public", "data", "areas", "faisalabad");
const sourceFiles = {
  annualCombined: "data/annual/gee2024/Faisalabad_LST_Rainfall_NDVI_Annual_2001_2024.csv",
  annualMaster: "data/annual/hasnain/01_YEARLY_MASTER_CSV_2001-2024.csv",
  annualRainfallHasnain: "data/annual/hasnain/YEARLY_RAINFALL_2001-2024_FINAL.csv",
  monthlyLst: "data/cleaned/hasnain/MONTHLY_LST_2001-2024_FINAL.csv",
  monthlyRainfall: "data/cleaned/hasnain/MONTHLY_RAINFALL_2001-2024_FINAL.csv",
  annualNdviHasnain: "data/cleaned/ndvi/Faisalabad_Annual_NDVI_Analysis_2001_2024.csv",
  annualNdviHasnainCopy: "data/cleaned/ndvi/Faisalabad_Annual_NDVI_Analysis_2001_2024(1).csv",
  monthlyNdvi: "data/cleaned/ndvi/Faisalabad_NDVI_Monthly_Statistics_2024.csv",
  district: "gis/boundaries/Faisalabad_District_Boundary.json",
  studyArea: "gis/boundaries/Faisalabad_Complete_Study_Area.json",
  districtProjection: "gis/boundaries/Faisalabad_District_Boundary.prj",
  studyAreaProjection: "gis/boundaries/Faisalabad_Complete_Study_Area.prj",
};

function parseCsv(text, fileName) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"' && cell.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (quoted) {
    throw new Error(`${fileName} contains an unterminated quoted CSV field.`);
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const headers = rows.shift()?.map((header) => header.trim());
  if (!headers?.length || headers.some((header) => !header)) {
    throw new Error(`${fileName} is missing a valid CSV header.`);
  }

  return rows.map((values, rowIndex) => {
    if (values.length !== headers.length) {
      throw new Error(
        `${fileName} row ${rowIndex + 2} has ${values.length} fields; expected ${headers.length}.`,
      );
    }
    return Object.fromEntries(headers.map((header, index) => [header, values[index].trim()]));
  });
}

async function readCsv(relativePath) {
  const absolutePath = path.join(root, relativePath);
  const text = (await readFile(absolutePath, "utf8")).replace(/^\uFEFF/, "");
  const rows = parseCsv(text, relativePath);
  if (rows.length === 0) {
    throw new Error(`${relativePath} has no data rows.`);
  }
  return rows;
}

function parseYear(value, fileName) {
  const year = Number(value);
  if (!Number.isInteger(year)) {
    throw new Error(`${fileName} has a non-integer year value: ${value}`);
  }
  return year;
}

function parseNullableNumber(value) {
  if (value === undefined || value.trim() === "" || /^(nan|null|na)$/i.test(value.trim())) {
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Invalid numeric CSV value: ${value}`);
  }
  return number;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function formatDifferenceWarning(label, preferred, candidate) {
  const mismatches = [];
  for (const [year, preferredValue] of preferred) {
    const candidateValue = candidate.get(year);
    if (preferredValue === null || candidateValue === undefined || candidateValue === null) {
      continue;
    }

    const differencePercent =
      preferredValue === 0
        ? (candidateValue === 0 ? 0 : Infinity)
        : (Math.abs(preferredValue - candidateValue) / Math.abs(preferredValue)) * 100;
    if (differencePercent > 1) {
      mismatches.push(`${year} (${differencePercent.toFixed(2)}%)`);
    }
  }

  if (mismatches.length === 0) {
    return null;
  }
  return `${label} differs by more than 1% in ${mismatches.join(", ")}; percentages use the preferred value as the denominator.`;
}

function readAnnualSeries(rows, yearKey, valueKey, fileName) {
  return rows.map((row) => ({
    year: parseYear(row[yearKey], fileName),
    value: parseNullableNumber(row[valueKey]),
  }));
}

function parseMonth(value, fileName) {
  const monthNumber = Number(value);
  if (Number.isInteger(monthNumber) && monthNumber >= 1 && monthNumber <= 12) {
    return monthNumber;
  }

  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  const monthIndex = monthNames.indexOf(value.trim().toLowerCase());
  if (monthIndex < 0) {
    throw new Error(`${fileName} has an invalid month: ${value}`);
  }
  return monthIndex + 1;
}

function assertMonthlyCoverage(points, label) {
  if (points.length !== 288) {
    throw new Error(`${label} must contain exactly 288 supplied records.`);
  }
  const grouped = new Map();
  for (const point of points) {
    const key = `${point.year}-${point.month}`;
    if (grouped.has(key)) {
      throw new Error(`${label} contains a duplicate record for ${key}.`);
    }
    grouped.set(key, point);
  }

  for (let year = 2001; year <= 2024; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      if (!grouped.has(`${year}-${month}`)) {
        throw new Error(`${label} is missing the supplied ${year}-${month} record.`);
      }
    }
  }
}

function assertYearCoverage(rows, label) {
  const years = rows.map((row) => row.year);
  if (
    years.length !== 24 ||
    Math.min(...years) !== 2001 ||
    Math.max(...years) !== 2024 ||
    new Set(years).size !== 24
  ) {
    throw new Error(`${label} must contain one record for each year from 2001 through 2024.`);
  }
}

function collectPositions(value, positions) {
  if (Array.isArray(value)) {
    if (
      value.length >= 2 &&
      typeof value[0] === "number" &&
      Number.isFinite(value[0]) &&
      typeof value[1] === "number" &&
      Number.isFinite(value[1])
    ) {
      positions.push([value[0], value[1]]);
      return;
    }
    for (const child of value) {
      collectPositions(child, positions);
    }
  }
}

function boundsFor(geometry) {
  const positions = [];
  collectPositions(geometry.coordinates, positions);
  if (positions.length === 0) {
    throw new Error("The study-area geometry contains no coordinate positions.");
  }
  const longitudes = positions.map(([longitude]) => longitude);
  const latitudes = positions.map(([, latitude]) => latitude);
  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ];
}

function assertWgs84Projection(text, fileName) {
  if (!/AUTHORITY\s*\[\s*"EPSG"\s*,\s*"4326"\s*\]/i.test(text)) {
    throw new Error(`${fileName} does not confirm EPSG:4326.`);
  }
}

async function buildIndicators() {
  const [
    annualCombinedCsv,
    annualMasterCsv,
    annualRainfallHasnainCsv,
    monthlyLstCsv,
    monthlyRainfallCsv,
    annualNdviHasnainCsv,
    annualNdviHasnainCopyCsv,
    monthlyNdviCsv,
  ] = await Promise.all([
    readCsv(sourceFiles.annualCombined),
    readCsv(sourceFiles.annualMaster),
    readCsv(sourceFiles.annualRainfallHasnain),
    readCsv(sourceFiles.monthlyLst),
    readCsv(sourceFiles.monthlyRainfall),
    readCsv(sourceFiles.annualNdviHasnain),
    readCsv(sourceFiles.annualNdviHasnainCopy),
    readCsv(sourceFiles.monthlyNdvi),
  ]);

  const annualCombined = annualCombinedCsv.map((row) => ({
    year: parseYear(row.Year, sourceFiles.annualCombined),
    lst: parseNullableNumber(row.Annual_Mean_LST_C),
    rainfall: parseNullableNumber(row.Annual_Mean_Rainfall_mm),
    ndvi: parseNullableNumber(row.Annual_Mean_NDVI),
  }));
  const annualLst = annualCombined.map((point) => ({
    year: point.year,
    value: point.lst,
  }));
  const annualRainfall = annualCombined.map((point) => ({
    year: point.year,
    value: point.rainfall,
  }));
  const annualNdvi = annualCombined.map((point) => ({
    year: point.year,
    value: point.ndvi,
  }));
  const annualMaster = annualMasterCsv.map((row) => ({
    year: parseYear(row.year, sourceFiles.annualMaster),
    lst: parseNullableNumber(row.LST),
    rainfall: parseNullableNumber(row.Rainfall),
    ndvi: parseNullableNumber(row.NDVI),
  }));
  const annualRainfallHasnain = readAnnualSeries(
    annualRainfallHasnainCsv,
    "year",
    "Rainfall",
    sourceFiles.annualRainfallHasnain,
  );
  const annualNdviHasnain = readAnnualSeries(
    annualNdviHasnainCsv,
    "Year",
    "Annual_Mean_NDVI",
    sourceFiles.annualNdviHasnain,
  );
  const annualNdviHasnainCopy = readAnnualSeries(
    annualNdviHasnainCopyCsv,
    "Year",
    "Annual_Mean_NDVI",
    sourceFiles.annualNdviHasnainCopy,
  );
  const monthlyLst = monthlyLstCsv.map((row) => ({
    year: parseYear(row.year, sourceFiles.monthlyLst),
    month: parseMonth(row.month, sourceFiles.monthlyLst),
    value: parseNullableNumber(row.LST),
  }));
  const monthlyRainfall = monthlyRainfallCsv.map((row) => ({
    year: parseYear(row.year, sourceFiles.monthlyRainfall),
    month: parseMonth(row.month, sourceFiles.monthlyRainfall),
    value: parseNullableNumber(row.Rainfall),
  }));
  const monthlyNdvi = monthlyNdviCsv.map((row) => ({
    year: parseYear(row.Year, sourceFiles.monthlyNdvi),
    month: parseMonth(row.Month, sourceFiles.monthlyNdvi),
    value: parseNullableNumber(row.Mean_NDVI),
  }));

  assertYearCoverage(annualLst, "Preferred annual LST");
  assertYearCoverage(annualRainfall, "Preferred annual rainfall");
  assertYearCoverage(annualNdvi, "Preferred annual NDVI");
  assertYearCoverage(annualMaster.map(({ year, lst }) => ({ year, value: lst })), "Hasnain annual master");
  assertYearCoverage(annualMaster.map(({ year, rainfall }) => ({ year, value: rainfall })), "Hasnain annual rainfall");
  assertYearCoverage(annualMaster.map(({ year, ndvi }) => ({ year, value: ndvi })), "Hasnain annual NDVI");
  assertYearCoverage(annualRainfallHasnain, "Hasnain yearly rainfall");
  assertYearCoverage(annualNdviHasnain, "Hasnain annual NDVI file");
  assertYearCoverage(annualNdviHasnainCopy, "Hasnain duplicate annual NDVI file");
  assertMonthlyCoverage(monthlyLst, "Monthly LST");
  assertMonthlyCoverage(monthlyRainfall, "Monthly rainfall");

  const annualLstMap = new Map(annualLst.map(({ year, value }) => [year, value]));
  const annualRainfallMap = new Map(annualRainfall.map(({ year, value }) => [year, value]));
  const annualNdviMap = new Map(annualNdvi.map(({ year, value }) => [year, value]));
  const monthlyLstByYear = new Map();
  const monthlyRainfallByYear = new Map();
  const monthlyNdviByYear = new Map();
  for (const point of monthlyLst) {
    const points = monthlyLstByYear.get(point.year) ?? [];
    points.push(point);
    monthlyLstByYear.set(point.year, points);
  }
  for (const point of monthlyRainfall) {
    const points = monthlyRainfallByYear.get(point.year) ?? [];
    points.push(point);
    monthlyRainfallByYear.set(point.year, points);
  }
  for (const point of monthlyNdvi) {
    const points = monthlyNdviByYear.get(point.year) ?? [];
    points.push(point);
    monthlyNdviByYear.set(point.year, points);
  }

  const monthlyLstMeans = new Map(
    [...monthlyLstByYear].map(([year, points]) => {
      const values = points.map((point) => point.value).filter((value) => value !== null);
      return [year, values.length ? sum(values) / values.length : null];
    }),
  );
  const monthlyRainfallSums = new Map(
    [...monthlyRainfallByYear].map(([year, points]) => {
      const values = points.map((point) => point.value).filter((value) => value !== null);
      return [year, points.length === 12 && values.length === 12 ? sum(values) : null];
    }),
  );
  const ndviMonthlyCompleteYears = [...monthlyNdviByYear]
    .filter(([, points]) =>
      points.length === 12 && new Set(points.map((point) => point.month)).size === 12,
    )
    .map(([year]) => year);

  const warnings = [];
  const addWarning = (warning) => {
    if (warning) {
      warnings.push(warning);
    }
  };
  addWarning(formatDifferenceWarning(
    `Annual GEE LST (${sourceFiles.annualCombined}) vs monthly mean (${sourceFiles.monthlyLst})`,
    annualLstMap,
    monthlyLstMeans,
  ));
  addWarning(formatDifferenceWarning(
    `Annual GEE LST (${sourceFiles.annualCombined}) vs Hasnain annual master (${sourceFiles.annualMaster})`,
    annualLstMap,
    new Map(annualMaster.map(({ year, lst }) => [year, lst])),
  ));
  addWarning(formatDifferenceWarning(
    `Annual GEE rainfall (${sourceFiles.annualCombined}) vs monthly sum (${sourceFiles.monthlyRainfall})`,
    annualRainfallMap,
    monthlyRainfallSums,
  ));
  addWarning(formatDifferenceWarning(
    `Annual GEE rainfall (${sourceFiles.annualCombined}) vs Hasnain annual master (${sourceFiles.annualMaster})`,
    annualRainfallMap,
    new Map(annualMaster.map(({ year, rainfall }) => [year, rainfall])),
  ));
  addWarning(formatDifferenceWarning(
    `Annual GEE rainfall (${sourceFiles.annualCombined}) vs Hasnain yearly rainfall (${sourceFiles.annualRainfallHasnain})`,
    annualRainfallMap,
    new Map(annualRainfallHasnain.map(({ year, value }) => [year, value])),
  ));
  addWarning(formatDifferenceWarning(
    `Hasnain annual rainfall files (${sourceFiles.annualMaster} vs ${sourceFiles.annualRainfallHasnain})`,
    new Map(annualMaster.map(({ year, rainfall }) => [year, rainfall])),
    new Map(annualRainfallHasnain.map(({ year, value }) => [year, value])),
  ));
  addWarning(formatDifferenceWarning(
    `Annual GEE NDVI (${sourceFiles.annualCombined}) vs Hasnain annual master (${sourceFiles.annualMaster})`,
    annualNdviMap,
    new Map(annualMaster.map(({ year, ndvi }) => [year, ndvi])),
  ));
  addWarning(formatDifferenceWarning(
    `Annual GEE NDVI (${sourceFiles.annualCombined}) vs dedicated annual file (${sourceFiles.annualNdviHasnain})`,
    annualNdviMap,
    new Map(annualNdviHasnain.map(({ year, value }) => [year, value])),
  ));
  addWarning(formatDifferenceWarning(
    `Annual GEE NDVI (${sourceFiles.annualCombined}) vs duplicate dedicated annual file (${sourceFiles.annualNdviHasnainCopy})`,
    annualNdviMap,
    new Map(annualNdviHasnainCopy.map(({ year, value }) => [year, value])),
  ));
  addWarning(formatDifferenceWarning(
    `Dedicated annual NDVI files (${sourceFiles.annualNdviHasnain} vs ${sourceFiles.annualNdviHasnainCopy})`,
    new Map(annualNdviHasnain.map(({ year, value }) => [year, value])),
    new Map(annualNdviHasnainCopy.map(({ year, value }) => [year, value])),
  ));
  if (ndviMonthlyCompleteYears.length === 0) {
    const months = [...new Set(monthlyNdvi.map((point) => point.month))].sort((a, b) => a - b);
    warnings.push(
      `Monthly NDVI (${sourceFiles.monthlyNdvi}) is incomplete (${monthlyNdvi.length} records; months ${months.join(", ")} only); monthly NDVI is omitted.`,
    );
  } else {
    const monthlyNdviMeans = new Map(
      ndviMonthlyCompleteYears.map((year) => {
        const values = monthlyNdviByYear
          .get(year)
          .map((point) => point.value)
          .filter((value) => value !== null);
        return [year, values.length ? sum(values) / values.length : null];
      }),
    );
    addWarning(formatDifferenceWarning(
      `Annual GEE NDVI (${sourceFiles.annualCombined}) vs monthly mean (${sourceFiles.monthlyNdvi})`,
      annualNdviMap,
      monthlyNdviMeans,
    ));
  }
  warnings.push(
    "NDVI metadata differs: the selected annual CSV reports MODIS/061/MOD13Q1 at 250 m, while the data-team quality report says MOD13A2 at 1000 m; verify the dataset/resolution with the team.",
  );
  warnings.push(
    "The preferred rainfall column is named Annual_Mean_Rainfall_mm, while the data-team quality report describes the measure as a yearly total; the published unit is mm/year per that report.",
  );

  const monthlyLstSeries = monthlyLst.map((point) => ({
    date: `${point.year}-${String(point.month).padStart(2, "0")}-01`,
    value: point.value,
    valid_months: point.value === null ? 0 : 1,
  }));
  const rainfallMonthlySeries = monthlyRainfall.map((point) => ({
    date: `${point.year}-${String(point.month).padStart(2, "0")}-01`,
    value: point.value,
    valid_months: point.value === null ? 0 : 1,
  }));
  const monthlyCounts = (points) => {
    const counts = new Map();
    for (const point of points) {
      if (point.value !== null) {
        counts.set(point.year, (counts.get(point.year) ?? 0) + 1);
      }
    }
    return counts;
  };
  const lstMonthCounts = monthlyCounts(monthlyLst);
  const rainfallMonthCounts = monthlyCounts(monthlyRainfall);
  const ndviMonthlySeries = ndviMonthlyCompleteYears.length
    ? monthlyNdvi.map((point) => ({
        date: `${point.year}-${String(point.month).padStart(2, "0")}-01`,
        value: point.value,
        valid_months: point.value === null ? 0 : 1,
      }))
    : undefined;

  const indicatorData = {
    meta: {
      areaId: "faisalabad",
      areaName: "Faisalabad",
      provinceId: "punjab",
      period: { start: 2001, end: 2024 },
      status: "draft",
      warnings,
    },
    indicators: [
      {
        id: "land_surface_temperature",
        name: "Land surface temperature",
        unit: "°C",
        monthly_unit: "°C",
        description: "Annual land surface temperature values for the Faisalabad pilot.",
        source: sourceFiles.annualCombined,
        monthly_source: sourceFiles.monthlyLst,
        series: annualLst.map((point) => ({
          ...point,
          valid_months: lstMonthCounts.get(point.year) ?? null,
        })),
        monthly_series: monthlyLstSeries,
        trend: null,
      },
      {
        id: "precipitation",
        name: "Rainfall",
        unit: "mm/year",
        monthly_unit: "mm/month",
        description: "Annual and monthly rainfall values for the Faisalabad pilot.",
        source: sourceFiles.annualCombined,
        monthly_source: sourceFiles.monthlyRainfall,
        series: annualRainfall.map((point) => ({
          ...point,
          valid_months: rainfallMonthCounts.get(point.year) ?? null,
        })),
        monthly_series: rainfallMonthlySeries,
        trend: null,
      },
      {
        id: "vegetation_index",
        name: "NDVI",
        unit: "unitless",
        description: "Annual unitless NDVI values for the Faisalabad pilot.",
        source: sourceFiles.annualCombined,
        series: annualNdvi.map((point) => ({
          ...point,
          valid_months: null,
        })),
        ...(ndviMonthlySeries
          ? {
              monthly_source: sourceFiles.monthlyNdvi,
              monthly_series: ndviMonthlySeries,
            }
          : {}),
        trend: null,
      },
    ],
  };

  return areaIndicatorsSchema.parse(indicatorData);
}

async function buildAreasConfig(studyGeometry) {
  const bounds = boundsFor(studyGeometry);
  return areasConfigSchema.parse({
    provinces: [
      { id: "punjab", name: "Punjab" },
      { id: "sindh", name: "Sindh" },
      { id: "khyber-pakhtunkhwa", name: "Khyber Pakhtunkhwa" },
      { id: "balochistan", name: "Balochistan" },
      { id: "gilgit-baltistan", name: "Gilgit-Baltistan" },
      { id: "azad-kashmir", name: "Azad Kashmir" },
      { id: "islamabad", name: "Islamabad" },
    ],
    areas: [
      {
        id: "faisalabad",
        name: "Faisalabad",
        provinceId: "punjab",
        status: "available",
        center: [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2],
        bounds,
        indicators: [
          "land_surface_temperature",
          "precipitation",
          "vegetation_index",
        ],
        dataPath: "/data/areas/faisalabad/indicators.json",
      },
    ],
  });
}

async function buildStudyArea() {
  const [district, studyArea, districtProjection, studyAreaProjection] = await Promise.all([
    readFile(path.join(root, sourceFiles.district), "utf8"),
    readFile(path.join(root, sourceFiles.studyArea), "utf8"),
    readFile(path.join(root, sourceFiles.districtProjection), "utf8"),
    readFile(path.join(root, sourceFiles.studyAreaProjection), "utf8"),
  ]);
  assertWgs84Projection(districtProjection, sourceFiles.districtProjection);
  assertWgs84Projection(studyAreaProjection, sourceFiles.studyAreaProjection);

  const districtCollection = JSON.parse(district);
  const studyCollection = JSON.parse(studyArea);
  const districtGeometry = districtCollection.geometries?.[0];
  const studyFeature = studyCollection.features?.[0];
  if (
    districtCollection.type !== "GeometryCollection" ||
    !districtGeometry ||
    !studyFeature?.geometry
  ) {
    throw new Error("The supplied district or complete study-area GeoJSON has an unexpected shape.");
  }

  const featureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "faisalabad-district",
        properties: { kind: "district", name: "Faisalabad District" },
        geometry: districtGeometry,
      },
      {
        type: "Feature",
        id: "faisalabad-study-area",
        properties: {
          kind: "buffer",
          name: "Faisalabad District + 10 km surrounding zone",
        },
        geometry: studyFeature.geometry,
      },
    ],
  };

  return studyAreaFeatureCollectionSchema.parse(featureCollection);
}

const [indicators, studyArea] = await Promise.all([buildIndicators(), buildStudyArea()]);
const completeArea = studyArea.features.find((feature) => feature.properties.kind === "buffer");
if (!completeArea) {
  throw new Error("The combined study-area geometry is missing.");
}
const areas = await buildAreasConfig(completeArea.geometry);

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(
    path.join(outputDirectory, "indicators.json"),
    `${JSON.stringify(indicators, null, 2)}\n`,
  ),
  writeFile(
    path.join(outputDirectory, "study-area.geojson"),
    `${JSON.stringify(studyArea)}\n`,
  ),
  writeFile(
    path.join(root, "public", "data", "areas.json"),
    `${JSON.stringify(areas, null, 2)}\n`,
  ),
]);

console.log("Built Faisalabad data (status: draft).");
console.log(`- indicators: ${indicators.indicators.length}`);
console.log(`- annual years: ${indicators.meta.period.start}-${indicators.meta.period.end}`);
console.log(`- study-area.geojson: ${Buffer.byteLength(JSON.stringify(studyArea))} bytes`);
