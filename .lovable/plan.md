# XTream Proxy Manager

A self-hosted admin app that connects to an upstream XTream Codes API, mirrors its catalog into Postgres on configurable schedules, and re-publishes a filtered XTream API for IPTV players.

## Stack
- TanStack Start (existing template)
- Lovable Cloud (Postgres + Auth)
- Server functions for sync + admin RPC
- Public server route at `/player_api.php` (and `/xmltv.php`, `/get.php`) for the re-published XTream API

## Auth model
- **Admin UI**: Lovable Cloud email/password. First signup becomes admin (single-admin app — signup disabled after first user via a DB trigger check).
- **Published proxy**: single fixed `proxy_username` / `proxy_password` stored in `app_settings`, validated by the public route. No Supabase session involved.

## Data model (migrations)

```
app_settings (singleton row)
  id, xtream_host, xtream_username, xtream_password,
  proxy_username, proxy_password,
  sync_interval_live_minutes, sync_interval_vod_minutes, sync_interval_series_minutes,
  last_sync_live_at, last_sync_vod_at, last_sync_series_at,
  updated_at

categories
  id (pk), upstream_id, type ('live'|'vod'|'series'), name, parent_id, enabled (bool, default true)

live_streams
  id (pk), upstream_id (unique), name, stream_icon, epg_channel_id, added,
  category_id (fk categories.upstream_id where type=live),
  custom_sid, tv_archive, direct_source, tv_archive_duration, raw jsonb

vod_streams
  id (pk), upstream_id (unique), name, stream_icon, rating, added,
  category_id, container_extension, custom_sid, direct_source, raw jsonb

vod_info
  vod_id (pk fk vod_streams.upstream_id), info jsonb, movie_data jsonb, fetched_at

series
  id (pk), upstream_id (unique), name, cover, plot, cast, director, genre,
  release_date, last_modified, rating, category_id, raw jsonb

series_info
  series_id (pk fk series.upstream_id), info jsonb, seasons jsonb, fetched_at

episodes
  id (pk), series_id (fk), season int, episode_num int, upstream_id, title,
  container_extension, info jsonb, added

sync_runs
  id, type ('live'|'vod'|'series'|'vod_info'|'series_info'|'all'),
  status ('running'|'success'|'error'), started_at, finished_at, message, items_processed
```

RLS: all tables admin-only via `requireSupabaseAuth`. Public route uses `supabaseAdmin` (service role) after validating proxy credentials.

## Server functions (admin, in `src/lib/*.functions.ts`)
- `getSettings`, `updateSettings`
- `testConnection` — calls upstream `player_api.php?action=get_account_info`
- `runSync({ type })` — sync categories+listings for one section; on `vod`/`series` also enqueues deep info fetches
- `getCategories({ type })`, `setCategoryEnabled({ id, enabled })`, `bulkSetCategories`
- `getStats` — counts per type, last sync timestamps, recent `sync_runs`
- `getSyncRuns`

## Scheduling
Cloudflare Workers cron is not configured by default in this template, so we use a **lazy scheduler** invoked from the published API route and a manual "Sync now" button:
- Each call to `/player_api.php` checks `last_sync_*_at` vs interval and, if due, fires a non-blocking `runSync()` via `ctx.waitUntil`-style detached promise.
- A dedicated `/api/public/cron` endpoint (token-protected) lets the user wire any external cron (e.g. cron-job.org) to guarantee periodic sync even without traffic.
- "Sync now" buttons in the UI for each section.

## Public XTream API (`src/routes/api/public/`)
Single file route `player_api.$.tsx` won't work cleanly — instead one file per XTream endpoint:
- `player_api.php.ts` — handles `action=` query: `get_live_categories`, `get_vod_categories`, `get_series_categories`, `get_live_streams`, `get_vod_streams`, `get_series`, `get_series_info`, `get_vod_info`, `get_account_info`, none (auth probe).
- `xmltv.php.ts` — fetches upstream XMLTV, optionally filters by enabled live category channels, streams response.
- `get.php.ts` — generates M3U from DB filtered by enabled categories.

All endpoints require `?username=&password=` matching `app_settings.proxy_*`. Stream URLs returned in playlists/responses are built pointing to the **upstream host** (`http://{xtream_host}/live/{user}/{pass}/{id}.ts`, etc.) — no byte-level proxying. Playback hits upstream directly.

Filtering: any item whose `category_id` belongs to a `categories` row with `enabled=false` is excluded.

## Admin UI (`src/routes/_authenticated/`)
- `/login` — email/password (public)
- `/` — Dashboard: connection status, counts, last syncs, "Sync now" buttons, recent runs
- `/settings` — XTream credentials, proxy credentials, intervals, test connection, copy proxy URL/playlist URL
- `/categories` — tabs Live/VOD/Series, table with enable toggle, search, bulk enable/disable
- `/content` — browse synced live/vod/series with filters (read-only, paginated)

Design: dark, dense, IPTV/admin-console feel. Slate/zinc + a single accent (cyan). Inter font. Compact tables, sidebar nav, status pills.

## Implementation order
1. Enable Lovable Cloud, run migrations, set up admin auth (email/password, signup-disabled-after-first).
2. Settings + connection test + categories sync.
3. Listings sync (live/vod/series) + deep info sync (vod_info/series_info/episodes).
4. Public XTream API route handlers with filtering.
5. Admin UI (dashboard, settings, categories, content browser).
6. Lazy scheduler + `/api/public/cron` endpoint.

## Notes / non-goals
- No byte-level video proxy (per your choice) — players connect to upstream for playback.
- No multi-tenant proxy users — single fixed proxy account.
- EPG XMLTV is passed through (optionally filtered) but not stored row-by-row; storing full EPG would balloon the DB.
- Deep info sync (every VOD + every series episode) is heavy; first run will take a while and run in batches with rate limiting.