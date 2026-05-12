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

export async function getEnabledCategoryIds(type: "live" | "vod" | "series"): Promise<Set<string>> {
  const { data } = await supabaseAdmin
    .from("categories")
    .select("upstream_id,enabled")
    .eq("type", type);
  return new Set((data ?? []).filter((c: any) => c.enabled).map((c: any) => c.upstream_id));
}

export async function getEnabledLiveStreamIds(): Promise<Set<string>> {
  // Get all enabled categories for live streams
  const { data: cats } = await supabaseAdmin
    .from("categories")
    .select("upstream_id")
    .eq("type", "live")
    .eq("enabled", true);
  
  const enabledCatIds = new Set((cats ?? []).map((c: any) => c.upstream_id));

  // Get all live streams
  const { data: streams } = await supabaseAdmin
    .from("live_streams")
    .select("upstream_id, category_id");
    
  return new Set(
    (streams ?? [])
      .filter((s: any) => enabledCatIds.has(String(s.category_id)))
      .map((s: any) => String(s.upstream_id))
  );
}

export function rewriteUrls<T extends Record<string, any>>(rows: T[]): T[] {
  return rows; // we don't rewrite stream URLs in metadata; players construct them with our proxy creds
}

export { xtream };
