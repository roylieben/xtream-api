import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getContent, getCategories } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/content")({
  component: ContentPage,
});

function Browser({ type }: { type: "live" | "vod" | "series" }) {
  const fetchContent = useServerFn(getContent);
  const fetchCats = useServerFn(getCategories);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [showEnabledCatsOnly, setShowEnabledCatsOnly] = useState(true);
  
  const { data: allCategories } = useQuery({
    queryKey: ["categories", type],
    queryFn: () => fetchCats({ data: { type } }),
  });
  
  const categories = (allCategories ?? []).filter((c: any) => showEnabledCatsOnly ? c.enabled : true);
  
  const { data, isLoading } = useQuery({
    queryKey: ["content", type, search, categoryId, page],
    queryFn: () => fetchContent({ data: { type, search: search || undefined, categoryId: categoryId === "all" ? undefined : categoryId, page } }),
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex gap-6 h-[calc(100vh-14rem)] min-h-[500px]">
      <div className="w-64 flex flex-col gap-4 border-r pr-6 shrink-0">
        <div className="flex items-center gap-2">
          <Switch id={`show-enabled-cats-${type}`} checked={showEnabledCatsOnly} onCheckedChange={setShowEnabledCatsOnly} />
          <label htmlFor={`show-enabled-cats-${type}`} className="text-sm cursor-pointer">Enabled only</label>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 pr-2">
          <Button
            variant={categoryId === "all" ? "secondary" : "ghost"}
            className="w-full justify-start font-normal text-left h-auto py-2"
            onClick={() => { setCategoryId("all"); setPage(1); }}
          >
            <div className="flex-1 truncate">All Categories</div>
          </Button>
          {categories.map((c: any) => (
            <Button
              key={c.upstream_id}
              variant={categoryId === c.upstream_id ? "secondary" : "ghost"}
              className="w-full justify-start font-normal text-left h-auto py-2"
              onClick={() => { setCategoryId(c.upstream_id); setPage(1); }}
            >
              <div className="flex-1 truncate">{c.name}</div>
              <span className="text-xs text-muted-foreground ml-2">{c.stream_count}</span>
            </Button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="max-w-sm"
          />
          <div className="text-xs text-muted-foreground ml-auto">
            {data?.total ?? 0} items
          </div>
        </div>
        
        <Card className="flex-1 overflow-hidden flex flex-col">
          <CardContent className="p-0 flex-1 overflow-auto">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground"><Loader2 className="inline size-4 animate-spin" /></div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium">Name</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.rows ?? []).length === 0 ? (
                    <tr><td className="p-8 text-center text-muted-foreground">Nothing here yet.</td></tr>
                  ) : data!.rows.map((r: any) => (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/50">
                      <td className="p-3">{r.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
        
        <div className="flex items-center gap-2 justify-end">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="size-4" /></Button>
          <div className="text-xs text-muted-foreground tabular-nums">Page {page} / {pages}</div>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRight className="size-4" /></Button>
        </div>
      </div>
    </div>
  );
}

function ContentPage() {
  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Content</h1>
        <p className="text-sm text-muted-foreground">Browse the locally-cached catalog.</p>
      </div>
      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live">Live</TabsTrigger>
          <TabsTrigger value="vod">VOD</TabsTrigger>
          <TabsTrigger value="series">Series</TabsTrigger>
        </TabsList>
        <TabsContent value="live" className="mt-6"><Browser type="live" /></TabsContent>
        <TabsContent value="vod" className="mt-6"><Browser type="vod" /></TabsContent>
        <TabsContent value="series" className="mt-6"><Browser type="series" /></TabsContent>
      </Tabs>
    </div>
  );
}
