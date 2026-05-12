import { createFileRoute } from "@tanstack/react-router";
import { authProxy } from "@/lib/proxy-helpers.server";

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
        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            "Content-Type": upstream.headers.get("content-type") ?? "application/xml",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
