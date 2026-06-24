# Project Reference

A maintenance-oriented overview for AI agents working on this codebase. It captures what the app does, how it is built, what external resources it depends on, and the key design decisions that have shaped recent changes.

---

## 1. Functional overview

The application is an **XTream Codes proxy and management console**. It connects to an upstream IPTV provider exposing the standard XTream Codes API (`player_api.php`, `get.php`, `xmltv.php`, and the `/live`, `/movie`, `/series` stream paths), mirrors its catalog into a local database, lets an admin curate it, and re-exposes the catalog to downstream players under its own credentials.

### Main capabilities

- **Catalog mirror** — Live channels, VOD movies, and series are pulled from the upstream and stored locally (`live_streams`, `vod_streams`, `series`, plus the per-item detail tables `vod_info`, `series_info`). Categories are mirrored into `categories`.
- **Synchronization engine** — Sync runs are tracked in `sync_runs` with per-type state (`running` / `success` / `failed` / `cancelled`), progress counters, and a human-readable message. The engine supports interval-based auto-sync, manual triggers, cancellation, and progress reporting.
- **Curation** — Admins can:
  - Toggle individual categories and streams on/off via the `enabled` flag.
  - Define **custom categories** (`custom_categories`) and attach streams to them (`custom_category_streams`).
  - Edit metadata in the Content page.
- **Downstream API surface** — The app re-implements the XTream endpoints under `src/routes/api/public/` so existing IPTV players can be pointed at this app instead of the upstream. Stream URLs (`/live/$user/$pass/$file`, `/movie/...`, `/series/...`) redirect to the upstream after authenticating the caller.
- **Admin UI** — Authenticated dashboard with pages for Dashboard, Sync, Categories, Custom Categories, Content, Users, Settings, Profile.
- **Scheduled execution** — `/api/public/cron` is a public, idempotent endpoint that triggers `maybeRunDueSyncs` and is meant to be hit by an external scheduler (or pg_cron).

### Key UX rules learned over time

- The **Recently added** counters on the Dashboard bucket by the upstream `added` / `last_modified` timestamp, not by the local `created_at` (which collapses everything to the first sync date).
- The **Sync page → Recently added** table respects the "Show enabled only" filter server-side and uses an explicit row limit so the filter is visibly effective (Supabase otherwise caps un-paginated selects at 1000 rows).
- The **Sync page → Recent sync runs** overview shows **at most 3 rows per type**; the underlying query fetches 30 results so all three types have a fair sample.
- A running sync surfaces **live progress** (phase + processed/total) in the same row via `sync_runs.items_processed` and `sync_runs.message`.

---

## 2. Technical stack

| Layer | Choice |
| --- | --- |
| Framework | **TanStack Start v1** (React 19, Vite 7) |
| Routing | TanStack Router, file-based, `src/routes/**` |
| Server logic | `createServerFn` (RPC) from `@tanstack/react-start`; raw HTTP routes under `src/routes/api/public/` |
| Runtime | Cloudflare Workers (via `@cloudflare/vite-plugin`) with `nodejs_compat` |
| Data fetching | TanStack Query, wired through the router context |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`), tokens in `src/styles.css`, shadcn-style primitives in `src/components/ui/*` |
| Forms / validation | `react-hook-form` + `zod` (+ `@hookform/resolvers`) |
| Backend | **Lovable Cloud** (Supabase under the hood) — Postgres + Auth + RLS |
| Auth | Supabase Auth, gated by the `_authenticated` layout route |
| Icons / misc | lucide-react, sonner (toasts), recharts |

### Project layout

```
src/
  routes/
    __root.tsx                 # shell, providers
    _authenticated.tsx         # auth gate + sidebar layout (Outlet)
    _authenticated/
      dashboard.tsx
      sync.tsx
      categories.tsx
      custom-categories.tsx
      content.tsx
      users.tsx
      settings.tsx
      profile.tsx
    api/public/                # downstream XTream API surface + cron + health
      player_api[.]php.ts
      get[.]php.ts
      xmltv[.]php.ts
      live/$user/$pass/$file.ts
      movie/$user/$pass/$file.ts
      series/$user/$pass/$file.ts
      cron.ts
      health.ts
    index.tsx                  # landing
    login.tsx
  lib/
    admin.functions.ts         # client-callable serverFns (dashboard data, sync_runs queries, recent items)
    sync.server.ts             # sync engine (live/vod/series), progress, cancellation, interval scheduler
    xtream-client.server.ts    # upstream XTream HTTP client
    proxy-helpers.server.ts    # request/credential helpers for downstream API
    stream-redirect.server.ts  # redirects /live|/movie|/series to upstream
    error-capture.ts / error-page.ts / utils.ts
  integrations/supabase/       # AUTO-GENERATED, do not edit
    client.ts                  # browser client (publishable key)
    client.server.ts           # service-role client (server only)
    auth-middleware.ts         # requireSupabaseAuth for protected serverFns
    auth-attacher.ts           # attachSupabaseAuth global middleware
    types.ts                   # generated DB types
  components/                  # ServiceStatus, layout/AppLayout, ui/* (shadcn)
  start.ts / server.ts / router.tsx / styles.css
supabase/
  migrations/                  # 5 migrations defining the full schema
  config.toml                  # auto-generated, do not edit
```

### Server-function conventions

- `.functions.ts` files are client-safe modules; only the `.handler()` body is stripped from the client bundle.
- `.server.ts` files are server-only and are filename-protected from the client bundle.
- Protected RPCs use `.middleware([requireSupabaseAuth])`. The global `attachSupabaseAuth` middleware is registered in `src/start.ts` — without it, calls fail with `Unauthorized: No authorization header provided`.
- `process.env.*` must be read **inside** `.handler()`, not at module scope.

---

## 3. Database

All tables live in `public` and have RLS enabled with explicit `GRANT`s (Lovable Cloud requirement).

| Table | Purpose |
| --- | --- |
| `app_settings` | Singleton key/value settings: upstream credentials, sync interval, feature flags. |
| `categories` | Mirrored upstream categories. `type` ∈ `live` / `vod` / `series`. `enabled` toggles visibility downstream. |
| `live_streams` | Mirrored live channels. `category_id` is **text**. `added` is a 10-digit unix-seconds string. `enabled` toggles visibility. |
| `vod_streams` | Mirrored VOD. Same shape as `live_streams`; `added` is unix-seconds text. |
| `series` | Mirrored series. Uses `last_modified` (unix-seconds text) instead of `added`. |
| `vod_info` | Per-VOD detail blob fetched lazily during sync. |
| `series_info` | Per-series detail (seasons/episodes). |
| `sync_runs` | One row per sync attempt per type. Columns: `type`, `status` (`running`/`success`/`failed`/`cancelled`), `items_processed`, `items_total`, `message`, timestamps. Used both as audit log and as the live progress channel. |
| `custom_categories` | Admin-defined virtual categories. |
| `custom_category_streams` | Many-to-many between custom categories and streams. |

### Migration practice

- Every new public table includes `GRANT` statements in the same migration, BEFORE `ENABLE ROW LEVEL SECURITY` + policies.
- Default grant template: `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated; GRANT ALL ... TO service_role;` — add `anon` only when a policy intentionally allows public reads.

---

## 4. External resources

- **Upstream XTream Codes provider** — host, username, password stored in `app_settings`. All upstream calls are server-side via `src/lib/xtream-client.server.ts`.
- **Lovable Cloud (Supabase)** — Postgres, Auth (email + Google by default), RLS. Service-role key is only available to the server runtime; never reference it on the client or instruct the user to fetch it.
- **External cron** — any HTTP scheduler hitting `GET/POST /api/public/cron` on the published URL (`project--<id>.lovable.app`).

---

## 5. Notable design decisions

1. **Mirror, don't proxy reads.** The upstream is slow and rate-limited; mirroring into Postgres makes the UI snappy and the downstream API resilient. Stream playback itself is a redirect, not a proxy.
2. **Sync engine writes progress into the same row UIs already read.** `sync_runs.items_processed` + `message` are updated during a run, so the "Recent sync runs" list doubles as a live progress widget without a websocket/SSE channel.
3. **Cancellation is cooperative.** `reportProgress` / `checkCancelled` re-read the row and bail when `status !== "running"`, so the UI can cancel a long sync by flipping the row's status.
4. **Bucket by upstream timestamps, not local `created_at`.** Dashboard "Recently added" must use `live_streams.added`, `vod_streams.added`, `series.last_modified` (10-digit unix-seconds text, compared lexicographically with zero-padded bounds) — otherwise Movies/Series counts collapse to the first-sync date and look like zeros.
5. **Explicit limits when filters drive a list.** Supabase silently caps un-paginated `.select()` at 1000 rows, which made the "Show enabled only" toggle look broken. Filtered lists pass an explicit `limit`.
6. **Public API routes carry their own security.** `/api/public/*` bypasses the auth gate, so each route validates the caller (XTream user/pass for stream/player endpoints, idempotent + cheap for `cron`).
7. **No Supabase Edge Functions for app-internal logic.** All in-app server logic uses `createServerFn`. Edge Functions would only be appropriate for webhooks/cron/public APIs — and even those are implemented here as TanStack `server` routes under `src/routes/api/public/` instead.
8. **Auto-generated files are off-limits.** Never edit `src/integrations/supabase/{client,client.server,auth-middleware,auth-attacher,types}.ts`, `src/routeTree.gen.ts`, `supabase/config.toml`, or the `VITE_SUPABASE_*` lines in `.env`.

---

## 6. Constraints to remember when editing

- **Worker runtime**: no `child_process`, `sharp`, `fs.watch`, `os.cpus()`. Avoid Node-only npm packages. `process.env.*` is server-only and undefined at module scope of shared files.
- **Tailwind v4**: tokens live in `src/styles.css` via `@theme`. Load remote fonts via `<link>` in `__root.tsx`, never via `@import` of a remote URL in `styles.css`.
- **Type-safe routing**: every `<Link to="...">` must point at an existing route file. Add the route file before the link.
- **Layouts need `<Outlet />`.** `_authenticated.tsx` is the auth gate + sidebar; child routes render inside its `<Outlet />`.
- **Protected serverFns** cannot be called from public-route loaders (SSR/prerender has no session) — call them from components via `useServerFn` + `useQuery`, or move the route under `_authenticated/`.
- **RLS is mandatory** on every new public table, together with explicit GRANTs.
- **Secrets discipline**: never log, echo, or surface `SUPABASE_SERVICE_ROLE_KEY` or the DB password; they are not accessible on Lovable Cloud anyway.

---

## 7. Where to start when changing a feature

- **Dashboard widgets / counters** → `src/routes/_authenticated/dashboard.tsx` + the corresponding query in `src/lib/admin.functions.ts`.
- **Sync behavior** → `src/lib/sync.server.ts` (engine, progress, cancellation, scheduler). UI in `src/routes/_authenticated/sync.tsx`.
- **Catalog curation** → `src/routes/_authenticated/categories.tsx`, `custom-categories.tsx`, `content.tsx`.
- **Downstream XTream compatibility** → `src/routes/api/public/player_api[.]php.ts`, `get[.]php.ts`, `xmltv[.]php.ts`, and the `live|movie|series/$user/$pass/$file.ts` redirects, with shared helpers in `src/lib/proxy-helpers.server.ts` and `src/lib/stream-redirect.server.ts`.
- **Upstream calls** → `src/lib/xtream-client.server.ts`.
- **Schema changes** → new file under `supabase/migrations/` with `CREATE TABLE` → `GRANT` → `ENABLE RLS` → `CREATE POLICY` in that exact order.
