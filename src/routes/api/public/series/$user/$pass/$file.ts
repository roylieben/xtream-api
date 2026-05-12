import { createFileRoute } from "@tanstack/react-router";
import { redirectStream } from "@/lib/stream-redirect.server";

export const Route = createFileRoute("/api/public/series/$user/$pass/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => redirectStream("series", params.user, params.pass, params.file),
    },
  },
});
