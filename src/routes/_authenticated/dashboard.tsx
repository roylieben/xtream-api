import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getStats, runSync, testConnection, cancelSync } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Tv, Film, Clapperboard, FolderTree, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="grid size-10 place-items-center rounded-md bg-accent text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const fetchStats = useServerFn(getStats);
  const doTest = useServerFn(testConnection);
  const doSync = useServerFn(runSync);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => fetchStats(),
    refetchInterval: 5000,
  });

  const test = useMutation({
    mutationFn: () => doTest(),
    onSuccess: (r: any) =>
      r.ok ? toast.success("Upstream OK") : toast.error(`Upstream: ${r.error}`),
    onError: (e: any) => toast.error(e.message),
  });

  const sync = useMutation({
    mutationFn: (type: "live" | "vod" | "series") => doSync({ data: { type } }),
    onSuccess: (r: any) => {
      toast.success(`Synced: ${r.message ?? `${r.items} items`}`);
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelRun = useMutation({
    mutationFn: (id: number) => cancelSync({ data: { id } }),
    onSuccess: () => {
      toast.success("Sync cancelled");
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return <div className="p-8 text-muted-foreground"><Loader2 className="inline size-4 animate-spin" /> Loading…</div>;
  }

  const lastSync = (d: string | null | undefined) =>
    d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : "never";

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of synced catalog and proxy state.</p>
        </div>
        <Button variant="outline" onClick={() => test.mutate()} disabled={test.isPending}>
          {test.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          Test upstream
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Tv} label="Live channels" value={data.counts.live} />
        <StatCard icon={Film} label="Movies (VOD)" value={data.counts.vod} />
        <StatCard icon={Clapperboard} label="Series" value={data.counts.series} />
        <StatCard icon={FolderTree} label="Categories" value={data.counts.categories} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Sync status</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          {([
            ["live", "Live", data.settings?.last_sync_live_at, data.settings?.sync_interval_live_minutes],
            ["vod", "VOD", data.settings?.last_sync_vod_at, data.settings?.sync_interval_vod_minutes],
            ["series", "Series", data.settings?.last_sync_series_at, data.settings?.sync_interval_series_minutes],
          ] as const).map(([key, label, last, mins]) => (
            <div key={key} className="rounded-md border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">{label}</div>
                <Badge variant="outline">every {mins}m</Badge>
              </div>
              <div className="text-xs text-muted-foreground">Last: {lastSync(last as any)}</div>
              <Button size="sm" variant="secondary" className="w-full" onClick={() => sync.mutate(key)} disabled={sync.isPending}>
                <RefreshCw className={`size-3.5 ${sync.isPending && sync.variables === key ? "animate-spin" : ""}`} />
                Sync now
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Latest sync results</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Started</th>
                <th className="text-left p-3 font-medium">Items</th>
                <th className="text-left p-3 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const latest = (["live", "vod", "series"] as const).map((t) => ({
                  type: t,
                  run: data.runs.find((r: any) => r.type === t),
                }));
                if (latest.every((l) => !l.run)) {
                  return <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No runs yet</td></tr>;
                }
                return latest.map(({ type, run }) => (
                  <tr key={type} className="border-t border-border">
                    <td className="p-3 font-mono text-xs">{type}</td>
                    {run ? (
                      <>
                        <td className="p-3">
                          {run.status === "success" ? <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 className="size-3.5" />success</span>
                            : run.status === "error" ? <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="size-3.5" />error</span>
                            : (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-primary"><Loader2 className="size-3.5 animate-spin" />running</span>
                                <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => cancelRun.mutate(run.id)} disabled={cancelRun.isPending && cancelRun.variables === run.id}>Cancel</Button>
                              </div>
                            )}
                        </td>
                        <td className="p-3 text-muted-foreground">{formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}</td>
                        <td className="p-3 tabular-nums">{run.items_processed ?? 0}</td>
                        <td className="p-3 text-muted-foreground truncate max-w-md">{run.message ?? "—"}</td>
                      </>
                    ) : (
                      <td colSpan={4} className="p-3 text-muted-foreground">No runs yet</td>
                    )}
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
