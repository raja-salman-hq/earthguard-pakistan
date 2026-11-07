# EarthGuard Pakistan design system

The interface uses a dark, data-first visual language: deep blue-black surfaces,
quiet borders, high-contrast type, and restrained green/blue highlights. The dark
theme is the default. The header toggle switches to the light token set.

## Brand assets

- Use `public/brand/earthguard-horizontal.svg` for horizontal navigation and
  footer lockups. Render it at roughly 180–212 CSS pixels wide; its logo mark is
  designed to remain legible at 32 CSS pixels high.
- Use `public/brand/earthguard-mark.svg` when only the symbol fits, including
  the favicon. The Apple touch icon and 1200 × 630 social preview are generated
  through the App Router metadata image conventions.
- The SVG wordmark uses the brand teal `#22D3A6` and the dark surface `#121B2E`.
  Keep these in sync with `--primary` and `--surface` in the stylesheet tokens.
- Set `SITE_URL` in the deployment environment to the canonical public origin.
  The `.example` value in `.env.example` is a placeholder, not a production URL.

## Color tokens

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| `--background` | `#0B1220` | `#F4F7FB` | Page background |
| `--surface` | `#121B2E` | `#FFFFFF` | Cards and panels |
| `--surface-raised` | `#17233A` | `#EDF3FA` | Raised controls and hover surfaces |
| `--border` | `#1E2A44` | `#D3DEEB` | Dividers and component outlines |
| `--primary` | `#22D3A6` | `#087F66` | Primary actions and positive emphasis |
| `--accent` | `#3B82F6` | `#2563EB` | Secondary links and emphasis |
| `--heat` | `#F97316` | `#C2410C` | Warm-series/data emphasis |
| `--heat-strong` | `#EF4444` | `#B91C1C` | Strong warm-series emphasis |
| `--cool` | `#38BDF8` | `#0369A1` | Cool-series/data emphasis |
| `--text` | `#E6EDF7` | `#132033` | Primary text |
| `--muted` | `#A4B2C9` | `#475A74` | Supporting text |
| `--subtle` | `#71819E` | `#5E7089` | Tertiary text and decorative detail |

These are CSS custom properties in `src/app/globals.css`, exposed as Tailwind 4
theme utilities through `@theme inline`. Body text and muted text are selected
for readable contrast on their corresponding page backgrounds. Keep meaning
available through labels or symbols as well as color.

### Data visualization colors

- Diverging change: cool blue → near-white → warm red. Use a neutral midpoint.
- Sequential absolute values: a viridis-like progression from deep violet/blue
  through teal and green to yellow.
- The warm and cool tokens above are accents, not a complete statistical palette.
  Add explicit labels, units, and direction indicators when charts are introduced.

## Typography

- Interface: **Inter**, self-hosted at build time with `next/font/google`.
- Numeric/data: **JetBrains Mono**, also self-hosted with `next/font/google`.
- Urdu body text and headings use **Noto Nastaliq Urdu**, self-hosted at build
  time through `next/font/google`. Give Nastaliq text a line height near 2.1 and
  enough block padding to avoid clipping large headings.
- Urdu controls, labels, buttons, tooltips, and compact UI text use
  **Noto Sans Arabic** for legibility at small sizes. Nastaliq is harder to read
  at compact sizes, so keep it for body copy and headings rather than dense
  controls.
- Urdu font faces are not preloaded and apply only while the root document has
  `lang="ur"`; English remains Inter and JetBrains Mono. Keep numeric values,
  years, and units in JetBrains Mono, wrapped in an LTR `<bdi>` when embedded in
  Urdu text. This preserves Latin digits without disturbing RTL text flow.
- Urdu interface panels follow RTL inline-start/inline-end placement. The map
  and timeline retain LTR direction so geography and year progression do not
  reverse.

Tailwind's `font-sans` and `font-mono` map to these font variables. Use mono for
compact numeric readouts, not paragraphs.

## Shape, spacing, and motion

- Cards and larger panels: 16px radius; compact controls: 10–12px.
- Use thin tokenized borders and soft, low-opacity shadows instead of heavy
  outlines.
- Preserve generous space around section headings and data content.
- Keep motion subtle and respect `prefers-reduced-motion`.

## Theme and accessibility

The app starts in dark mode. `data-theme="light"` on the root element activates
the light token set. The selected theme and language are part of the shareable
URL state. Interactive controls have labels, keyboard focus remains visible, and
the UI does not use color as the sole indicator of meaning.
