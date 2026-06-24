import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getStats, getRecentlyAdded, cancelSync } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/sync")({
  component: SyncPage,
});

function RecentlyAddedList({ type }: { type: "live" | "vod" | "series" }) {
  const fetchRecent = useServerFn(getRecentlyAdded);
  const [search, setSearch] = useState("");
  const [enabledOnly, setEnabledOnly] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading } = useQuery({
    queryKey: ["recently-added", type, search, enabledOnly],
    queryFn: () => fetchRecent({ data: { type, enabledOnly, search: search || undefined, limit: 200 } }),
  });

  const rows = data ?? [];
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-4">
        <Input placeholder="Search categories…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
        <div className="flex items-center gap-2">
          <Switch id={`enabled-only-${type}`} checked={enabledOnly} onCheckedChange={(v) => { setEnabledOnly(v); setPage(1); }} />
          <label htmlFor={`enabled-only-${type}`} className="text-sm cursor-pointer">Show enabled only</label>
        </div>
      </div>
      {isLoading ? (
        <div className="p-6 text-muted-foreground"><Loader2 className="inline size-4 animate-spin" /> Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground">Nothing here yet</div>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-left p-3 font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r: any) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {r.stream_icon ? <img src={r.stream_icon} alt="" className="size-8 rounded object-cover bg-muted" /> : <div className="size-8 rounded bg-muted" />}
                      <span className="font-medium truncate">{r.name ?? "—"}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{r.category_name ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{r.created_at ? formatDistanceToNow(new Date(r.created_at), { addSuffix: true }) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages} · {rows.length} items</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
              <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}



function SyncPage() {
  const fetchStats = useServerFn(getStats);
  const qc = useQueryClient();
  const [tab, setTab] = useState<"live" | "vod" | "series">("live");
  const [runsTab, setRunsTab] = useState<"live" | "vod" | "series">("live");


  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => fetchStats(),
    refetchInterval: 5000,
  });

  const cancelRun = useMutation({
    mutationFn: (id: number) => cancelSync({ data: { id } }),
    onSuccess: () => {
      toast.success("Sync cancelled");
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sync</h1>
        <p className="text-sm text-muted-foreground">Sync run history and recently added content.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent sync runs</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Tabs value={runsTab} onValueChange={(v) => setRunsTab(v as any)}>
            <div className="px-4 pt-4">
              <TabsList>
                <TabsTrigger value="live">Live</TabsTrigger>

                <TabsTrigger value="vod">Movies</TabsTrigger>
                <TabsTrigger value="series">Series</TabsTrigger>
              </TabsList>
            </div>
            {(() => {
              const filtered = (data?.runs ?? []).filter((r: any) => r.type === runsTab).slice(0, 3);
              return (
                <table className="w-full text-sm mt-3">
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
                    {isLoading || !data ? (
                      <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No runs yet</td></tr>
                    ) : filtered.map((r: any) => (
                      <tr key={r.id} className="border-t border-border">
                        <td className="p-3 font-mono text-xs">{r.type}</td>
                        <td className="p-3">
                          {r.status === "success" ? <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 className="size-3.5" />success</span>
                            : r.status === "error" ? <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="size-3.5" />error</span>
                            : (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-primary"><Loader2 className="size-3.5 animate-spin" />running</span>
                                <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => cancelRun.mutate(r.id)} disabled={cancelRun.isPending && cancelRun.variables === r.id}>Cancel</Button>
                              </div>
                            )}
                        </td>
                        <td className="p-3 text-muted-foreground">{formatDistanceToNow(new Date(r.started_at), { addSuffix: true })}</td>
                        <td className="p-3 tabular-nums">{r.items_processed ?? 0}</td>
                        <td className="p-3 text-muted-foreground truncate max-w-md">{r.message ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </Tabs>
        </CardContent>
      </Card>


      <Card>
        <CardHeader><CardTitle className="text-base">Recently added</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <div className="px-4 pt-4">
              <TabsList>
                <TabsTrigger value="live">Live</TabsTrigger>
                <TabsTrigger value="vod">Movies</TabsTrigger>
                <TabsTrigger value="series">Series</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="live"><RecentlyAddedList type="live" /></TabsContent>
            <TabsContent value="vod"><RecentlyAddedList type="vod" /></TabsContent>
            <TabsContent value="series"><RecentlyAddedList type="series" /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
