// Shared helpers for public XTream proxy routes
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { xtream } from "@/lib/xtream-client.server";

export async function authProxy(url: URL): Promise<{ ok: true; settings: any } | { ok: false; res: Response }> {
  const u = url.searchParams.get("username");
  const p = url.searchParams.get("password");
  const { data: s } = await supabaseAdmin.from("app_settings").select("*").limit(1).single();
  if (!s || !u || !p || u !== s.proxy_username || p !== s.proxy_password) {
    return { ok: false, res: new Response("Unauthorized", { status: 401 }) };
  }
  return { ok: true, settings: s };
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

export async function fetchAll(table: any, select: string = "*"): Promise<any[]> {
  let all: any[] = [];
  let from = 0;
  const limit = 1000;
  while (true) {
    const { data } = await supabaseAdmin.from(table).select(select).range(from, from + limit - 1);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < limit) break;
    from += limit;
  }
  return all;
}

export async function getEnabledCategoryIds(type: "live" | "vod" | "series"): Promise<Set<string>> {
  const data = await fetchAll("categories", "upstream_id,enabled,type");
  return new Set(data.filter((c: any) => c.type === type && c.enabled).map((c: any) => c.upstream_id));
}

export async function getEnabledLiveStreamIds(): Promise<Set<string>> {
  // Get all enabled categories for live streams
  const cats = await fetchAll("categories", "upstream_id,type,enabled");
  const enabledCatIds = new Set(cats.filter((c: any) => c.type === "live" && c.enabled).map((c: any) => c.upstream_id));

  // Get all live streams
  const streams = await fetchAll("live_streams", "upstream_id,category_id");
    
  return new Set(
    streams
      .filter((s: any) => enabledCatIds.has(String(s.category_id)))
      .map((s: any) => String(s.upstream_id))
  );
}

export function rewriteUrls<T extends Record<string, any>>(rows: T[]): T[] {
  return rows; // we don't rewrite stream URLs in metadata; players construct them with our proxy creds
}

export { xtream };
