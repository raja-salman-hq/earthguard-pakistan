import nextEnv from "@next/env";
import { z } from "zod";
import {
  hotspotsResponseSchema,
  mapLayerResponseSchema,
  regionsResponseSchema,
  REGION_IDS,
  timeSeriesResponseSchema,
  trendResponseSchema,
  VARIABLE_IDS,
  variablesResponseSchema,
} from "../src/types/api.ts";

nextEnv.loadEnvConfig(process.cwd());

type CheckResult = {
  name: string;
  status: "PASS" | "FAIL";
  detail: string;
};

const results: CheckResult[] = [];
const baseUrl = process.env.NEXT_PUBLIC_API_URL;

function record(name: string, status: CheckResult["status"], detail: string): void {
  results.push({ name, status, detail });
}

function formatIssues(issues: readonly z.ZodIssue[]): string {
  return issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}

function checkDataQuality(value: unknown, path = "$", issues: string[] = []): string[] {
  if (value === null) {
    if (!path.endsWith(".geometry")) {
      issues.push(`${path}: null value is not allowed.`);
    }
    return issues;
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    issues.push(`${path}: value must be finite.`);
    return issues;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => checkDataQuality(item, `${path}[${index}]`, issues));
    return issues;
  }

  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      checkDataQuality(child, `${path}.${key}`, issues);
    }
  }

  return issues;
}

function checkCoverage(
  name: string,
  actualIds: readonly string[],
  expectedIds: readonly string[],
): boolean {
  const missing = expectedIds.filter((id) => !actualIds.includes(id));
  const duplicates = actualIds.filter((id, index) => actualIds.indexOf(id) !== index);
  const issues = [
    ...(missing.length ? [`missing ids: ${missing.join(", ")}`] : []),
    ...(duplicates.length ? [`duplicate ids: ${[...new Set(duplicates)].join(", ")}`] : []),
  ];

  record(name, issues.length === 0 ? "PASS" : "FAIL", issues.join("; ") || "All required ids present.");
  return issues.length === 0;
}

async function checkEndpoint<T>(
  name: string,
  path: string,
  query: Record<string, string | number>,
  schema: z.ZodType<T>,
): Promise<T | undefined> {
  if (!baseUrl) {
    record(name, "FAIL", "NEXT_PUBLIC_API_URL is not set.");
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(path.replace(/^\//, ""), `${baseUrl.replace(/\/+$/, "")}/`);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }
  } catch {
    record(name, "FAIL", `Invalid NEXT_PUBLIC_API_URL: ${baseUrl}`);
    return undefined;
  }

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) {
      record(name, "FAIL", `HTTP ${response.status} ${response.statusText}`.trim());
      return undefined;
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      record(name, "FAIL", `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      record(name, "FAIL", formatIssues(parsed.error.issues));
      return undefined;
    }

    record(name, "PASS", "Response matches the Zod schema.");
    const qualityIssues = checkDataQuality(parsed.data);
    record(
      `${name} data values`,
      qualityIssues.length === 0 ? "PASS" : "FAIL",
      qualityIssues.join("; ") || "No null or non-finite data values.",
    );
    return parsed.data;
  } catch (error) {
    record(
      name,
      "FAIL",
      error instanceof Error ? error.message : String(error),
    );
    return undefined;
  }
}

function printResults(): void {
  const nameWidth = Math.max(24, ...results.map((result) => result.name.length));
  const statusWidth = 6;
  const detailWidth = 72;
  const divider = `+${"-".repeat(nameWidth + 2)}+${"-".repeat(statusWidth + 2)}+${"-".repeat(detailWidth + 2)}+`;
  console.log(divider);
  console.log(`| ${"Check".padEnd(nameWidth)} | ${"Result".padEnd(statusWidth)} | ${"Details".padEnd(detailWidth)} |`);
  console.log(divider);
  for (const result of results) {
    console.log(
      `| ${result.name.padEnd(nameWidth)} | ${result.status.padEnd(statusWidth)} | ${result.detail.padEnd(detailWidth)} |`,
    );
  }
  console.log(divider);
  const failures = results.filter((result) => result.status === "FAIL").length;
  console.log(`${results.length - failures} passed; ${failures} failed.`);
}

async function main(): Promise<void> {
  if (!baseUrl) {
    console.error("Set NEXT_PUBLIC_API_URL to the running FastAPI origin before running npm run check:api.");
  }

  const variables = await checkEndpoint(
    "GET /api/variables",
    "api/variables",
    {},
    variablesResponseSchema,
  );
  if (variables) {
    checkCoverage(
      "Variable id coverage",
      variables.map((variable) => variable.id),
      VARIABLE_IDS,
    );
  }

  const regions = await checkEndpoint(
    "GET /api/regions",
    "api/regions",
    {},
    regionsResponseSchema,
  );
  if (regions) {
    checkCoverage(
      "Region id coverage",
      regions.features.map((feature) => feature.id),
      REGION_IDS,
    );
  }

  const timeSeries = await checkEndpoint(
    "GET /api/timeseries",
    "api/timeseries",
    {
      variable: "air_temperature",
      region: "punjab",
      start: 2000,
      end: 2001,
      resolution: "monthly",
    },
    timeSeriesResponseSchema,
  );
  if (timeSeries) {
    const invalidDates = timeSeries.points
      .filter((point) => Number.isNaN(Date.parse(point.date)))
      .map((point) => `${point.date}: invalid date.`);
    record(
      "Timeseries date validity",
      invalidDates.length === 0 ? "PASS" : "FAIL",
      invalidDates.join("; ") || "All dates are valid ISO dates.",
    );
  }

  await checkEndpoint(
    "GET /api/trend",
    "api/trend",
    {
      variable: "air_temperature",
      region: "punjab",
      start: 2000,
      end: 2025,
      lang: "en",
    },
    trendResponseSchema,
  );

  await checkEndpoint(
    "GET /api/hotspots",
    "api/hotspots",
    { variable: "air_temperature", limit: 5 },
    hotspotsResponseSchema,
  );

  const variableYears = new Map(
    (variables ?? []).map((variable) => [variable.id, variable.availableTo]),
  );
  await Promise.all(
    VARIABLE_IDS.map(async (variable) => {
      const layer = await checkEndpoint(
        `GET /api/map-layer (${variable})`,
        "api/map-layer",
        { variable, year: variableYears.get(variable) ?? 2025, comparison: "absolute" },
        mapLayerResponseSchema,
      );
      if (layer) {
        checkCoverage(
          `Map-layer region coverage (${variable})`,
          layer.map((item) => item.regionId),
          REGION_IDS,
        );
      }
    }),
  );

  printResults();
  if (results.some((result) => result.status === "FAIL")) {
    process.exitCode = 1;
  }
}

await main();
