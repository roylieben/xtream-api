import { createFileRoute } from "@tanstack/react-router";
import { redirectStream } from "@/lib/stream-redirect.server";

export const Route = createFileRoute("/api/public/live/$user/$pass/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => redirectStream("live", params.user, params.pass, params.file),
    },
  },
});
