import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authProxy, getEnabledCategoryIds, jsonResponse, fetchAll, getEnabledCustomCategoryMap, xtream } from "@/lib/proxy-helpers.server";
import { maybeRunDueSyncs, credsFromSettings } from "@/lib/sync.server";

// Custom categories are exposed with a "custom_<id>" category_id to avoid
// colliding with upstream numeric category IDs.
const CUSTOM_CAT_PREFIX = "custom_";

async function buildAccountInfo(s: any) {
  return {
    user_info: {
      username: s.proxy_username,
      password: s.proxy_password,
      message: "",
      auth: 1,
      status: "Active",
      exp_date: null,
      is_trial: "0",
      active_cons: "0",
      created_at: Math.floor(new Date(s.updated_at).getTime() / 1000),
      max_connections: "1",
      allowed_output_formats: ["m3u8", "ts", "rtmp"],
    },
    server_info: {
      url: "",
      port: "80",
      https_port: "443",
      server_protocol: "http",
      rtmp_port: "0",
      timezone: "UTC",
      timestamp_now: Math.floor(Date.now() / 1000),
      time_now: new Date().toISOString(),
    },
  };
}

async function listCategories(type: "live" | "vod" | "series") {
  const data = await fetchAll("categories", "upstream_id,name,parent_id,enabled,type");
  const upstream = data
    .filter((c: any) => c.type === type && c.enabled)
    .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
    .map((c: any) => ({
      category_id: c.upstream_id,
      category_name: c.name,
      parent_id: c.parent_id ?? 0,
    }));

  if (type !== "live") return upstream;

  const customs = await fetchAll("custom_categories", "id,name,enabled");
  const customEntries = customs
    .filter((c: any) => c.enabled)
    .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
    .map((c: any) => ({
      category_id: `${CUSTOM_CAT_PREFIX}${c.id}`,
      category_name: c.name,
      parent_id: 0,
    }));

  return [...upstream, ...customEntries];
}

async function listLive() {
  const enabled = await getEnabledCategoryIds("live");
  const customMap = await getEnabledCustomCategoryMap();
  const data = await fetchAll("live_streams", "*");

  // Build reverse index: stream_upstream_id -> custom category ids it belongs to.
  const streamToCustom = new Map<string, string[]>();
  for (const [cid, streamSet] of customMap.entries()) {
    const catKey = `${CUSTOM_CAT_PREFIX}${cid}`;
    for (const sid of streamSet) {
      const arr = streamToCustom.get(sid) ?? [];
      arr.push(catKey);
      streamToCustom.set(sid, arr);
    }
  }

  return data
    .filter((r: any) => {
      const upstreamOk = r.category_id && enabled.has(String(r.category_id));
      const customOk = streamToCustom.has(String(r.upstream_id));
      return upstreamOk || customOk;
    })
    .map((r: any) => {
      const sid = String(r.upstream_id);
      const customCats = streamToCustom.get(sid) ?? [];
      const upstreamCatOk = r.category_id && enabled.has(String(r.category_id));
      const primaryCat = upstreamCatOk ? String(r.category_id) : customCats[0];
      const allCats = [
        ...(upstreamCatOk ? [String(r.category_id)] : []),
        ...customCats,
      ];
      return {
        ...(r.raw ?? {}),
        stream_id: Number(r.upstream_id) || r.upstream_id,
        category_id: primaryCat,
        category_ids: allCats,
      };
    });
}

async function listVod() {
  const enabled = await getEnabledCategoryIds("vod");
  const data = await fetchAll("vod_streams", "*");
  return data
    .filter((r: any) => r.category_id && enabled.has(String(r.category_id)))
    .map((r: any) => ({ ...(r.raw ?? {}), stream_id: Number(r.upstream_id) || r.upstream_id }));
}

async function listSeries() {
  const enabled = await getEnabledCategoryIds("series");
  const data = await fetchAll("series", "*");
  return data
    .filter((r: any) => r.category_id && enabled.has(String(r.category_id)))
    .map((r: any) => ({ ...(r.raw ?? {}), series_id: Number(r.upstream_id) || r.upstream_id }));
}

async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const auth = await authProxy(url);
  if (!auth.ok) return auth.res;
  const s = auth.settings;
  maybeRunDueSyncs();

  const action = url.searchParams.get("action") ?? "";

  switch (action) {
    case "":
    case "get_account_info":
      return jsonResponse(await buildAccountInfo(s));
    case "get_live_categories":
      return jsonResponse(await listCategories("live"));
    case "get_vod_categories":
      return jsonResponse(await listCategories("vod"));
    case "get_series_categories":
      return jsonResponse(await listCategories("series"));
    case "get_live_streams":
      return jsonResponse(await listLive());
    case "get_vod_streams":
      return jsonResponse(await listVod());
    case "get_series":
      return jsonResponse(await listSeries());
    case "get_vod_info": {
      const id = url.searchParams.get("vod_id");
      if (!id) return jsonResponse({}, 400);
      const { data } = await supabaseAdmin
        .from("vod_info")
        .select("info,movie_data")
        .eq("vod_id", id)
        .maybeSingle();
      return jsonResponse(data ?? {});
    }
    case "get_series_info": {
      const id = url.searchParams.get("series_id");
      if (!id) return jsonResponse({}, 400);
      const { data } = await supabaseAdmin
        .from("series_info")
        .select("info,seasons,episodes")
        .eq("series_id", id)
        .maybeSingle();
      return jsonResponse(data ?? {});
    }
    case "get_short_epg":
    case "get_simple_data_table": {
      const u = new URL(s.xtream_host.replace(/\/$/, "") + "/player_api.php");
      url.searchParams.forEach((v, k) => u.searchParams.set(k, v));
      u.searchParams.set("username", s.xtream_username);
      u.searchParams.set("password", s.xtream_password);
      const upstream = await fetch(u.toString());
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    default:
      return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  }
}

export const Route = createFileRoute("/api/public/player_api.php")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
