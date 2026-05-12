
-- Settings (singleton)
create table public.app_settings (
  id uuid primary key default gen_random_uuid(),
  xtream_host text not null default '',
  xtream_username text not null default '',
  xtream_password text not null default '',
  proxy_username text not null default 'proxy',
  proxy_password text not null default 'changeme',
  sync_interval_live_minutes int not null default 360,
  sync_interval_vod_minutes int not null default 1440,
  sync_interval_series_minutes int not null default 1440,
  last_sync_live_at timestamptz,
  last_sync_vod_at timestamptz,
  last_sync_series_at timestamptz,
  updated_at timestamptz not null default now()
);

-- enforce singleton via partial unique index trick
create unique index app_settings_singleton on public.app_settings ((true));

-- seed singleton
insert into public.app_settings (id) values (gen_random_uuid());

-- Categories
create table public.categories (
  id bigserial primary key,
  upstream_id text not null,
  type text not null check (type in ('live','vod','series')),
  name text not null,
  parent_id text,
  enabled boolean not null default true,
  unique (type, upstream_id)
);
create index categories_type_enabled on public.categories(type, enabled);

-- Live streams
create table public.live_streams (
  id bigserial primary key,
  upstream_id text not null unique,
  name text,
  stream_icon text,
  epg_channel_id text,
  added text,
  category_id text,
  custom_sid text,
  tv_archive int,
  direct_source text,
  tv_archive_duration int,
  num int,
  raw jsonb
);
create index live_streams_category on public.live_streams(category_id);

-- VOD
create table public.vod_streams (
  id bigserial primary key,
  upstream_id text not null unique,
  name text,
  stream_icon text,
  rating text,
  added text,
  category_id text,
  container_extension text,
  custom_sid text,
  direct_source text,
  num int,
  raw jsonb
);
create index vod_streams_category on public.vod_streams(category_id);

create table public.vod_info (
  vod_id text primary key,
  info jsonb,
  movie_data jsonb,
  fetched_at timestamptz not null default now()
);

-- Series
create table public.series (
  id bigserial primary key,
  upstream_id text not null unique,
  name text,
  cover text,
  plot text,
  cast_text text,
  director text,
  genre text,
  release_date text,
  last_modified text,
  rating text,
  category_id text,
  num int,
  raw jsonb
);
create index series_category on public.series(category_id);

create table public.series_info (
  series_id text primary key,
  info jsonb,
  seasons jsonb,
  episodes jsonb,
  fetched_at timestamptz not null default now()
);

-- Sync runs log
create table public.sync_runs (
  id bigserial primary key,
  type text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  message text,
  items_processed int default 0
);
create index sync_runs_started on public.sync_runs(started_at desc);

-- Single-admin enforcement: prevent any new auth user once one exists
create or replace function public.enforce_single_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from auth.users) >= 1 then
    raise exception 'Signup disabled: this is a single-admin instance';
  end if;
  return new;
end;
$$;

create trigger enforce_single_admin_trigger
  before insert on auth.users
  for each row execute function public.enforce_single_admin();

-- Enable RLS
alter table public.app_settings enable row level security;
alter table public.categories enable row level security;
alter table public.live_streams enable row level security;
alter table public.vod_streams enable row level security;
alter table public.vod_info enable row level security;
alter table public.series enable row level security;
alter table public.series_info enable row level security;
alter table public.sync_runs enable row level security;

-- Policies: any authenticated user is the admin
create policy "auth read settings" on public.app_settings for select to authenticated using (true);
create policy "auth update settings" on public.app_settings for update to authenticated using (true) with check (true);

create policy "auth all categories" on public.categories for all to authenticated using (true) with check (true);
create policy "auth all live" on public.live_streams for all to authenticated using (true) with check (true);
create policy "auth all vod" on public.vod_streams for all to authenticated using (true) with check (true);
create policy "auth all vod_info" on public.vod_info for all to authenticated using (true) with check (true);
create policy "auth all series" on public.series for all to authenticated using (true) with check (true);
create policy "auth all series_info" on public.series_info for all to authenticated using (true) with check (true);
create policy "auth all sync_runs" on public.sync_runs for all to authenticated using (true) with check (true);
