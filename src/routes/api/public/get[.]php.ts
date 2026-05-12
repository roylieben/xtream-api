// Generates a filtered M3U playlist from synced live/vod/series.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authProxy, getEnabledCategoryIds } from "@/lib/proxy-helpers.server";

export const Route = createFileRoute("/api/public/get.php")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const auth = await authProxy(url);
        if (!auth.ok) return auth.res;
        const s = auth.settings;
        const proxyHost = `${url.protocol}//${url.host}/api/public`;

        const [liveEnabled, vodEnabled, seriesEnabled] = await Promise.all([
          getEnabledCategoryIds("live"),
          getEnabledCategoryIds("vod"),
          getEnabledCategoryIds("series"),
        ]);

        const [{ data: lives }, { data: vods }, { data: cats }] = await Promise.all([
          supabaseAdmin.from("live_streams").select("upstream_id,name,stream_icon,category_id,epg_channel_id").limit(50000),
          supabaseAdmin.from("vod_streams").select("upstream_id,name,stream_icon,category_id,container_extension").limit(50000),
          supabaseAdmin.from("categories").select("type,upstream_id,name"),
        ]);
        const catName = new Map<string, string>();
        for (const c of cats ?? []) catName.set(`${c.type}:${c.upstream_id}`, c.name);

        const u = encodeURIComponent(s.proxy_username);
        const p = encodeURIComponent(s.proxy_password);

        let out = "#EXTM3U\n";
        for (const r of lives ?? []) {
          if (!r.category_id || !liveEnabled.has(String(r.category_id))) continue;
          const grp = catName.get(`live:${r.category_id}`) ?? "";
          out += `#EXTINF:-1 tvg-id="${r.epg_channel_id ?? ""}" tvg-logo="${r.stream_icon ?? ""}" group-title="${grp}",${r.name ?? ""}\n`;
          out += `${proxyHost}/live/${u}/${p}/${r.upstream_id}.ts\n`;
        }
        for (const r of vods ?? []) {
          if (!r.category_id || !vodEnabled.has(String(r.category_id))) continue;
          const grp = catName.get(`vod:${r.category_id}`) ?? "";
          const ext = r.container_extension || "mp4";
          out += `#EXTINF:-1 tvg-logo="${r.stream_icon ?? ""}" group-title="${grp}",${r.name ?? ""}\n`;
          out += `${proxyHost}/movie/${u}/${p}/${r.upstream_id}.${ext}\n`;
        }
        // Note: series aren't typically expressed in M3U; omitted intentionally.

        return new Response(out, {
          status: 200,
          headers: {
            "Content-Type": "audio/x-mpegurl",
            "Content-Disposition": 'attachment; filename="playlist.m3u"',
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
