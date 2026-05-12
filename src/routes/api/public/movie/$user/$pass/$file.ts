import { createFileRoute } from "@tanstack/react-router";
import { redirectStream } from "@/lib/stream-redirect.server";

export const Route = createFileRoute("/api/public/movie/$user/$pass/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => redirectStream("movie", params.user, params.pass, params.file),
    },
  },
});
