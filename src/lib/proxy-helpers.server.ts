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

// Stream upstream IDs that are linked to at least one enabled custom category.
export async function getCustomCategoryLinkedStreamIds(): Promise<Set<string>> {
  const cats = await fetchAll("custom_categories", "id,enabled");
  const enabledIds = new Set(cats.filter((c: any) => c.enabled).map((c: any) => c.id));
  if (enabledIds.size === 0) return new Set();
  const links = await fetchAll("custom_category_streams", "custom_category_id,stream_upstream_id");
  return new Set(
    links
      .filter((l: any) => enabledIds.has(l.custom_category_id))
      .map((l: any) => String(l.stream_upstream_id)),
  );
}

// Map of enabled custom_category_id -> Set<stream_upstream_id>
export async function getEnabledCustomCategoryMap(): Promise<Map<number, Set<string>>> {
  const cats = await fetchAll("custom_categories", "id,name,enabled");
  const enabled = cats.filter((c: any) => c.enabled);
  const map = new Map<number, Set<string>>();
  for (const c of enabled) map.set(c.id, new Set());
  if (enabled.length === 0) return map;
  const links = await fetchAll("custom_category_streams", "custom_category_id,stream_upstream_id");
  for (const l of links) {
    const set = map.get(l.custom_category_id);
    if (set) set.add(String(l.stream_upstream_id));
  }
  return map;
}

export async function getEnabledLiveStreamIds(): Promise<Set<string>> {
  const cats = await fetchAll("categories", "upstream_id,type,enabled");
  const enabledCatIds = new Set(cats.filter((c: any) => c.type === "live" && c.enabled).map((c: any) => c.upstream_id));

  const streams = await fetchAll("live_streams", "upstream_id,category_id");
  const ids = new Set(
    streams
      .filter((s: any) => enabledCatIds.has(String(s.category_id)))
      .map((s: any) => String(s.upstream_id)),
  );
  // Include streams linked through any enabled custom category.
  const customIds = await getCustomCategoryLinkedStreamIds();
  for (const id of customIds) ids.add(id);
  return ids;
}

export async function getEnabledLiveStreamEpgIds(): Promise<Set<string>> {
  const cats = await fetchAll("categories", "upstream_id,type,enabled");
  const enabledCatIds = new Set(cats.filter((c: any) => c.type === "live" && c.enabled).map((c: any) => c.upstream_id));

  const streams = await fetchAll("live_streams", "upstream_id,epg_channel_id,category_id");
  const customStreamIds = await getCustomCategoryLinkedStreamIds();
  return new Set(
    streams
      .filter(
        (s: any) =>
          s.epg_channel_id &&
          (enabledCatIds.has(String(s.category_id)) || customStreamIds.has(String(s.upstream_id))),
      )
      .map((s: any) => String(s.epg_channel_id)),
  );
}

export function rewriteUrls<T extends Record<string, any>>(rows: T[]): T[] {
  return rows; // we don't rewrite stream URLs in metadata; players construct them with our proxy creds
}

export { xtream };
