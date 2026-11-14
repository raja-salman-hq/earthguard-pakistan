# Faisalabad pilot source data

The selected source files below are supplied by the EarthGuard data team. The
published pilot is **draft** until the team verifies the source selection,
processing metadata, and generated outputs. Draft is a provenance status, not a
claim that the source observations are synthetic.

## Selected input files

| File | Contents used | Source / owner | Status |
| --- | --- | --- | --- |
| `annual/gee2024/Faisalabad_LST_Rainfall_NDVI_Annual_2001_2024.csv` | Annual LST only | Google Earth Engine; EarthGuard data team (documentation contact: Hasnain) | Selected; draft |
| `cleaned/hasnain/YEARLY_RAINFALL_2001-2024_FINAL.csv` | Annual rainfall totals | CHIRPS daily rainfall, aggregated by the data team; Hasnain / EarthGuard data team | Selected; draft |
| `cleaned/hasnain/MONTHLY_RAINFALL_2001-2024_FINAL.csv` | Monthly rainfall totals and valid-month counts | CHIRPS daily rainfall, aggregated by the data team; Hasnain / EarthGuard data team | Selected; draft |
| `cleaned/ndvi/Faisalabad_Annual_NDVI_Analysis_2001_2024.csv` | Annual NDVI | MODIS source stated in team documentation; EarthGuard data team | Selected; draft |
| `cleaned/ndvi/Faisalabad_NDVI_Monthly_Statistics_2024.csv` | Available monthly NDVI values (2024 only) | EarthGuard data team | Selected; draft |
| `gis/boundaries/Faisalabad_District_Boundary.json` | District boundary feature | EarthGuard GIS/data team | Used to build study-area GeoJSON |
| `gis/boundaries/Faisalabad_Complete_Study_Area.json` | District plus surrounding study-area extent | EarthGuard GIS/data team | Used to build study-area GeoJSON |
| `gis/boundaries/Faisalabad_District_Boundary.prj` and `gis/boundaries/Faisalabad_Complete_Study_Area.prj` | Projection metadata checked by the builder | EarthGuard GIS/data team | Must confirm EPSG:4326 |

The monthly LST candidate is intentionally not published while it is being
reconciled with the selected annual LST series. The GEE rainfall column and
other candidate annual rainfall/NDVI files are not substituted for the selected
files. No matching trend results are supplied for these selected series; the
notebook's differently sourced OLS result is not attached to the pilot.

## Generated files

- `public/data/areas.json` — province and available-area directory.
- `public/data/areas/faisalabad/indicators.json` — annual and available monthly
  observations, source labels, status, and optional team-supplied trend results.
- `public/data/areas/faisalabad/study-area.geojson` — district and study-area
  features used by the map. The build checks the projection and keeps this file
  below 500 KB.
- `public/data/areas/faisalabad/lulc.json` — not supplied; land-cover imagery is
  unavailable in the app.

Generated files are built from the selected inputs with `npm run build:data`
and checked with `npm run check:data`. The frontend validates all published
JSON with Zod at runtime. Null observations remain null; builders must not
interpolate or otherwise fill missing values. Annual rainfall is checked against
the sum of valid monthly values. See [the data contract](../docs/DATA_CONTRACT.md).

## Documentation and ownership

The supplied source notes are under `docs/data-team/hasnain/`. They identify
Google Earth Engine, MODIS MOD11A2, MODIS MOD13A2, daily CHIRPS, scale factors,
and cloud masking, but leave band identifiers and some processing details
unspecified. Those details and the published outputs require review by the
EarthGuard data team before changing the status from `draft` to `verified`.
