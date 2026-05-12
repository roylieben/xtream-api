import { createFileRoute } from "@tanstack/react-router";
import { authProxy, getEnabledLiveStreamIds } from "@/lib/proxy-helpers.server";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

export const Route = createFileRoute("/api/public/xmltv.php")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const auth = await authProxy(url);
        if (!auth.ok) return auth.res;
        const s = auth.settings;
        if (!s.xtream_host) return new Response("Not configured", { status: 503 });
        const u = new URL(s.xtream_host.replace(/\/$/, "") + "/xmltv.php");
        u.searchParams.set("username", s.xtream_username);
        u.searchParams.set("password", s.xtream_password);
        const upstream = await fetch(u.toString());
        
        if (!upstream.ok) return new Response("Upstream error", { status: upstream.status });
        
        const xmlText = await upstream.text();
        const enabledIds = await getEnabledLiveStreamIds();
        
        const parser = new XMLParser({
          ignoreAttributes: false,
          processEntities: false,
        });
        const builder = new XMLBuilder({
          ignoreAttributes: false,
          format: true,
          processEntities: false,
        });
        
        try {
          const parsed = parser.parse(xmlText);
          if (parsed && parsed.tv) {
            if (Array.isArray(parsed.tv.channel)) {
              parsed.tv.channel = parsed.tv.channel.filter((ch: any) => enabledIds.has(String(ch["@_id"])));
            } else if (parsed.tv.channel && !enabledIds.has(String(parsed.tv.channel["@_id"]))) {
              delete parsed.tv.channel;
            }
            
            if (Array.isArray(parsed.tv.programme)) {
              parsed.tv.programme = parsed.tv.programme.filter((pr: any) => enabledIds.has(String(pr["@_channel"])));
            } else if (parsed.tv.programme && !enabledIds.has(String(parsed.tv.programme["@_channel"]))) {
              delete parsed.tv.programme;
            }
          }
          const finalXml = builder.build(parsed);
          
          return new Response(finalXml, {
            status: 200,
            headers: {
              "Content-Type": upstream.headers.get("content-type") ?? "application/xml",
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch (e) {
          // Fallback if parsing fails
          return new Response(xmlText, {
            status: 200,
            headers: {
              "Content-Type": upstream.headers.get("content-type") ?? "application/xml",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }
      },
    },
  },
});
