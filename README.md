# EarthGuard Pakistan

An interactive foundation for exploring environmental change across Pakistan.
The app includes an interactive Pakistan map, time-series and trend views,
regional/variable comparisons, data export, Urdu/RTL support, and a synthetic
demo mode. Backend-computed statistics are displayed by the frontend; trend
statistics are never calculated in the browser.

## Run locally

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Mock mode is enabled by
default in `.env.example`; every demo value is synthetic and clearly labeled.

## Connect to the backend

For local development, set these in `.env.local`:

```env
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=http://localhost:8000
```

The FastAPI service must implement
[docs/API_CONTRACT.md](docs/API_CONTRACT.md). When calling it directly, configure
its CORS policy to allow the frontend origin. Production deployments must use
HTTPS for both the frontend and backend.

In Vercel, add `NEXT_PUBLIC_USE_MOCK` and `NEXT_PUBLIC_API_URL` to the project's
Environment Variables for each environment, then redeploy. `NEXT_PUBLIC_*`
values are embedded at build time; changing them does not update an existing
deployment. The configured backend origin is added to the Content Security
Policy `connect-src` at build time by [next.config.ts](next.config.ts).

To validate a running backend, set `NEXT_PUBLIC_API_URL` and run:

```bash
npm run check:api
```

The checker validates all endpoints against the frontend Zod schemas and checks
the seven supported variable and region IDs, map-layer region coverage, valid
dates, and finite non-null data values.

The current frontend calls the backend origin directly. This requires CORS and
HTTPS configuration but is the simplest deployment. Next.js rewrites could
avoid browser CORS configuration by making requests appear same-origin, but
would not make the backend URL secret and would add a proxy layer. Choose direct
requests or rewrites before any proxy implementation.

## Project structure

- `src/app/` — app routes and global styles
- `src/components/` — provider, layout, and route-shell components
- `src/lib/api/` — validated API client and mock/real switch
- `src/lib/mock/` — synthetic demo response data
- `src/store/` — Zustand UI state synchronized with URL search parameters
- `src/types/` — API response types and Zod schemas
- `docs/` — [design tokens](docs/DESIGN_SYSTEM.md) and [API contract](docs/API_CONTRACT.md)

## Checks

```bash
npm run lint
npm run build
npm run check:api
```
