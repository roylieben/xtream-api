// Sync logic - runs on server, uses admin client (bypasses RLS).
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { xtream, type XtreamCreds } from "./xtream-client.server";

export async function getSettingsRow() {
  const { data, error } = await supabaseAdmin.from("app_settings").select("*").limit(1).single();
  if (error) throw new Error(error.message);
  return data;
}

export function credsFromSettings(s: { xtream_host?: string | null; xtream_username?: string | null; xtream_password?: string | null }): XtreamCreds {
  return { host: s.xtream_host ?? "", username: s.xtream_username ?? "", password: s.xtream_password ?? "" };
}

async function checkCancelled(id?: number) {
  if (!id) return;
  const { data } = await supabaseAdmin.from("sync_runs").select("status").eq("id", id).single();
  if (data?.status !== "running") {
    throw new Error("Sync was cancelled");
  }
}

async function logRun(type: string, fn: (id?: number) => Promise<{ items: number; message?: string }>) {
  // Cancel any existing running syncs of this type
  await supabaseAdmin
    .from("sync_runs")
    .update({ status: "error", message: "Cancelled by newer run", finished_at: new Date().toISOString() })
    .eq("type", type)
    .eq("status", "running");

  const { data: run } = await supabaseAdmin
    .from("sync_runs")
    .insert({ type, status: "running" })
    .select("id")
    .single();
  const id = run?.id;
  try {
    const { items, message } = await fn(id);
    if (id)
      await supabaseAdmin
        .from("sync_runs")
        .update({ status: "success", finished_at: new Date().toISOString(), items_processed: items, message: message ?? null })
        .eq("id", id);
    return { ok: true, items, message };
  } catch (e: any) {
    if (id) {
      // Check if it was already cancelled so we don't overwrite the cancelled message
      const { data: current } = await supabaseAdmin.from("sync_runs").select("status, message").eq("id", id).single();
      if (current?.status === "running") {
        await supabaseAdmin
          .from("sync_runs")
          .update({ status: "error", finished_at: new Date().toISOString(), message: e?.message ?? String(e) })
          .eq("id", id);
      }
    }
    throw e;
  }
}

async function upsertCategories(type: "live" | "vod" | "series", list: any[]) {
  if (!list?.length) return 0;
  const rows = list.map((c) => ({
    upstream_id: String(c.category_id),
    type,
    name: String(c.category_name ?? ""),
    parent_id: c.parent_id != null ? String(c.parent_id) : null,
  }));
  // upsert preserving existing `enabled`
  const { error } = await supabaseAdmin
    .from("categories")
    .upsert(rows, { onConflict: "type,upstream_id", ignoreDuplicates: false });
  if (error) throw new Error(`categories upsert: ${error.message}`);
  return rows.length;
}

function chunks<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export async function syncLive() {
  return logRun("live", async () => {
    const s = await getSettingsRow();
    const c = credsFromSettings(s);
    const cats = await xtream.liveCategories(c);
    await upsertCategories("live", cats);
    const list = await xtream.liveStreams(c);
    const rows = list.map((it: any) => ({
      upstream_id: String(it.stream_id),
      name: it.name ?? null,
      stream_icon: it.stream_icon ?? null,
      epg_channel_id: it.epg_channel_id ?? null,
      added: it.added ?? null,
      category_id: it.category_id != null ? String(it.category_id) : null,
      custom_sid: it.custom_sid ?? null,
      tv_archive: it.tv_archive ?? null,
      direct_source: it.direct_source ?? null,
      tv_archive_duration: it.tv_archive_duration ?? null,
      num: it.num ?? null,
      raw: it,
    }));
    for (const part of chunks(rows, 500)) {
      const { error } = await supabaseAdmin.from("live_streams").upsert(part, { onConflict: "upstream_id" });
      if (error) throw new Error(`live_streams upsert: ${error.message}`);
    }
    await supabaseAdmin
      .from("app_settings")
      .update({ last_sync_live_at: new Date().toISOString() })
      .eq("id", s.id);
    return { items: rows.length, message: `${cats.length} categories, ${rows.length} streams` };
  });
}

export async function syncVod(opts: { withInfo?: boolean } = {}) {
  return logRun("vod", async () => {
    const s = await getSettingsRow();
    const c = credsFromSettings(s);
    const cats = await xtream.vodCategories(c);
    await upsertCategories("vod", cats);
    const list = await xtream.vodStreams(c);
    const rows = list.map((it: any) => ({
      upstream_id: String(it.stream_id),
      name: it.name ?? null,
      stream_icon: it.stream_icon ?? null,
      rating: it.rating != null ? String(it.rating) : null,
      added: it.added ?? null,
      category_id: it.category_id != null ? String(it.category_id) : null,
      container_extension: it.container_extension ?? null,
      custom_sid: it.custom_sid ?? null,
      direct_source: it.direct_source ?? null,
      num: it.num ?? null,
      raw: it,
    }));
    for (const part of chunks(rows, 500)) {
      const { error } = await supabaseAdmin.from("vod_streams").upsert(part, { onConflict: "upstream_id" });
      if (error) throw new Error(`vod_streams upsert: ${error.message}`);
    }
    let infoCount = 0;
    if (opts.withInfo) {
      // fetch missing vod_info, batched with concurrency
      const ids = rows.map((r) => r.upstream_id);
      const { data: existing } = await supabaseAdmin.from("vod_info").select("vod_id").in("vod_id", ids);
      const have = new Set((existing ?? []).map((r: any) => r.vod_id));
      const missing = ids.filter((id) => !have.has(id));
      const conc = 5;
      for (let i = 0; i < missing.length; i += conc) {
        const batch = missing.slice(i, i + conc);
        const results = await Promise.allSettled(batch.map((id) => xtream.vodInfo(c, id)));
        const upserts = results
          .map((r, idx) => (r.status === "fulfilled" ? { vod_id: batch[idx], info: r.value?.info ?? null, movie_data: r.value?.movie_data ?? null } : null))
          .filter(Boolean) as any[];
        if (upserts.length) {
          await supabaseAdmin.from("vod_info").upsert(upserts, { onConflict: "vod_id" });
          infoCount += upserts.length;
        }
      }
    }
    await supabaseAdmin
      .from("app_settings")
      .update({ last_sync_vod_at: new Date().toISOString() })
      .eq("id", s.id);
    return { items: rows.length, message: `${cats.length} categories, ${rows.length} VOD${opts.withInfo ? `, ${infoCount} info fetched` : ""}` };
  });
}

export async function syncSeries(opts: { withInfo?: boolean } = {}) {
  return logRun("series", async () => {
    const s = await getSettingsRow();
    const c = credsFromSettings(s);
    const cats = await xtream.seriesCategories(c);
    await upsertCategories("series", cats);
    const list = await xtream.series(c);
    const rows = list.map((it: any) => ({
      upstream_id: String(it.series_id),
      name: it.name ?? null,
      cover: it.cover ?? null,
      plot: it.plot ?? null,
      cast_text: it.cast ?? null,
      director: it.director ?? null,
      genre: it.genre ?? null,
      release_date: it.releaseDate ?? it.release_date ?? null,
      last_modified: it.last_modified ?? null,
      rating: it.rating != null ? String(it.rating) : null,
      category_id: it.category_id != null ? String(it.category_id) : null,
      num: it.num ?? null,
      raw: it,
    }));
    for (const part of chunks(rows, 500)) {
      const { error } = await supabaseAdmin.from("series").upsert(part, { onConflict: "upstream_id" });
      if (error) throw new Error(`series upsert: ${error.message}`);
    }
    let infoCount = 0;
    if (opts.withInfo) {
      const ids = rows.map((r) => r.upstream_id);
      const { data: existing } = await supabaseAdmin.from("series_info").select("series_id").in("series_id", ids);
      const have = new Set((existing ?? []).map((r: any) => r.series_id));
      const missing = ids.filter((id) => !have.has(id));
      const conc = 4;
      for (let i = 0; i < missing.length; i += conc) {
        const batch = missing.slice(i, i + conc);
        const results = await Promise.allSettled(batch.map((id) => xtream.seriesInfo(c, id)));
        const upserts = results
          .map((r, idx) =>
            r.status === "fulfilled"
              ? {
                  series_id: batch[idx],
                  info: r.value?.info ?? null,
                  seasons: r.value?.seasons ?? null,
                  episodes: r.value?.episodes ?? null,
                }
              : null,
          )
          .filter(Boolean) as any[];
        if (upserts.length) {
          await supabaseAdmin.from("series_info").upsert(upserts, { onConflict: "series_id" });
          infoCount += upserts.length;
        }
      }
    }
    await supabaseAdmin
      .from("app_settings")
      .update({ last_sync_series_at: new Date().toISOString() })
      .eq("id", s.id);
    return { items: rows.length, message: `${cats.length} categories, ${rows.length} series${opts.withInfo ? `, ${infoCount} info fetched` : ""}` };
  });
}

// Lazy scheduler: triggers due syncs in background, never blocks.
export function maybeRunDueSyncs(): void {
  (async () => {
    try {
      const s = await getSettingsRow();
      if (!s.xtream_host || !s.xtream_username) return;
      const now = Date.now();
      const due = (last: string | null | undefined, mins: number | null | undefined) =>
        !last || now - new Date(last).getTime() >= (mins ?? 0) * 60_000;
      if (due(s.last_sync_live_at, s.sync_interval_live_minutes)) syncLive().catch(() => {});
      if (due(s.last_sync_vod_at, s.sync_interval_vod_minutes)) syncVod({ withInfo: true }).catch(() => {});
      if (due(s.last_sync_series_at, s.sync_interval_series_minutes)) syncSeries({ withInfo: true }).catch(() => {});
    } catch {
      /* swallow */
    }
  })();
}
