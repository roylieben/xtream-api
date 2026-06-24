ALTER TABLE public.app_settings
  ALTER COLUMN sync_auto_live SET DEFAULT false,
  ALTER COLUMN sync_auto_vod SET DEFAULT false,
  ALTER COLUMN sync_auto_series SET DEFAULT false;