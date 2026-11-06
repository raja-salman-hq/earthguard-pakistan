# EarthGuard Pakistan

An interactive foundation for exploring environmental change across Pakistan.
This phase contains the design system, API contract and synthetic demo layer,
shareable UI state, responsive site shell, landing page, and placeholder
Explore/Compare/About pages. Map and charts are intentionally not included yet.

## Run locally

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Mock mode is enabled by
default in `.env.example`; every demo value is synthetic and clearly labeled.
Set `NEXT_PUBLIC_USE_MOCK=false` and configure `NEXT_PUBLIC_API_URL` to connect a
backend implementing the draft contract in [docs/API_CONTRACT.md](docs/API_CONTRACT.md).

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
```
