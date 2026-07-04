# Server-side / runtime work dropped in the Astro port

The source (`genai/`) was a Vite + React SPA (react-router-dom) backed by
Supabase, with `@tanstack/react-query` wiring in `App.tsx`. Astro builds to
static output (`output: 'static'`), so a few things do not translate cleanly and
are flagged here.

## Dropped

- **`genai/src/App.tsx`** — the `<BrowserRouter>` / `<Routes>` tree and the
  `@tanstack/react-query` `QueryClientProvider`. Astro owns routing via
  `src/pages/`. No page used react-query, so the provider was dropped entirely
  (this also removes the only `@tanstack/*` import). The global `<AuthProvider>`,
  `<Toaster />` (Sonner), and route protection (`<Protected>`) were reconstructed
  per-island in `src/components/app/AppFrame.tsx`.
- **`genai/src/main.tsx`** — SPA bootstrap (`createRoot`). Not needed; islands
  hydrate individually.
- **`genai/index.html`** — replaced by Astro pages + `src/layouts/Layout.astro`.

## TODO: runtime-id routes need SSR or a SPA fallback

`src/pages/scans/[id].astro` and `src/pages/scans/[id]/report.astro` are keyed by
a **runtime Supabase row id**. Under static output there is no set of paths to
prerender, so their `getStaticPaths()` returns `[]` and the page is a
`client:only` React island that reads the id from `window.location` and fetches
the scan at runtime.

For arbitrary `/scans/<id>/` URLs to resolve on the deployed host, one of:

- Add an SSR adapter (e.g. `@astrojs/cloudflare`) and set `prerender = false` on
  these routes, **or**
- Configure a SPA fallback so unknown `/scans/*` paths serve a shell that
  hydrates the island.

## TODO: Supabase env + backend

The client (`src/integrations/supabase/client.ts`) reads
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `import.meta.env`.
The auth (`/auth`) and scan CRUD pages require a live Supabase project with the
`scans` table (see `genai/supabase/`). Provide these env vars before the app
routes function.
