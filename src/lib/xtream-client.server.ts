// Upstream XTream Codes API client (server only)

export type XtreamCreds = {
  host: string;
  username: string;
  password: string;
};

function normalizeHost(h: string): string {
  let host = h.trim();
  if (!host) throw new Error("XTream host is empty");
  if (!/^https?:\/\//i.test(host)) host = "http://" + host;
  return host.replace(/\/+$/, "");
}

export function buildPlayerApiUrl(creds: XtreamCreds, params: Record<string, string>) {
  const u = new URL(normalizeHost(creds.host) + "/player_api.php");
  u.searchParams.set("username", creds.username);
  u.searchParams.set("password", creds.password);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

async function callPlayerApi<T>(creds: XtreamCreds, params: Record<string, string>): Promise<T> {
  const url = buildPlayerApiUrl(creds, params);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Upstream HTTP ${res.status} for action=${params.action ?? "(none)"}`);
  const text = await res.text();
  if (!text) return [] as unknown as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Upstream returned non-JSON for action=${params.action ?? "(none)"}`);
  }
}

export const xtream = {
  accountInfo: (c: XtreamCreds) => callPlayerApi<any>(c, {}),
  liveCategories: (c: XtreamCreds) => callPlayerApi<any[]>(c, { action: "get_live_categories" }),
  vodCategories: (c: XtreamCreds) => callPlayerApi<any[]>(c, { action: "get_vod_categories" }),
  seriesCategories: (c: XtreamCreds) => callPlayerApi<any[]>(c, { action: "get_series_categories" }),
  liveStreams: (c: XtreamCreds) => callPlayerApi<any[]>(c, { action: "get_live_streams" }),
  vodStreams: (c: XtreamCreds) => callPlayerApi<any[]>(c, { action: "get_vod_streams" }),
  series: (c: XtreamCreds) => callPlayerApi<any[]>(c, { action: "get_series" }),
  vodInfo: (c: XtreamCreds, vodId: string | number) =>
    callPlayerApi<any>(c, { action: "get_vod_info", vod_id: String(vodId) }),
  seriesInfo: (c: XtreamCreds, seriesId: string | number) =>
    callPlayerApi<any>(c, { action: "get_series_info", series_id: String(seriesId) }),
  xmltvUrl: (c: XtreamCreds) => {
    const u = new URL(normalizeHost(c.host) + "/xmltv.php");
    u.searchParams.set("username", c.username);
    u.searchParams.set("password", c.password);
    return u.toString();
  },
  liveStreamUrl: (c: XtreamCreds, id: string | number, ext = "ts") =>
    `${normalizeHost(c.host)}/live/${encodeURIComponent(c.username)}/${encodeURIComponent(c.password)}/${id}.${ext}`,
  vodStreamUrl: (c: XtreamCreds, id: string | number, ext = "mp4") =>
    `${normalizeHost(c.host)}/movie/${encodeURIComponent(c.username)}/${encodeURIComponent(c.password)}/${id}.${ext}`,
  seriesEpisodeUrl: (c: XtreamCreds, id: string | number, ext = "mp4") =>
    `${normalizeHost(c.host)}/series/${encodeURIComponent(c.username)}/${encodeURIComponent(c.password)}/${id}.${ext}`,
};
