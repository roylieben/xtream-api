import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authProxy, getEnabledCategoryIds, jsonResponse, fetchAll } from "@/lib/proxy-helpers.server";
import { maybeRunDueSyncs } from "@/lib/sync.server";

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
  const { data } = await supabaseAdmin
    .from("categories")
    .select("upstream_id,name,parent_id,enabled")
    .eq("type", type)
    .eq("enabled", true)
    .order("name");
  return (data ?? []).map((c: any) => ({
    category_id: c.upstream_id,
    category_name: c.name,
    parent_id: c.parent_id ?? 0,
  }));
}

async function listLive() {
  const enabled = await getEnabledCategoryIds("live");
  const { data } = await supabaseAdmin.from("live_streams").select("*").limit(50000);
  return (data ?? [])
    .filter((r: any) => r.category_id && enabled.has(String(r.category_id)))
    .map((r: any) => ({ ...(r.raw ?? {}), stream_id: Number(r.upstream_id) || r.upstream_id }));
}

async function listVod() {
  const enabled = await getEnabledCategoryIds("vod");
  const { data } = await supabaseAdmin.from("vod_streams").select("*").limit(50000);
  return (data ?? [])
    .filter((r: any) => r.category_id && enabled.has(String(r.category_id)))
    .map((r: any) => ({ ...(r.raw ?? {}), stream_id: Number(r.upstream_id) || r.upstream_id }));
}

async function listSeries() {
  const enabled = await getEnabledCategoryIds("series");
  const { data } = await supabaseAdmin.from("series").select("*").limit(50000);
  return (data ?? [])
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
