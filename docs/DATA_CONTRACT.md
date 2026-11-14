# Faisalabad pilot data contract

This contract describes the real-data files consumed by the frontend. The
current files are **draft** and cover Faisalabad District and the supplied
surrounding study area for 2001–2024. The frontend displays observations and
team-provided statistics; it does not calculate trends or fill missing values.

## Files and validation

- `public/data/areas.json` is validated by `areasConfigSchema`.
- Each available area's `dataPath` points to an `indicators.json` file validated
  by `areaIndicatorsSchema`.
- `study-area.geojson` is validated by `studyAreaFeatureCollectionSchema` and
  must be EPSG:4326 and smaller than 500 KB.
- Optional `lulc.json` is validated by `lulcDataSchema`. No web-ready LULC
  overlays or area-change table are currently supplied.
- The schemas and inferred TypeScript types live in `src/types/area-data.ts`.

Run `npm run build:data` to convert the selected team CSVs and GIS JSON to
published files. Run `npm run check:data` to validate all published files and
print each indicator's coverage and null counts. Both commands use the
repository's installed Zod package; they add no dependencies.

## Area directory

`areas.json` has this shape:

The checked-in configuration uses coordinates derived from the supplied
Faisalabad study-area geometry. Province IDs use the existing API region IDs.
Future areas may use `status: "coming_soon"`; they must not be presented as
having observations.

An area record contains `id`, `name`, `provinceId`, `status`, a
`[longitude, latitude]` `center`, `[west, south, east, north]` `bounds`, its
`indicators` IDs, and a public `dataPath`.

## Indicator data

Each area's `indicators.json` includes `meta` (`areaId`, `areaName`,
`provinceId`, `period`, and `status`) and an `indicators` array. The status is
`draft`, `verified`, or `placeholder`; the Faisalabad pilot remains `draft`
until the data team verifies it.

Each indicator includes its existing API ID, name, unit, description, source,
optional `monthly_source` (required when monthly observations exist), and an
annual `series` with `{ year, value, valid_months }`. Values may be JSON
numbers or `null`. Monthly observations, when supplied, use
`{ date, value, valid_months }`; monthly values are not synthesized from annual
values. Valid-month counts are only supplied where monthly coverage has been
confirmed. Missing or unavailable counts remain `null`.

The optional `trend` object may contain only results supplied in a matching
team file: `test`, `tau`, `z`, `p_value`, `significant`, `direction`,
`sen_slope`, `slope_unit`, `slope_ci95`, `trend_line`, `n_years`, and `notes`.
Do not calculate or infer these fields in the build script or browser. The
selected Faisalabad series currently have no matching trend-result object, so
trend statistics and trend lines are not shown.

## Current source selection

The builder uses:

- The annual GEE master CSV's LST column for annual LST.
- Hasnain's monthly and annual CHIRPS rainfall files. The builder checks that
  all 12 valid months sum to the corresponding annual value.
- The dedicated annual NDVI CSV and the supplied 2024 monthly NDVI CSV.
- The district boundary and complete study-area JSON, after checking the
  supplied projection files for EPSG:4326.

Monthly LST remains excluded pending reconciliation. Other candidate annual
files are not silently substituted. A notebook OLS result for a different
rainfall source and period is not a trend result for the selected CHIRPS series.
Detailed source inventory and ownership are recorded in [data/README.md](../data/README.md).

## GIS and LULC

`study-area.geojson` is a GeoJSON FeatureCollection with two features:
`kind: "district"` and `kind: "buffer"`. The map renders these outlines without
claiming province-wide measurements. Do not display unprovided raster data.
LULC stays unavailable until the data team supplies web-ready PNG overlays,
their bounds and legend, and the corresponding area-change table.

## URL and API adapter

The existing URL/store state adds `province` and nullable `area`; older links
using only `region` continue to resolve to their existing province selection.
The static adapter in `src/lib/api/` keeps the existing query function shapes.
Real-mode requests for unavailable areas or indicators throw `NoDataError` and
use the existing no-data notice to offer Faisalabad.

The `NEXT_PUBLIC_USE_MOCK` switch is centralized in `src/lib/api/client.ts`.
`true` selects explicitly synthetic demo responses. `false` reads these
validated static JSON files; there is no live backend in this pilot build.
