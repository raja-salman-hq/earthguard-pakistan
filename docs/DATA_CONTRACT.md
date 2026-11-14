# Faisalabad pilot data contract

The published real data is **draft** and covers Faisalabad District and the
supplied surrounding area for 2001–2024. The frontend displays source
observations and team-provided statistics only. It never calculates trends or
fills missing observations.

## Files and validation

- `public/data/areas.json` is validated by `areasConfigSchema`.
- Each available area's `dataPath` points to an `indicators.json` file
  validated by `areaIndicatorsSchema`.
- `study-area.geojson` is validated by `studyAreaFeatureCollectionSchema` and
  must be EPSG:4326 and smaller than 500 KB.
- Optional `lulc.json` is validated by `lulcDataSchema`. No web-ready LULC
  overlays or area-change table are currently supplied.
- Schemas and inferred TypeScript types live in `src/types/area-data.ts`.

Run `npm run build:data` to convert the selected CSVs and GIS JSON. The builder
validates its result with Zod and writes the generated files. Run
`npm run check:data` to validate all published data and print status, years,
null counts, and metadata warnings. No dependency is added.

## Area directory

`areas.json` stores province records and area records. An area contains `id`,
`name`, `provinceId`, `status`, a `[longitude, latitude]` `center`,
`[west, south, east, north]` `bounds`, indicator IDs, and public `dataPath`.
The Faisalabad center and bounds come from the supplied study-area geometry;
the builder does not create coordinates. Future areas may use
`status: "coming_soon"` and must not be presented as having observations.

## Indicator data

Each area's `indicators.json` has `meta` (`areaId`, `areaName`, `provinceId`,
`period`, `status`, and `warnings`) and an `indicators` array. The status is
`draft`, `verified`, or `placeholder`; Faisalabad remains `draft` until the
data team verifies the input selection and processing metadata.

Each indicator has its API ID, name, unit, description, source, an annual
`series` of `{ year, value, valid_months }`, and `trend`. Monthly values use
`{ date, value, valid_months }` and include `monthly_source` and
`monthly_unit`. Values remain finite numbers or `null`; year decimals such as
`2001.0` are converted to integer years. Monthly values are never synthesized
from annual values. `valid_months` counts non-null monthly records when a
monthly series exists; otherwise it is `null`.

`trend` is either a source-file result containing only supplied fields
(`test`, `tau`, `z`, `p_value`, `significant`, `direction`, `sen_slope`,
`slope_unit`, `slope_ci95`, `trend_line`, `n_years`, `notes`) or `null`. No
matching Mann–Kendall/Sen's-slope results were found for the chosen 24-year
series. The notebook's ordinary least-squares result is for IMERG rainfall
over 2001–2008, not the selected GEE/CHIRPS annual series, and is not attached.
The static trend API responds with `{ "available": false }` when `trend` is
null.

`meta.warnings` contains each year that differs by more than 1%, grouped by
comparison source, plus source-metadata and incomplete-coverage caveats. The
relative difference is `abs(preferred - compared) / abs(preferred) * 100`;
the preferred annual GEE value remains published regardless of the comparison.

## Source precedence, comparisons, and units

The annual first choice for all indicators is
`data/annual/gee2024/Faisalabad_LST_Rainfall_NDVI_Annual_2001_2024.csv`.
Annual alternatives used for cross-checks are
`data/annual/hasnain/01_YEARLY_MASTER_CSV_2001-2024.csv`,
`data/annual/hasnain/YEARLY_RAINFALL_2001-2024_FINAL.csv`, and both dedicated
annual NDVI CSV copies under `data/cleaned/ndvi/`.

Monthly LST and rainfall come from
`data/cleaned/hasnain/MONTHLY_LST_2001-2024_FINAL.csv` and
`data/cleaned/hasnain/MONTHLY_RAINFALL_2001-2024_FINAL.csv`. Annual LST is
compared with the mean of valid monthly values; annual rainfall is compared
with the sum of valid monthly values. The NDVI monthly CSV has only January,
February, and March 2024, so it is excluded and annual NDVI is the only
published resolution.

Units: LST is °C (the Hasnain documentation gives the MODIS conversion
`DN * 0.02 - 273.15`); annual rainfall is mm/year and monthly rainfall is
mm/month (the quality report describes the annual quantity as a yearly total);
NDVI is unitless. The preferred annual rainfall column is named
`Annual_Mean_Rainfall_mm`, while the quality report describes a yearly total.
This label ambiguity is retained in `meta.warnings`.

The selected annual NDVI CSV reports `MODIS/061/MOD13Q1` at 250 m, while the
data-team quality report says MOD13A2 at 1000 m. The selected values are not
replaced; the dataset/resolution discrepancy is flagged for data-team
confirmation. The full CSV inventory, ownership notes, exact comparison
warnings, and null counts are in [data/README.md](../data/README.md).

## GIS and LULC

`study-area.geojson` is a GeoJSON FeatureCollection with a district feature and
the supplied complete study-area feature. The map shows these boundaries
without implying province-wide measurements. Do not display unprovided raster
data. LULC stays unavailable until the data team supplies web-ready overlays,
bounds, legend, and the area-change table.

## URL and API adapter

The `faisalabad` region ID has parent `punjab`; the map's province state remains
`punjab`, with `area=faisalabad`. Legacy `region=faisalabad` URLs normalize to
that province/area pair. Province-only legacy URLs continue to resolve
unchanged. The static adapter in `src/lib/api/` keeps the existing query
function names and response shapes. Unavailable areas or indicators throw a
typed `NoDataError`.

`NEXT_PUBLIC_USE_MOCK` is centralized in `src/lib/api/client.ts`. Only the
exact value `true` selects explicitly synthetic demo responses. Unset or
`false` selects these validated static JSON files; there is no live backend in
this pilot build.
