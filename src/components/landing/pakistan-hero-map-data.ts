import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RegionId } from "@/types/api";

type Position = readonly [number, number, ...number[]];
type Ring = readonly Position[];
type Polygon = readonly Ring[];
type Geometry =
  | { type: "Polygon"; coordinates: Polygon }
  | { type: "MultiPolygon"; coordinates: readonly Polygon[] };
type ProvinceFeature = {
  properties: { shapeName: string };
  geometry: Geometry;
};
type Point = { x: number; y: number };

export type HeroProvincePath = {
  regionId: RegionId;
  path: string;
};

export const HERO_MAP_VIEWBOX = "0 0 520 430";

const REGION_BY_SHAPE_NAME: Readonly<Record<string, RegionId>> = {
  Balochistan: "balochistan",
  Sindh: "sindh",
  "Gilgit-Baltistan": "gilgit-baltistan",
  "Azad Kashmir": "azad-kashmir",
  "Khyber Pakhtunkhwa": "khyber-pakhtunkhwa",
  Punjab: "punjab",
  "Islamabad Capital Territory": "islamabad",
};

const WIDTH = 520;
const HEIGHT = 430;
const PADDING = 20;
const SIMPLIFY_TOLERANCE = 0.55;
const MERCATOR_LATITUDE_LIMIT = 85.05112878;

const provinceBoundaries = JSON.parse(
  readFileSync(join(process.cwd(), "public/data/pakistan-provinces.geojson"), "utf8"),
) as unknown as { features: ProvinceFeature[] };
const features = provinceBoundaries.features;

function polygonRings(geometry: Geometry): readonly Polygon[] {
  return geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
}

function projectPosition([longitude, latitude]: Position): Point {
  const radians = (Math.max(-MERCATOR_LATITUDE_LIMIT, Math.min(MERCATOR_LATITUDE_LIMIT, latitude)) * Math.PI) / 180;
  return {
    x: (longitude * Math.PI) / 180,
    y: Math.log(Math.tan(Math.PI / 4 + radians / 2)),
  };
}

const projectedFeatures = features.map((feature) => {
  const regionId = REGION_BY_SHAPE_NAME[feature.properties.shapeName];
  if (!regionId) {
    throw new Error(`Unknown Pakistan province shape: ${feature.properties.shapeName}`);
  }

  return {
    regionId,
    polygons: polygonRings(feature.geometry).map((polygon) =>
      polygon.map((ring) => ring.map(projectPosition)),
    ),
  };
});

const projectedPoints = projectedFeatures.flatMap((feature) =>
  feature.polygons.flatMap((polygon) => polygon.flat()),
);
const bounds = projectedPoints.reduce(
  (current, point) => ({
    minX: Math.min(current.minX, point.x),
    minY: Math.min(current.minY, point.y),
    maxX: Math.max(current.maxX, point.x),
    maxY: Math.max(current.maxY, point.y),
  }),
  {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  },
);

const usableWidth = WIDTH - PADDING * 2;
const usableHeight = HEIGHT - PADDING * 2;
const scale = Math.min(
  usableWidth / (bounds.maxX - bounds.minX),
  usableHeight / (bounds.maxY - bounds.minY),
);
const mapWidth = (bounds.maxX - bounds.minX) * scale;
const mapHeight = (bounds.maxY - bounds.minY) * scale;
const offsetX = PADDING + (usableWidth - mapWidth) / 2;
const offsetY = PADDING + (usableHeight - mapHeight) / 2;

function fitPoint(point: Point): Point {
  return {
    x: offsetX + (point.x - bounds.minX) * scale,
    y: offsetY + (bounds.maxY - point.y) * scale,
  };
}

function distanceToSegmentSquared(point: Point, start: Point, end: Point): number {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  if (deltaX === 0 && deltaY === 0) {
    return (point.x - start.x) ** 2 + (point.y - start.y) ** 2;
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) /
        (deltaX * deltaX + deltaY * deltaY),
    ),
  );
  const nearestX = start.x + t * deltaX;
  const nearestY = start.y + t * deltaY;
  return (point.x - nearestX) ** 2 + (point.y - nearestY) ** 2;
}

function simplifyOpenLine(points: readonly Point[], tolerance: number): Point[] {
  if (points.length <= 3) {
    return [...points];
  }

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const pending: Array<[number, number]> = [[0, points.length - 1]];
  const toleranceSquared = tolerance * tolerance;

  while (pending.length > 0) {
    const [firstIndex, lastIndex] = pending.pop()!;
    let farthestIndex = -1;
    let farthestDistance = toleranceSquared;

    for (let index = firstIndex + 1; index < lastIndex; index += 1) {
      const distance = distanceToSegmentSquared(
        points[index],
        points[firstIndex],
        points[lastIndex],
      );
      if (distance > farthestDistance) {
        farthestDistance = distance;
        farthestIndex = index;
      }
    }

    if (farthestIndex >= 0) {
      keep[farthestIndex] = 1;
      pending.push([firstIndex, farthestIndex], [farthestIndex, lastIndex]);
    }
  }

  return points.filter((_, index) => keep[index] === 1);
}

function simplifyClosedRing(points: readonly Point[]): Point[] {
  if (points.length < 5) {
    return [...points];
  }

  const openRing = points.slice(0, -1);
  const first = openRing[0];
  let farthestIndex = 1;
  let farthestDistance = 0;
  for (let index = 1; index < openRing.length; index += 1) {
    const distance =
      (openRing[index].x - first.x) ** 2 + (openRing[index].y - first.y) ** 2;
    if (distance > farthestDistance) {
      farthestDistance = distance;
      farthestIndex = index;
    }
  }

  const firstArc = simplifyOpenLine(openRing.slice(0, farthestIndex + 1), SIMPLIFY_TOLERANCE);
  const secondArc = simplifyOpenLine(
    [...openRing.slice(farthestIndex), first],
    SIMPLIFY_TOLERANCE,
  );
  const simplified = [...firstArc, ...secondArc.slice(1)];
  return simplified.length >= 4 ? simplified : [...points];
}

function ringPath(ring: readonly Point[]): string {
  const points = simplifyClosedRing(ring.map(fitPoint));
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join("") + "Z";
}

export const pakistanHeroProvincePaths: readonly HeroProvincePath[] =
  projectedFeatures.map((feature) => ({
    regionId: feature.regionId,
    path: feature.polygons
      .flatMap((polygon) => polygon.map(ringPath))
      .join(""),
  }));
