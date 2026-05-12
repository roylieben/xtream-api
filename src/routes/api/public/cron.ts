// External cron trigger - runs sync if interval has elapsed. No auth: idempotent + cheap.
import { createFileRoute } from "@tanstack/react-router";
import { maybeRunDueSyncs } from "@/lib/sync.server";

export const Route = createFileRoute("/api/public/cron")({
  server: {
    handlers: {
      GET: async () => {
        maybeRunDueSyncs();
        return new Response(JSON.stringify({ ok: true, triggered: true }), {
          headers: { "Content-Type": "application/json" },
        });
      },
      POST: async () => {
        maybeRunDueSyncs();
        return new Response(JSON.stringify({ ok: true, triggered: true }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
