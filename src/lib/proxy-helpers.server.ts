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

export function rewriteUrls<T extends Record<string, any>>(rows: T[]): T[] {
  return rows; // we don't rewrite stream URLs in metadata; players construct them with our proxy creds
}

export { xtream };
