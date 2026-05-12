// Live stream redirector (302). Validates proxy creds, redirects to upstream.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function redirectStream(kind: "live" | "movie" | "series", user: string, pass: string, file: string) {
  const { data: s } = await supabaseAdmin.from("app_settings").select("*").limit(1).single();
  if (!s || user !== s.proxy_username || pass !== s.proxy_password) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!s.xtream_host) return new Response("Not configured", { status: 503 });
  const upstream = `${s.xtream_host.replace(/\/$/, "")}/${kind}/${encodeURIComponent(s.xtream_username)}/${encodeURIComponent(s.xtream_password)}/${file}`;
  return new Response(null, { status: 302, headers: { Location: upstream } });
}

export const Route = createFileRoute("/api/public/live/$user/$pass/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => redirectStream("live", params.user, params.pass, params.file),
    },
  },
});

export { redirectStream };
