# Litely

Fast, private browser utilities for images, PDFs, QR codes and color palettes.

**Everything runs locally in your browser.** Files never leave the device, there is no backend,
no database and no account system. Litely deploys as a fully static frontend.

## Tools

| Category | Tool | Route |
| --- | --- | --- |
| Image | Image Compressor | `/tools/image-compressor` |
| Image | Image Converter | `/tools/image-converter` |
| PDF | PDF Merger | `/tools/pdf-merger` |
| PDF | PDF Splitter | `/tools/pdf-splitter` |
| PDF | PDF Page Extractor | `/tools/pdf-extractor` |
| PDF | PDF Reorder | `/tools/pdf-reorder` |
| Generators | QR Code Generator | `/tools/qr-generator` |
| Image analysis | Color Palette Extractor | `/tools/color-palette-extractor` |

## Quick start

```bash
npm install
npm run dev        # local dev server
npm test           # pure-logic smoke tests (Node 24+)
npm run build      # typecheck + icons + production build → dist/
npm run preview    # preview the production build
```

## How processing works

- **Images**  -  a dedicated Web Worker decodes with `createImageBitmap`, resizes on an
  `OffscreenCanvas`, and re-encodes to JPEG/WebP/AVIF (or lossless/quantized PNG via UPNG).
  Every file is processed one at a time so memory stays bounded. A second worker builds ZIPs.
- **PDFs**  -  `pdf-lib` runs inside a worker for merge/split/extract/reorder. Page thumbnails
  lazy-load `pdfjs-dist` (and its worker) only when the extractor or reorder page needs them.
- **QR codes**  -  matrix generation via `qrcode-generator` with custom canvas/SVG rendering,
  color + quiet-zone + error-correction options and contrast warnings.
- **Palettes**  -  real median-cut quantization over the full image (in a worker), with dominant /
  vibrant / muted / balanced ranking, role-based palette editor and CSS/JSON/PNG exports.

## Privacy model

- No files, file names or PDF contents are ever uploaded.
- The only stored data is lightweight UI state in `localStorage`: theme, favorite tools and a
  short list of recently opened tool ids.
- Tool pages explicitly state when a browser limitation applies (e.g. AVIF encode support,
  metadata stripping on re-encode) rather than pretending.

## Architecture

```
src/
  lib/            domain logic & types (image/color/palette/qr/pdf helpers)
  workers/        Web Workers (image, pdf, palette, zip)
  components/     UI primitives, layout, command palette, file & result components
  pages/          route pages (each tool is lazy-loaded)
  styles*.css     design tokens + component styles (light & dark)
```

Code splitting is applied per tool and per heavy library; the homepage does not load any PDF or
encoding engines.

## PWA & offline

`vite-plugin-pwa` registers a service worker that precaches the app shell and all heavy
processing chunks. Because every tool is fully client-side, offline use works for the tools
after the first visit cached them. Nothing fake is claimed: tools that genuinely need network
are not advertised as offline.

## SEO

Every tool has its own route with a unique title, meta description, canonical URL, Open Graph
tags and WebApplication structured data (see `src/lib/head.tsx`). Static hosts should map all
routes to `index.html` (SPA fallback); for best crawler results you can pre-render the shell
per route, but the client-side metadata already matches each route 1:1.

## Future monetization / ads (safe by default)

- Ad containers (`components/sections.tsx → AdSlot`) render nothing until an ad provider is
  configured via `window.__LITELY_ADS__`. The product looks and works identically without ads.
- Payment is intentionally *not* implemented. If you later add a Pro tier, introduce a
  `PaymentProvider` abstraction (see the mock-free guidance in the spec) and never trust
  client-side state for paid access. Core tools stay free.

## Deploy

Static output in `dist/`. Works on Vercel, Netlify, Cloudflare Pages and GitHub Pages. The
content is self-contained; no environment variables or functions are required. Remember to set
`base: '/'` (or the correct base) in `vite.config.ts` for sub-path hosting.
