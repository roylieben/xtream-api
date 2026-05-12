import { createStart, createMiddleware } from "@tanstack/react-start";



const errorMiddleware = createMiddleware().server(async ({ next }) => {
  // Let all errors propagate so TanStack can serialize server-function errors
  // (Error, redirect, notFound, Response) properly back to the client.
  // Catastrophic SSR errors are handled by src/server.ts.
  return await next();
});

const authedFetch: typeof fetch = async (input, init) => {
  if (typeof window !== "undefined") {
    try {
      const { supabase } = await import("./integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        const headers = new Headers(init?.headers);
        if (!headers.has("authorization")) {
          headers.set("authorization", `Bearer ${token}`);
        }
        init = { ...init, headers };
      }
    } catch (e) {
      console.error("authedFetch: failed to attach token", e);
    }
  }
  return fetch(input, init);
};

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
  serverFns: { fetch: authedFetch },
}));
