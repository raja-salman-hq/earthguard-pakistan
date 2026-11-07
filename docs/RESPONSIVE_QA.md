# Responsive QA

Date: 2026-11-07

## Layout rules

- At widths up to 1180px, Explore uses a compact map layout: filters open as a scrollable sheet, region insights use Summary / Chart / Table tabs, and the desktop chart panel is hidden. The timeline stays at the bottom of the map frame.
- At widths up to 620px, informational and comparison cards use one column. Explore's insight sheet is capped at `min(25dvh, 220px)` while keeping a 200px minimum so its region picker and tabs remain available in short landscape viewports.
- The Explore filter sheet is capped at `min(44dvh, 420px)` so its open/close control remains outside the sheet. Its contents scroll when needed.
- About variable cards use an auto-fitting 260px minimum column; methods and credits use a 300px minimum. These grids collapse to one column on phones.
- Shared cards use `--card-radius`, `--card-padding`, and `--card-shadow`. The radius is 16px and padding scales from 16px to 24px.
- Layer order uses the `--z-*` tokens in `globals.css`: map controls 2, map panels 3, map overlays 4, map popovers 5, chart 6, mobile insights 7, expanded chart 8, header 10, tooltips 12, dropdowns 20, drawers 30, and notices 40.

## Issues found and fixed

| Finding | Change |
| --- | --- |
| A 320px viewport had horizontal overflow because the page required 320px before the browser's vertical scrollbar reduced its content width. | Removed the root `min-width: 320px`; the page now fits the available layout width. |
| At tablet widths, the desktop chart and map panels were squeezed into very narrow columns. | Moved Explore to its compact sheet and tab layout through 1180px. |
| On phones, the region summary sheet and full-width legend covered almost all of the map. | Capped the insight sheet height and kept its content scrollable, leaving an exposed map area for region clicks. |
| Opening the filter sheet covered its own toggle, preventing the user from closing it. | Reduced the sheet's maximum height so the toggle stays accessible. |
| In Change over time mode, the comparison selector increased the filter content height; hotspots were clipped by the panel and had a second nested scrollbar. | Gave the filter panel a bounded flex layout and let its contents, including all hotspot rows, use one scroll area. |
| The map error callback could synchronously update `PakistanMap` while a child `Layer` was rendering. | Queued a single state update in a microtask from `handleMapError`. |
| The dark logo's pale lettering had low contrast on the light theme. | Added a light-theme SVG variant used by both the header and footer. |

## Verification

- `npm run lint`: passed.
- `npm run build`: passed on Next.js 16.4.5.
- Started the production build on port 3001 without stopping the existing development server.
- Checked `/`, `/explore`, `/compare`, `/about`, and a missing route at 14 viewport sizes: 320, 360, 390, 414, 600, 768, 820, 1024, 1280, 1440, and 1920px widths, plus 844×390, 768×1024, and 1024×768. All 70 route/viewport combinations had no document-level horizontal overflow or header/main bounds outside the viewport.
- Checked all five routes in dark/English, light/English, light/Urdu, and dark/Urdu at 320, 640, 768, 853, and 1280px widths. All 100 combinations had no document-level horizontal overflow, and the document language, direction, and theme matched the selected state.
- The 640px and 853px checks approximate 200% and 150% desktop zoom from a 1280px viewport; 1024px was included in the full viewport scan as the 125% equivalent. These are viewport-width simulations, not browser zoom controls.
- Simulated 150% and 200% root font sizing on Explore at 320, 640, and 1280px. No document-level horizontal overflow was found. This does not replace testing an operating system's accessibility font setting.
- At 844×390 landscape, the Explore sheet keeps the region selector and tabs visible, retains summary content, and the page scrolls vertically without horizontal overflow.
- Production browser interactions at 390×900 passed: open/close filters, change variable and province, open Chart and Table tabs, move the timeline by mouse, select a visible map region, choose a hotspot, and toggle light theme/Urdu. No browser console warnings or errors were recorded.
- Switched to Change over time at 320, 390, 768, 1024, and 1280px widths. The filter content stayed within its panel; the year-range thumb moved, the hotspot list used the same scroll area as the other filters, and clicking a hotspot updated the selected region.
- Captured and visually reviewed browser screenshots for the main routes, including phone, tablet, desktop, landscape, and light/Urdu views. The test environment could not load the external basemap, so screenshots show the app's plain-background fallback with the region geometry and fallback notice.

## Test limits

- The missing-route page was captured as the 404 case. `error.tsx` is a runtime error boundary rather than a route; it was not triggered by injecting an application fault. Its shared feedback-card styles were reviewed.
- The backend was not altered or fault-injected. The browser run used the app's labeled demo data; real NASA results and live API error states were outside this layout check.
