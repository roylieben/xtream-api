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

export const getPublicSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin.from("app_settings").select("disable_signup").limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    return { disable_signup: data?.disable_signup ?? false };
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
  disable_signup: z.boolean().default(false),
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

const upstreamSchema = z.object({
  xtream_host: z.string().trim().min(1).max(500),
  xtream_username: z.string().trim().min(1).max(200),
  xtream_password: z.string().min(1).max(200),
});

const proxySchema = z.object({
  proxy_username: z.string().trim().min(1).max(100),
  proxy_password: z.string().min(1).max(200),
});

const intervalsSchema = z.object({
  sync_interval_live_minutes: z.number().int().min(5).max(10080),
  sync_interval_vod_minutes: z.number().int().min(5).max(10080),
  sync_interval_series_minutes: z.number().int().min(5).max(10080),
  sync_auto_live: z.boolean(),
  sync_auto_vod: z.boolean(),
  sync_auto_series: z.boolean(),
});

const securitySchema = z.object({
  disable_signup: z.boolean(),
});

async function patchSettings(patch: Record<string, unknown>) {
  const { data: row } = await supabaseAdmin.from("app_settings").select("id").limit(1).single();
  if (!row) throw new Error("Settings row missing");
  const { error } = await supabaseAdmin
    .from("app_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", row.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export const updateProxy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => proxySchema.parse(d))
  .handler(async ({ data }) => patchSettings(data));

export const updateSyncIntervals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => intervalsSchema.parse(d))
  .handler(async ({ data }) => patchSettings(data));

export const updateSecurity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => securitySchema.parse(d))
  .handler(async ({ data }) => patchSettings(data));

export const testConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    // Allow empty payload → fall back to saved settings
    if (!d || (typeof d === "object" && Object.keys(d as object).length === 0)) return null;
    return upstreamSchema.parse(d);
  })
  .handler(async ({ data }) => {
    let creds = data;
    if (!creds) {
      const { data: s } = await supabaseAdmin.from("app_settings").select("*").limit(1).single();
      if (!s?.xtream_host) return { ok: false, error: "Configure XTream host first" };
      creds = {
        xtream_host: s.xtream_host,
        xtream_username: s.xtream_username ?? "",
        xtream_password: s.xtream_password ?? "",
      };
    }
    try {
      const info = await xtream.accountInfo({
        host: creds.xtream_host,
        username: creds.xtream_username,
        password: creds.xtream_password,
      });
      return { ok: true, info };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? String(e) };
    }
  });

export const updateUpstream = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upstreamSchema.parse(d))
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

export const runSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ type: z.enum(["live", "vod", "series"]), withInfo: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    if (data.type === "live") return syncLive();
    // VOD/Series info entries are large and rate-limited upstream; fetch them
    // on-demand from the player_api endpoints instead of during the catalog sync.
    if (data.type === "vod") return syncVod({ withInfo: data.withInfo ?? false });
    return syncSeries({ withInfo: data.withInfo ?? false });
  });

export const cancelSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.number().int().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("sync_runs")
      .update({ status: "error", message: "Cancelled by user", finished_at: new Date().toISOString() })
      .eq("status", "running");
      
    if (data.id) {
      q = q.eq("id", data.id);
    }
    
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const CUSTOM_CAT_PREFIX = "custom_";

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

    const table = data.type === "live" ? "live_streams" : data.type === "vod" ? "vod_streams" : "series";
    const counts: Record<string, number> = {};

    // Fetch all category_ids handling Supabase 1000 row limit
    let hasMore = true;
    let from = 0;
    const limit = 1000;
    while (hasMore) {
      const { data: streams, error: streamsErr } = await supabaseAdmin
        .from(table)
        .select("category_id")
        .range(from, from + limit - 1);

      if (streamsErr || !streams || streams.length === 0) {
        hasMore = false;
      } else {
        for (const s of streams) {
          if (s.category_id) {
            counts[s.category_id] = (counts[s.category_id] || 0) + 1;
          }
        }
        if (streams.length < limit) {
          hasMore = false;
        } else {
          from += limit;
        }
      }
    }

    const mapped = (rows ?? []).map(r => ({
      ...r,
      stream_count: counts[r.upstream_id] || 0,
      is_custom: false,
    }));

    if (data.type !== "live") return mapped;

    // Append custom categories (live only)
    const { data: customCats } = await supabaseAdmin
      .from("custom_categories")
      .select("id, name, enabled")
      .order("name", { ascending: true });
    const { data: customLinks } = await supabaseAdmin
      .from("custom_category_streams")
      .select("custom_category_id");
    const customCounts: Record<number, number> = {};
    for (const l of customLinks ?? []) {
      customCounts[l.custom_category_id] = (customCounts[l.custom_category_id] ?? 0) + 1;
    }
    const customMapped = (customCats ?? []).map((c: any) => ({
      id: c.id,
      upstream_id: `${CUSTOM_CAT_PREFIX}${c.id}`,
      name: c.name,
      type: "live",
      enabled: c.enabled,
      parent_id: null,
      stream_count: customCounts[c.id] ?? 0,
      is_custom: true,
    }));

    return [...mapped, ...customMapped];
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
    const counts = async (table: "live_streams" | "vod_streams" | "series" | "categories") => {
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

export const getRecentlyAdded = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        type: z.enum(["live", "vod", "series"]),
        limit: z.number().int().min(1).optional(),
        enabledOnly: z.boolean().optional(),
        search: z.string().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const table = (data.type === "live" ? "live_streams" : data.type === "vod" ? "vod_streams" : "series") as
      | "live_streams"
      | "vod_streams"
      | "series";
    const limit = data.limit;
    const iconCol = data.type === "series" ? "cover" : "stream_icon";

    let catQ = supabaseAdmin.from("categories").select("upstream_id,name,enabled").eq("type", data.type);
    if (data.enabledOnly) catQ = catQ.eq("enabled", true);
    if (data.search && data.search.trim()) catQ = catQ.ilike("name", `%${data.search.trim()}%`);
    const { data: cats, error: catErr } = await catQ;
    if (catErr) throw new Error(catErr.message);
    const catList = cats ?? [];
    const filtering = !!data.enabledOnly || !!(data.search && data.search.trim());
    if (filtering && catList.length === 0) return [];

    let q = supabaseAdmin
      .from(table)
      .select(`id, upstream_id, name, category_id, ${iconCol}, created_at`)
      .order("created_at", { ascending: false });
    if (limit !== undefined) q = q.limit(limit);

    if (filtering) {
      q = q.in("category_id", catList.map((c: any) => c.upstream_id));
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const catMap = new Map(catList.map((c: any) => [c.upstream_id, c]));
    return (rows ?? []).map((r: any) => {
      const c = catMap.get(r.category_id) as any;
      return { ...r, stream_icon: r.stream_icon ?? r.cover ?? null, category_name: c?.name ?? r.category_id, category_enabled: c?.enabled ?? false };
    });
  });

export const getMonthlyAdditions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const now = new Date();
    const months: { label: string; year: number; month: number; start: string; end: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
      months.push({
        label: d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
        year: d.getUTCFullYear(),
        month: d.getUTCMonth(),
        start: d.toISOString(),
        end: next.toISOString(),
      });
    }
    const tables = ["live_streams", "vod_streams", "series"] as const;
    const results = await Promise.all(
      months.flatMap((m) =>
        tables.map(async (t) => {
          const { count } = await supabaseAdmin
            .from(t)
            .select("*", { count: "exact", head: true })
            .gte("created_at", m.start)
            .lt("created_at", m.end);
          return { table: t, label: m.label, count: count ?? 0 };
        }),
      ),
    );
    return months.map((m) => ({
      label: m.label,
      live: results.find((r) => r.label === m.label && r.table === "live_streams")?.count ?? 0,
      vod: results.find((r) => r.label === m.label && r.table === "vod_streams")?.count ?? 0,
      series: results.find((r) => r.label === m.label && r.table === "series")?.count ?? 0,
    }));
  });




export const getContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        type: z.enum(["live", "vod", "series"]),
        search: z.string().max(200).optional(),
        categoryId: z.string().optional(),
        page: z.number().int().min(1).max(10000).optional(),
        pageSize: z.number().int().min(1).max(5000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const table = (data.type === "live" ? "live_streams" : data.type === "vod" ? "vod_streams" : "series") as
      | "live_streams"
      | "vod_streams"
      | "series";
    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 50;

    let q = supabaseAdmin
      .from(table)
      .select("*", { count: "exact" })
      .range((page - 1) * pageSize, page * pageSize - 1);

    // Custom-category filter (live only): resolve linked stream upstream IDs.
    if (data.type === "live" && data.categoryId && data.categoryId.startsWith(CUSTOM_CAT_PREFIX)) {
      const customId = Number(data.categoryId.slice(CUSTOM_CAT_PREFIX.length));
      if (Number.isFinite(customId)) {
        const { data: links } = await supabaseAdmin
          .from("custom_category_streams")
          .select("stream_upstream_id")
          .eq("custom_category_id", customId);
        const ids = (links ?? []).map((l: any) => l.stream_upstream_id);
        if (ids.length === 0) {
          return { rows: [], total: 0, page, pageSize };
        }
        q = q.in("upstream_id", ids);
      }
    } else if (data.categoryId && data.categoryId !== "all") {
      q = q.eq("category_id", data.categoryId);
    }

    if (data.search) {
      const { data: matchCats } = await supabaseAdmin
        .from("categories")
        .select("upstream_id")
        .eq("type", data.type)
        .ilike("name", `%${data.search}%`);
      const matchCatIds = (matchCats ?? []).map((c: any) => c.upstream_id);
      const escaped = data.search.replace(/[,()]/g, " ");
      const orParts = [`name.ilike.%${escaped}%`];
      if (matchCatIds.length > 0) {
        orParts.push(`category_id.in.(${matchCatIds.map((id) => `"${id}"`).join(",")})`);
      }
      q = q.or(orParts.join(","));
    }

    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);

    // Sort by upstream "num" (channel order from XTream), falling back to name.
    const sorted = [...(rows ?? [])].sort((a: any, b: any) => {
      const na = parseInt(a.num ?? "", 10);
      const nb = parseInt(b.num ?? "", 10);
      const aHas = Number.isFinite(na);
      const bHas = Number.isFinite(nb);
      if (aHas && bHas && na !== nb) return na - nb;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return String(a.name ?? "").localeCompare(String(b.name ?? ""));
    });

    const catIds = [...new Set(sorted.map((r: any) => r.category_id).filter((id: any): id is string => typeof id === "string" && id.length > 0))];
    const { data: cats } = await supabaseAdmin
      .from("categories")
      .select("upstream_id,name")
      .eq("type", data.type)
      .in("upstream_id", catIds);

    const catMap = new Map((cats ?? []).map((c: any) => [c.upstream_id, c.name]));

    const mappedRows = sorted.map((r: any) => ({
      ...r,
      category_name: catMap.get(r.category_id) ?? r.category_id,
    }));

    return { rows: mappedRows, total: count ?? 0, page, pageSize };
  });

export const getCustomCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("custom_categories")
      .select("id, name, enabled")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createCustomCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("custom_categories")
      .insert({ name: data.name })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row?.id };
  });

export const deleteCustomCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.number().int() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("custom_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setCustomCategoryEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.number().int(), enabled: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("custom_categories")
      .update({ enabled: data.enabled })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const renameCustomCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.number().int(), name: z.string().trim().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("custom_categories")
      .update({ name: data.name })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addStreamsToCustomCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ categoryId: z.number().int(), streamIds: z.array(z.string()) }).parse(d),
  )
  .handler(async ({ data }) => {
    const rows = data.streamIds.map((id) => ({
      custom_category_id: data.categoryId,
      stream_upstream_id: id,
    }));
    const { error } = await supabaseAdmin
      .from("custom_category_streams")
      .upsert(rows, { onConflict: "custom_category_id,stream_upstream_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeStreamFromCustomCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ categoryId: z.number().int(), streamId: z.string() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("custom_category_streams")
      .delete()
      .eq("custom_category_id", data.categoryId)
      .eq("stream_upstream_id", data.streamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getCustomCategoryStreams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ categoryId: z.number().int() }).parse(d))
  .handler(async ({ data }) => {
    const { data: relations, error: relError } = await supabaseAdmin
      .from("custom_category_streams")
      .select("stream_upstream_id")
      .eq("custom_category_id", data.categoryId);
    if (relError) throw new Error(relError.message);
    
    if (!relations || relations.length === 0) return [];
    
    const streamIds = relations.map((r: any) => r.stream_upstream_id);
    const { data: streams, error: streamsError } = await supabaseAdmin
      .from("live_streams")
      .select("id, upstream_id, name, stream_icon, category_id, num")
      .in("upstream_id", streamIds);

    if (streamsError) throw new Error(streamsError.message);

    const catIds = [...new Set((streams ?? []).map((s: any) => s.category_id).filter((id: any) => typeof id === "string" && id.length > 0))];
    const { data: cats } = await supabaseAdmin
      .from("categories")
      .select("upstream_id,name")
      .eq("type", "live")
      .in("upstream_id", catIds);
    const catMap = new Map((cats ?? []).map((c: any) => [c.upstream_id, c.name]));

    const sorted = [...(streams ?? [])].sort((a: any, b: any) => {
      const na = parseInt(a.num ?? "", 10);
      const nb = parseInt(b.num ?? "", 10);
      const aHas = Number.isFinite(na);
      const bHas = Number.isFinite(nb);
      if (aHas && bHas && na !== nb) return na - nb;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return String(a.name ?? "").localeCompare(String(b.name ?? ""));
    });

    return sorted.map((s: any) => ({
      ...s,
      category_name: catMap.get(s.category_id) ?? s.category_id,
    }));
  });

// ============= User management =============

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw new Error(error.message);
    return (data.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      email_confirmed_at: u.email_confirmed_at ?? null,
    }));
  });

export const updateUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), password: z.string().min(6).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateUserEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), email: z.string().email().max(255) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      email: data.email,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().email().max(255), password: z.string().min(6).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) {
      throw new Error("You cannot delete the currently signed-in account.");
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getCurrentUserId = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return { userId: context.userId as string };
  });
