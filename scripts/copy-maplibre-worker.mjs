import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const source = join(
  projectRoot,
  "node_modules",
  "maplibre-gl",
  "dist",
  "maplibre-gl-worker.mjs",
);
const destination = join(projectRoot, "public", "maplibre-gl-worker.mjs");

mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);
console.info("Copied the MapLibre worker to public/maplibre-gl-worker.mjs.");
