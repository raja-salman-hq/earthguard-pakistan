# Faisalabad pilot source data

The supplied data is **draft** until the EarthGuard data team verifies source
selection and processing metadata. Rows below exclude the CSV header. Nulls
mean empty/NA numeric fields; units are taken from the CSV column names and the
team's documentation. `count` is a record/image/pixel count; `unitless` is an
index.

## Selected published sources

| Indicator | Annual source used | Monthly source used | Units | Status |
| --- | --- | --- | --- | --- |
| LST | `data/annual/gee2024/Faisalabad_LST_Rainfall_NDVI_Annual_2001_2024.csv` (`Annual_Mean_LST_C`) | `data/cleaned/hasnain/MONTHLY_LST_2001-2024_FINAL.csv` | °C | Draft |
| Rainfall | Same combined annual GEE CSV (`Annual_Mean_Rainfall_mm`) | `data/cleaned/hasnain/MONTHLY_RAINFALL_2001-2024_FINAL.csv` | mm/year; mm/month | Draft |
| NDVI | Same combined annual GEE CSV (`Annual_Mean_NDVI`) | None: supplied candidate has only Jan–Mar 2024 | unitless | Draft |

The annual combined GEE CSV is the required first-choice annual source for all
three indicators. Annual alternatives are cross-checks only and never replace
the preferred values. Years such as `2001.0` are emitted as integer `2001`.
Null observations remain `null`. The generated data includes monthly LST and
rainfall; it omits monthly NDVI because the candidate does not cover a full
year.

## CSV inventory

| CSV | Rows; year coverage | Nulls | Columns and units |
| --- | --- | --- | --- |
| `data/annual/gee2024/Faisalabad_LST_Rainfall_NDVI_Annual_2001_2024.csv` | 24; 2001–2024 | 0 | `Year` (year); `Annual_Mean_LST_C` (°C); `Annual_Mean_Rainfall_mm` (mm/year per team quality report); `Annual_Mean_NDVI` (unitless); `LST_Image_Count`, `Rainfall_Image_Count`, `NDVI_Image_Count` (count); `LST_Dataset`, `Rainfall_Dataset`, `NDVI_Dataset` (identifier) |
| `data/annual/hasnain/01_YEARLY_MASTER_CSV_2001-2024.csv` | 24; 2001–2024 | 0 | `year` (year); `LST` (°C); `Rainfall` (mm/year); `NDVI`, `EVI` (unitless) |
| `data/annual/hasnain/YEARLY_RAINFALL_2001-2024_FINAL.csv` | 24; 2001–2024 | 0 | `year` (year); `Rainfall` (mm/year) |
| `data/cleaned/hasnain/MONTHLY_LST_2001-2024_FINAL.csv` | 288; 2001–2024 | 0 | `year` (year); `month` (month); `LST` (°C) |
| `data/cleaned/hasnain/MONTHLY_RAINFALL_2001-2024_FINAL.csv` | 288; 2001–2024 | 0 | `year` (year); `month` (month); `Rainfall` (mm/month) |
| `data/cleaned/ndvi/Faisalabad_Annual_NDVI_Analysis_2001_2024.csv` | 24; 2001–2024 | 0 | `Year`; `Original_Image_Count`, `QA_Processed_Image_Count` (count); `NDVI_QA_Filter` (flag); `Annual_Mean_NDVI`, `Annual_Min_NDVI`, `Annual_Max_NDVI`, `Annual_StdDev_NDVI` (unitless); `Dataset`; `Resolution_Meters` (m); `NDVI_Scale_Factor` (unitless) |
| `data/cleaned/ndvi/Faisalabad_Annual_NDVI_Analysis_2001_2024(1).csv` | 24; 2001–2024 | 0 | Same 11 columns and units as the preceding annual NDVI file |
| `data/cleaned/ndvi/Faisalabad_NDVI_Individual_Image_Details_2024.csv` | 6; 2024 | 0 | `Image_ID`, `Composite_Date`, `Year`, `Month_Number`, `Month_Name`; `Good_Quality_Pixels` (count); `QA_Filter`; `Dataset`; `Resolution_Meters` (m); `Composite_Period_Days` (days) |
| `data/cleaned/ndvi/Faisalabad_NDVI_Monthly_Statistics_2024.csv` | 3; Jan–Mar 2024 | 0 | `Year`, `Month`; `Original_Image_Count`, `QA_Valid_Image_Count` (count); `Composite_Dates`; `Mean_NDVI` (unitless) |
| `data/cleaned/ndvi/Faisalabad_NDVI_Monthly_Statistics_2024(1).csv` | 3; Jan–Mar 2024 | 0 | `system:index`; `Composite_Dates`; `Mean_NDVI` (unitless); `Month`; `Original_Image_Count`, `QA_Valid_Image_Count` (count); `Year`; `.geo` (geometry text) |
| `data/cleaned/ndvi/Faisalabad_NDVI_Monthly_Statistics_2024(2).csv` | 3; Jan–Mar 2024 | 0 | Same 6 columns as the unsuffixed monthly file |
| `data/cleaned/ndvi/Faisalabad_NDVI_Monthly_Statistics_2024(3).csv` | 3; Jan–Mar 2024 | 0 | Same 8 columns as the `(1)` monthly file |
| `gis/area_statistics/Faisalabad_LULC_Statistics.csv` | 8; categories 2001 and 2024 | 0 | `system:index`; `Area_hectares` (ha); `Area_km2` (km²); `Category`; `.geo` |
| `gis/area_statistics/LST_Temperature_Statistics.csv` | 4; fields for 2001 and 2024 | 0 | `system:index`; `Category`; `Change_Celsius`, `Year_2001`, `Year_2024` (°C); `.geo` |
| `analysis/outputs/lst_annual.csv` | 1; partial 2024 | 0 | `Year`; `LST_Celsius` (°C); `Months_With_Data` (months); `Valid_Days` (days); `Complete_Year` (boolean) |
| `analysis/outputs/lst_daily.csv` | 249; 2024 | 89 each in `LST_Celsius` and `LST_Median_Celsius` | `Date`; both LST columns (°C); `Valid_Pixels`, `QC_Passing_Pixels`, `ROI_Pixels` (count) |
| `analysis/outputs/lst_monthly.csv` | 9; Apr–Dec 2024 | 0 | `Month`; `LST_Celsius` (°C); `Valid_Days` (days); `Mean_Valid_Pixels`, `QC_Passing_Pixels` (count) |
| `analysis/outputs/rainfall_annual.csv` | 9; 2001–2009, with 2009 partial | 0 | `Year`; `Rain_mm_per_year` (mm/year); `Months_With_Data`, `Valid_Months` (months); `Complete_Year` (boolean) |
| `analysis/outputs/rainfall_monthly.csv` | 100; 2001–2009, partial coverage | 0 | `Date`; `Mean_Rate_mm_per_hour` (mm/hour); `Rain_mm_per_month` (mm/month); `Valid_Grid_Cells`, `ROI_Grid_Cells` (count); `Year`; `Month_Number` |

No CSVs are present under `gee/`; that directory contains source scripts.

The `.gitignore` excludes raw raster, HDF/NetCDF, and new GIS-bundle files.
The CSV inputs used by the build and previously tracked shapefile components
remain in the repository so the published data can be reproduced.

## Annual/monthly comparison warnings

Differences are `abs(preferred - compared) / abs(preferred) * 100`; years above
1% are stored in `meta.warnings` by the builder with their individual
percentages. The preferred annual GEE values remain published:

- Annual GEE LST vs monthly Hasnain means: 11 of 24 years exceed 1%; maximum
  5.12% in 2024.
- Annual GEE LST vs Hasnain annual master: 9 years exceed 1%; maximum 2.59%
  in 2018.
- Annual GEE rainfall vs monthly Hasnain sums, Hasnain annual master, and the
  dedicated Hasnain yearly rainfall file: all 24 years exceed 1%; maximum
  9.68% in 2001. The master and dedicated yearly rainfall series match one
  another.
- Annual GEE NDVI vs the Hasnain annual master: all 24 years exceed 1%;
  maximum 10.49% in 2009.
- Hasnain annual master NDVI vs either dedicated annual NDVI file: all 24
  years exceed 1%; maximum 11.75% in 2009.
- Annual GEE NDVI vs each dedicated annual NDVI CSV copy: no year exceeds 1%;
  maximum difference is 0.04% in 2020.

Monthly NDVI has only three 2024 records (January, February, March) and is
therefore omitted. All selected CSVs have no nulls; the analysis-only
`lst_daily.csv` has 89 nulls in each of its two LST value columns.

## Units and metadata caveats

The team documentation gives the LST conversion `DN * 0.02 - 273.15` °C and
describes annual rainfall as a yearly total. Thus annual rainfall is published
as mm/year even though the preferred CSV column is named
`Annual_Mean_Rainfall_mm`; monthly rainfall is mm/month. NDVI is unitless.

The selected annual CSV reports `MODIS/061/MOD13Q1` at 250 m for NDVI, while
the data-team quality report says MOD13A2 at 1000 m. This metadata mismatch is
stored in `meta.warnings` and requires data-team confirmation. The unit
interpretations above have no conflicting unit declaration in the supplied
files and notes.

## Trend results and GIS inputs

No Mann–Kendall/Sen's-slope result is supplied for the selected 2001–2024
series. `analysis/Final_Analysis.ipynb` contains an ordinary least-squares
rainfall trend with a p-value for IMERG and 2001–2008; it is not attached to
the selected GEE/CHIRPS series. Therefore each published indicator has
`trend: null`, and the trend API responds with `{ "available": false }`.

The district boundary and complete study-area inputs are under
`gis/boundaries/`; the builder checks their `.prj` files for EPSG:4326. It
generates `public/data/areas/faisalabad/study-area.geojson`, smaller than
500 KB. No web-ready LULC overlays/legend/change table are provided, so LULC
remains unavailable.

## Generated files and ownership

- `public/data/areas.json` — province and available-area directory.
- `public/data/areas/faisalabad/indicators.json` — annual observations,
  available monthly LST/rainfall, warning metadata, and draft status.
- `public/data/areas/faisalabad/study-area.geojson` — district and supplied
  surrounding-area geometries.

The source notes under `docs/data-team/hasnain/` identify Google Earth Engine,
MODIS, CHIRPS, scale factors, quality filtering, and CRS. The documentation
contact is Hasnain / EarthGuard data team. See
[the data contract](../docs/DATA_CONTRACT.md). Rebuild and validate with
`npm run build:data` and `npm run check:data`; both commands use installed
Zod and add no dependencies.
