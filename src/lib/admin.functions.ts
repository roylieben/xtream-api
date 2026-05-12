import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { xtream } from "./xtream-client.server";
import { syncLive, syncVod, syncSeries } from "./sync.server";

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin.from("app_settings").select("*").limit(1).single();
    if (error) throw new Error(error.message);
    return data;
  });

const settingsSchema = z.object({
  xtream_host: z.string().max(500),
  xtream_username: z.string().max(200),
  xtream_password: z.string().max(200),
  proxy_username: z.string().min(1).max(100),
  proxy_password: z.string().min(1).max(200),
  sync_interval_live_minutes: z.number().int().min(5).max(10080),
  sync_interval_vod_minutes: z.number().int().min(5).max(10080),
  sync_interval_series_minutes: z.number().int().min(5).max(10080),
});

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settingsSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin.from("app_settings").select("id").limit(1).single();
    if (!row) throw new Error("Settings row missing");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data: s } = await supabaseAdmin.from("app_settings").select("*").limit(1).single();
    if (!s?.xtream_host) throw new Error("Configure XTream host first");
    try {
      const info = await xtream.accountInfo({
        host: s.xtream_host,
        username: s.xtream_username,
        password: s.xtream_password,
      });
      return { ok: true, info };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? String(e) };
    }
  });

export const runSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ type: z.enum(["live", "vod", "series"]), withInfo: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    if (data.type === "live") return syncLive();
    if (data.type === "vod") return syncVod({ withInfo: data.withInfo ?? true });
    return syncSeries({ withInfo: data.withInfo ?? true });
  });

export const getCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ type: z.enum(["live", "vod", "series"]) }).parse(d))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("categories")
      .select("*")
      .eq("type", data.type)
      .order("name", { ascending: true })
      .limit(5000);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const setCategoryEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.number().int(), enabled: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("categories")
      .update({ enabled: data.enabled })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bulkSetCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ type: z.enum(["live", "vod", "series"]), enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("categories")
      .update({ enabled: data.enabled })
      .eq("type", data.type);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const counts = async (table: string) => {
      const { count } = await supabaseAdmin.from(table).select("*", { count: "exact", head: true });
      return count ?? 0;
    };
    const [live, vod, series, cats, runsRes, settings] = await Promise.all([
      counts("live_streams"),
      counts("vod_streams"),
      counts("series"),
      counts("categories"),
      supabaseAdmin.from("sync_runs").select("*").order("started_at", { ascending: false }).limit(15),
      supabaseAdmin.from("app_settings").select("*").limit(1).single(),
    ]);
    return {
      counts: { live, vod, series, categories: cats },
      runs: runsRes.data ?? [],
      settings: settings.data,
    };
  });

export const getContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        type: z.enum(["live", "vod", "series"]),
        search: z.string().max(200).optional(),
        page: z.number().int().min(1).max(10000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const table = data.type === "live" ? "live_streams" : data.type === "vod" ? "vod_streams" : "series";
    const page = data.page ?? 1;
    const pageSize = 50;
    let q = supabaseAdmin
      .from(table)
      .select("id,upstream_id,name,category_id", { count: "exact" })
      .order("name", { ascending: true })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page, pageSize };
  });
