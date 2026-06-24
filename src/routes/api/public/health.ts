import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const started = Date.now();
        const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

        // Database check via publishable client (cheap read against settings table)
        const dbStart = Date.now();
        try {
          const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } },
          );
          const { error } = await supabase.from("app_settings").select("id").limit(1);
          if (error) throw error;
          checks.database = { ok: true, latencyMs: Date.now() - dbStart };
        } catch (e: any) {
          checks.database = { ok: false, latencyMs: Date.now() - dbStart, error: e?.message ?? "unknown" };
        }

        const ok = Object.values(checks).every((c) => c.ok);
        return Response.json(
          {
            status: ok ? "ok" : "degraded",
            timestamp: new Date().toISOString(),
            uptimeMs: Date.now() - started,
            checks,
          },
          {
            status: ok ? 200 : 503,
            headers: { "cache-control": "no-store" },
          },
        );
      },
    },
  },
});
