import { createFileRoute } from "@tanstack/react-router";
import { authProxy, getEnabledLiveStreamEpgIds } from "@/lib/proxy-helpers.server";
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
        
        const enabledIds = await getEnabledLiveStreamEpgIds();
        
        // Use HTMLRewriter to stream and filter the large XML to avoid memory limits
        // @ts-ignore - HTMLRewriter is available in Cloudflare Workers and Bun
        const rewriter = new (globalThis as any).HTMLRewriter()
          .on("channel", {
            element(element: any) {
              const id = element.getAttribute("id");
              if (id && !enabledIds.has(id)) {
                element.remove();
              }
            }
          })
          .on("programme", {
            element(element: any) {
              const channel = element.getAttribute("channel");
              if (channel && !enabledIds.has(channel)) {
                element.remove();
              }
            }
          });
          
        const transformed = rewriter.transform(upstream);
        
        return new Response(transformed.body, {
          status: 200,
          headers: {
            "Content-Type": upstream.headers.get("content-type") ?? "application/xml",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
