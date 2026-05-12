import { createFileRoute } from "@tanstack/react-router";
import { redirectStream } from "../../live/$user/$pass/$file";

export const Route = createFileRoute("/api/public/series/$user/$pass/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => redirectStream("series", params.user, params.pass, params.file),
    },
  },
});
