import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  areaLSTStatisticSchema,
  areaLULCStatisticSchema,
} from "@/types/area-statistics";

const areaQuerySchema = z.object({ area: z.literal("faisalabad") });

function parseCsvLine(line: string): string[] {
  return line
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((value) => value.replace(/^"|"$/g, "").replace(/""/g, '"'));
}

function readCsv(content: string): string[][] {
  const lines = content.trim().split(/\r?\n/);
  return lines.slice(1).map(parseCsvLine);
}

export async function GET(request: Request) {
  const area = areaQuerySchema.safeParse({
    area: new URL(request.url).searchParams.get("area"),
  });
  if (!area.success) {
    return NextResponse.json({ error: "Only Faisalabad area statistics are available." }, { status: 400 });
  }

  const statisticsDirectory = path.join(process.cwd(), "gis", "area_statistics");
  try {
    const [lstCsv, lulcCsv] = await Promise.all([
      readFile(path.join(statisticsDirectory, "LST_Temperature_Statistics.csv"), "utf8"),
      readFile(path.join(statisticsDirectory, "Faisalabad_LULC_Statistics.csv"), "utf8"),
    ]);

    const lst = readCsv(lstCsv).map((row) =>
      areaLSTStatisticSchema.parse({
        category: row[1],
        changeCelsius: Number(row[2]),
        year2001: Number(row[3]),
        year2024: Number(row[4]),
      }),
    );
    const lulc = readCsv(lulcCsv).map((row) =>
      areaLULCStatisticSchema.parse({
        areaHectares: Number(row[1]),
        areaKm2: Number(row[2]),
        category: row[3],
      }),
    );

    return NextResponse.json({
      area: area.data.area,
      lst,
      lulc,
      source: "gis/area_statistics",
    });
  } catch (error) {
    console.error("Failed to load Faisalabad area statistics.", error);
    return NextResponse.json({ error: "Area statistics are unavailable." }, { status: 500 });
  }
}
