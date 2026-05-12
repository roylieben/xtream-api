import { createFileRoute } from "@tanstack/react-router";
import { redirectStream } from "../../live/$user/$pass/$file";

export const Route = createFileRoute("/api/public/movie/$user/$pass/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => redirectStream("movie", params.user, params.pass, params.file),
    },
  },
});
