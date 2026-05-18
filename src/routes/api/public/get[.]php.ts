// Generates a filtered M3U playlist from synced live/vod/series.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authProxy, getEnabledCategoryIds, fetchAll, getEnabledCustomCategoryMap } from "@/lib/proxy-helpers.server";

export const Route = createFileRoute("/api/public/get.php")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const auth = await authProxy(url);
        if (!auth.ok) return auth.res;
        const s = auth.settings;
        const protocol = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
        const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
        const proxyHost = `${protocol}://${host}/api/public`;

        const [liveEnabled, vodEnabled, customMap] = await Promise.all([
          getEnabledCategoryIds("live"),
          getEnabledCategoryIds("vod"),
          getEnabledCustomCategoryMap(),
        ]);

        const [lives, vods, cats, customCats] = await Promise.all([
          fetchAll("live_streams", "upstream_id,name,stream_icon,category_id,epg_channel_id"),
          fetchAll("vod_streams", "upstream_id,name,stream_icon,category_id,container_extension"),
          fetchAll("categories", "type,upstream_id,name"),
          fetchAll("custom_categories", "id,name,enabled"),
        ]);
        const catName = new Map<string, string>();
        for (const c of cats ?? []) catName.set(`${c.type}:${c.upstream_id}`, c.name ?? "");
        const customCatName = new Map<number, string>();
        for (const c of customCats ?? []) customCatName.set(c.id, c.name ?? "");

        // Reverse index: stream upstream id -> custom category group names
        const streamToCustomGroups = new Map<string, string[]>();
        for (const [cid, streamSet] of customMap.entries()) {
          const name = customCatName.get(cid);
          if (!name) continue;
          for (const sid of streamSet) {
            const arr = streamToCustomGroups.get(sid) ?? [];
            arr.push(name);
            streamToCustomGroups.set(sid, arr);
          }
        }

        const u = encodeURIComponent(s.proxy_username ?? "");
        const p = encodeURIComponent(s.proxy_password ?? "");

        let out = "#EXTM3U\n";
        for (const r of lives ?? []) {
          const sid = String(r.upstream_id);
          const upstreamOk = r.category_id && liveEnabled.has(String(r.category_id));
          const customGroups = streamToCustomGroups.get(sid) ?? [];
          if (!upstreamOk && customGroups.length === 0) continue;
          const groups: string[] = [];
          if (upstreamOk) {
            const g = catName.get(`live:${r.category_id}`);
            if (g) groups.push(g);
          }
          groups.push(...customGroups);
          const grp = groups.join(";");
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
