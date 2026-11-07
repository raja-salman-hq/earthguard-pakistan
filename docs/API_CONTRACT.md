# EarthGuard Pakistan API contract

The frontend contract is a draft for the backend integration. Request and
response validation is defined in `src/types/api.ts`; all HTTP calls pass through
`src/lib/api/`. No trend statistics are calculated in the browser.

Set `NEXT_PUBLIC_USE_MOCK=true` for synthetic demo responses. Set it to `false`
to call `NEXT_PUBLIC_API_URL`. Every response, including mock responses, is
validated with its endpoint Zod schema before it is returned.

The examples below are illustrative and are **not NASA observations**. The mock
regions have no geometries. The explore map uses the local
`public/data/pakistan-provinces.geojson` geoBoundaries FeatureCollection, whose
province names are read from `properties.shapeName` and mapped explicitly to
mock region IDs. Unknown or missing regions are errors; the frontend does not
guess a mapping.

## `GET /api/variables`

Request:

```http
GET /api/variables
```

Response:

```json
[
  {
    "id": "air_temperature",
    "name": "Air temperature",
    "unit": "°C",
    "description": "Near-surface air temperature.",
    "source": "Backend data source",
    "availableFrom": 2000,
    "availableTo": 2025
  }
]
```

## `GET /api/regions`

Request:

```http
GET /api/regions
```

Response (geometry is null in the demo; live data should provide valid
Polygon/MultiPolygon geometries):

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "punjab",
      "properties": { "id": "punjab", "name": "Punjab" },
      "geometry": null
    }
  ]
}
```

The current frontend schema supports Polygon and MultiPolygon region geometries.
The seven mock region names are Punjab, Sindh, Khyber Pakhtunkhwa, Balochistan,
Gilgit-Baltistan, Azad Kashmir, and Islamabad. They are names only, not a
boundary dataset.

## `GET /api/timeseries`

Request:

```http
GET /api/timeseries?variable=air_temperature&region=punjab&start=2000&end=2000&resolution=monthly
```

Parameters: `variable`, `region`, integer `start` and `end` years from 2000 to
2025, and `resolution` (`monthly` or `yearly`). `start` must not exceed `end`.

Response:

```json
{
  "variable": "air_temperature",
  "region": "punjab",
  "unit": "°C",
  "points": [
    { "date": "2000-01-01", "value": 14.2 },
    { "date": "2000-02-01", "value": 15.1 }
  ]
}
```

Demo monthly series are generated for every month from 2000 through 2025 with
illustrative seasonal cycles and gentle trends. Demo yearly points use a
representative seasonal value and are placeholders, not annual aggregates.
Define the live API's annual aggregation semantics with the backend.

## `GET /api/trend`

Request:

```http
GET /api/trend?variable=air_temperature&region=punjab&start=2000&end=2025
```

Response:

```json
{
  "slope": 0.035,
  "unit": "°C/year",
  "pValue": 0.03,
  "significant": true,
  "direction": "increasing",
  "changeTotal": 0.9,
  "changePercent": 3.8,
  "confidence": 0.95,
  "summary": "Backend-generated plain-language summary."
}
```

The backend owns slope, Mann–Kendall, p-value, significance, and confidence
calculations. Mock trend fields are fixed synthetic examples and do not describe
the generated time series or any real region.

## `GET /api/map-layer`

Request:

```http
GET /api/map-layer?variable=air_temperature&year=2025&comparison=absolute
```

Response:

```json
[
  { "regionId": "punjab", "value": 34.1 },
  { "regionId": "sindh", "value": 34.8 }
]
```

The response contains one value per region. Its unit is the selected variable's
unit from `/api/variables` for `absolute` comparisons. Supported comparisons:

- `absolute`: the selected year's value.
- `previous-year`: selected year minus the preceding year.
- `range-start&baselineYear=2000`: selected year minus the supplied range start.
- `backend`: an explicit signed change value supplied by the backend.

For change comparisons, `value` is a signed difference in the selected
variable's unit, not a trend statistic. `baselineYear` is accepted only with
`comparison=range-start`; it must be from 2000 through the selected year. The
backend remains responsible for map values in live mode. The synthetic mock
calculates illustrative differences from its generated values and they are not
NASA observations. The `backend` comparison must return an explicit change
layer from the backend; the frontend will not substitute absolute values. In
demo mode, this option uses the mock-generated 2000-to-selected-year difference
as an explicitly synthetic stand-in.

The boundary file is attributed to geoBoundaries under CC BY 4.0. Include
`geoBoundaries` with a link to https://www.geoboundaries.org in derivative
products.

## `GET /api/hotspots`

Request:

```http
GET /api/hotspots?variable=air_temperature&limit=5
```

`limit` is an integer from 1 to 25.

Response:

```json
[
  {
    "regionId": "punjab",
    "value": 34.1,
    "unit": "°C",
    "direction": "increasing",
    "changePercent": 3.8,
    "significant": true,
    "summary": "Backend-generated explanation for this region."
  }
]
```

Hotspot significance is supplied by the backend. Demo hotspot values and
significance flags are synthetic and must never be presented as real findings.
