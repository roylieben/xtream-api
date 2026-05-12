import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getCategories, setCategoryEnabled, bulkSetCategories } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/categories")({
  component: CategoriesPage,
});

function Section({ type }: { type: "live" | "vod" | "series" }) {
  const fetchCats = useServerFn(getCategories);
  const setEnabled = useServerFn(setCategoryEnabled);
  const bulk = useServerFn(bulkSetCategories);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["categories", type],
    queryFn: () => fetchCats({ data: { type } }),
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => setEnabled({ data: { id, enabled } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories", type] }),
    onError: (e: any) => toast.error(e.message),
  });

  const bulkM = useMutation({
    mutationFn: (enabled: boolean) => bulk({ data: { type, enabled } }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["categories", type] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (data ?? []).filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()));
  const enabledCount = (data ?? []).filter((c: any) => c.enabled).length;

  if (isLoading) return <div className="p-6 text-muted-foreground"><Loader2 className="inline size-4 animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input placeholder="Search categories…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <div className="text-xs text-muted-foreground">{enabledCount} of {data?.length ?? 0} enabled</div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => bulkM.mutate(true)}>Enable all</Button>
          <Button size="sm" variant="outline" onClick={() => bulkM.mutate(false)}>Disable all</Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0 max-h-[65vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-left p-3 font-medium w-32">Upstream ID</th>
                <th className="text-right p-3 font-medium w-24">Enabled</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No categories. Run a sync first.</td></tr>
              ) : filtered.map((c: any) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3">{c.name}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{c.upstream_id}</td>
                  <td className="p-3 text-right">
                    <Switch checked={c.enabled} onCheckedChange={(v) => toggle.mutate({ id: c.id, enabled: v })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function CategoriesPage() {
  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">Disabled categories are filtered out of the published proxy.</p>
      </div>
      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live">Live</TabsTrigger>
          <TabsTrigger value="vod">VOD</TabsTrigger>
          <TabsTrigger value="series">Series</TabsTrigger>
        </TabsList>
        <TabsContent value="live"><Section type="live" /></TabsContent>
        <TabsContent value="vod"><Section type="vod" /></TabsContent>
        <TabsContent value="series"><Section type="series" /></TabsContent>
      </Tabs>
    </div>
  );
}
