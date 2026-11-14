# EarthGuard Pakistan

EarthGuard Pakistan is an interactive dashboard for the Faisalabad real-data
pilot. The app includes a Pakistan map, time-series and trend views,
indicator comparisons, data export, Urdu/RTL support, and a synthetic demo mode.
Real observations currently cover Faisalabad District and the supplied
surrounding study area for 2001–2024. The frontend displays team-provided
statistics only; trend statistics are never calculated in the browser.

## Run locally

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Real Faisalabad static data
is used when `NEXT_PUBLIC_USE_MOCK` is unset or `false`. Set it to `true` only
to enable clearly labeled synthetic demo data. The real data is marked `draft`
pending data-team verification.

## Faisalabad data

The selected source files and their provenance are listed in
[data/README.md](data/README.md). The static data schema and build process are
documented in [docs/DATA_CONTRACT.md](docs/DATA_CONTRACT.md). Rebuild and check
the published JSON with:

```bash
npm run build:data
npm run check:data
```

There is no live backend connected in this phase. `NEXT_PUBLIC_API_URL` and the
future FastAPI contract are retained for the backend integration; see
[docs/API_CONTRACT.md](docs/API_CONTRACT.md). `NEXT_PUBLIC_USE_MOCK` is the
single demo/real switch and is centralized in `src/lib/api/client.ts`.

In Vercel, set `NEXT_PUBLIC_USE_MOCK=true` only when explicitly enabling the
synthetic demo; unset or set it to `false` for real Faisalabad static data.
Redeploy after changes.
`NEXT_PUBLIC_*` values are embedded at build time; changing them does not update
an existing deployment.

To validate a running backend, set `NEXT_PUBLIC_API_URL` and run:

```bash
npm run check:api
```

The API checker remains for future live-backend integration; static pilot JSON
is validated with Zod by `npm run check:data`.

## Project structure

- `src/app/` — app routes and global styles
- `src/components/` — provider, layout, and route-shell components
- `src/lib/api/` — validated API client and mock/real switch
- `src/lib/mock/` — synthetic demo response data
- `src/store/` — Zustand UI state synchronized with URL search parameters
- `src/types/` — API response types and Zod schemas
- `scripts/` — approved CSV-to-JSON data builder and data checker
- `data/` — supplied source datasets; see [data/README.md](data/README.md)
- `public/data/areas/` — generated static area data consumed by the app
- `docs/` — [design tokens](docs/DESIGN_SYSTEM.md), [API contract](docs/API_CONTRACT.md), and [data contract](docs/DATA_CONTRACT.md)

## Checks

```bash
npm run lint
npm run build
npm run dev
npm run start
npm run test:e2e
npm run check:api
npm run build:data
npm run check:data
```
