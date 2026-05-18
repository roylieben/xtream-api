import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getSettings, updateProxy, updateSyncIntervals, updateSecurity, testConnection, updateUpstream } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const fetchSettings = useServerFn(getSettings);
  const update = useServerFn(updateSettings);
  const saveUp = useServerFn(updateUpstream);
  const test = useServerFn(testConnection);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: () => fetchSettings() });
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (data) setForm({ ...data });
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      update({
        data: {
          xtream_host: form.xtream_host,
          xtream_username: form.xtream_username,
          xtream_password: form.xtream_password,
          proxy_username: form.proxy_username,
          proxy_password: form.proxy_password,
          sync_interval_live_minutes: Number(form.sync_interval_live_minutes),
          sync_interval_vod_minutes: Number(form.sync_interval_vod_minutes),
          sync_interval_series_minutes: Number(form.sync_interval_series_minutes),
          disable_signup: form.disable_signup,
        },
      }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const testM = useMutation({
    mutationFn: () =>
      test({
        data: {
          xtream_host: form.xtream_host,
          xtream_username: form.xtream_username,
          xtream_password: form.xtream_password,
        },
      }),
    onSuccess: (r: any) => (r.ok ? toast.success("Upstream OK") : toast.error(`Upstream: ${r.error}`)),
    onError: (e: any) => toast.error(e.message),
  });

  const saveUpstream = useMutation({
    mutationFn: () =>
      saveUp({
        data: {
          xtream_host: form.xtream_host,
          xtream_username: form.xtream_username,
          xtream_password: form.xtream_password,
        },
      }),
    onSuccess: () => {
      toast.success("Upstream saved");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !form) return <div className="p-8 text-muted-foreground"><Loader2 className="inline size-4 animate-spin" /> Loading…</div>;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const proxyBase = `${origin}/api/public`;
  const playerApiUrl = `${proxyBase}/player_api.php`;
  const m3uUrl = `${proxyBase}/get.php?username=${encodeURIComponent(form.proxy_username)}&password=${encodeURIComponent(form.proxy_password)}&type=m3u_plus&output=ts`;
  const xmltvUrl = `${proxyBase}/xmltv.php?username=${encodeURIComponent(form.proxy_username)}&password=${encodeURIComponent(form.proxy_password)}`;

  const copy = (s: string) => {
    navigator.clipboard.writeText(s);
    toast.success("Copied");
  };
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Upstream credentials, proxy account, and sync intervals.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upstream XTream API</CardTitle>
          <CardDescription>The original provider this app pulls catalog from.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-2">
            <Label>Host (URL)</Label>
            <Input placeholder="http://example.com:8080" value={form.xtream_host} onChange={(e) => set("xtream_host", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={form.xtream_username} onChange={(e) => set("xtream_username", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={form.xtream_password} onChange={(e) => set("xtream_password", e.target.value)} />
          </div>
          <div className="md:col-span-2 flex gap-2 justify-end">
            <Button variant="outline" onClick={() => testM.mutate()} disabled={testM.isPending}>
              {testM.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Test connection
            </Button>
            <Button onClick={() => saveUpstream.mutate()} disabled={saveUpstream.isPending}>
              {saveUpstream.isPending && <Loader2 className="size-4 animate-spin" />} Save upstream
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Published proxy account</CardTitle>
          <CardDescription>Credentials your IPTV players will use to connect to this app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Proxy username</Label>
              <Input value={form.proxy_username} onChange={(e) => set("proxy_username", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Proxy password</Label>
              <Input value={form.proxy_password} onChange={(e) => set("proxy_password", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {[
              ["XTream API URL", playerApiUrl],
              ["M3U playlist URL", m3uUrl],
              ["EPG (XMLTV) URL", xmltvUrl],
            ].map(([label, url]) => (
              <div key={label} className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                <div className="text-xs text-muted-foreground w-32 shrink-0">{label}</div>
                <code className="text-xs truncate flex-1">{url}</code>
                <Button size="icon" variant="ghost" onClick={() => copy(url)}><Copy className="size-3.5" /></Button>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="size-4 animate-spin mr-2" />} Save proxy settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync intervals (minutes)</CardTitle>
          <CardDescription>How often each section is refreshed when traffic hits the proxy.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          {[
            ["sync_interval_live_minutes", "Live"],
            ["sync_interval_vod_minutes", "VOD"],
            ["sync_interval_series_minutes", "Series"],
          ].map(([k, label]) => (
            <div key={k} className="space-y-2">
              <Label>{label}</Label>
              <Input type="number" min={5} max={10080} value={form[k]} onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
        </CardContent>
        <CardContent className="flex justify-end pt-0">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="size-4 animate-spin mr-2" />} Save sync intervals
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Security</CardTitle>
          <CardDescription>Configure security and access settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="disable_signup" 
              className="size-4 rounded border-gray-300"
              checked={form.disable_signup} 
              onChange={(e) => set("disable_signup", e.target.checked)} 
            />
            <Label htmlFor="disable_signup">Disable public admin creation (signup)</Label>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="size-4 animate-spin mr-2" />} Save security settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
