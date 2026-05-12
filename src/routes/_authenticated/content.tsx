import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import ReactPlayer from "react-player";
import { getContent, getCategories, getSettings } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ChevronLeft, ChevronRight, Play } from "lucide-react";

export const Route = createFileRoute("/_authenticated/content")({
  component: ContentPage,
});

function Browser({ type }: { type: "live" | "vod" | "series" }) {
  const fetchContent = useServerFn(getContent);
  const fetchCats = useServerFn(getCategories);
  const fetchSettings = useServerFn(getSettings);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [showEnabledCatsOnly, setShowEnabledCatsOnly] = useState(true);
  const [previewItem, setPreviewItem] = useState<{ name: string; url: string } | null>(null);
  
  const { data: allCategories } = useQuery({
    queryKey: ["categories", type],
    queryFn: () => fetchCats({ data: { type } }),
  });
  
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetchSettings(),
  });
  
  const categories = (allCategories ?? []).filter((c: any) => showEnabledCatsOnly ? c.enabled : true);
  
  useEffect(() => {
    if (showEnabledCatsOnly && categoryId === "all" && categories.length > 0) {
      setCategoryId(categories[0].upstream_id);
      setPage(1);
    } else if (!showEnabledCatsOnly && categoryId !== "all" && categories.length > 0 && !categories.some((c: any) => c.upstream_id === categoryId)) {
      setCategoryId("all");
      setPage(1);
    }
  }, [showEnabledCatsOnly, categories, categoryId]);
  
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
          {!showEnabledCatsOnly && (
            <Button
              variant={categoryId === "all" ? "secondary" : "ghost"}
              className="w-full justify-start font-normal text-left h-auto py-2"
              onClick={() => { setCategoryId("all"); setPage(1); }}
            >
              <div className="flex-1 truncate">All Categories</div>
            </Button>
          )}
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
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.rows ?? []).length === 0 ? (
                    <tr><td colSpan={2} className="p-8 text-center text-muted-foreground">Nothing here yet.</td></tr>
                  ) : data!.rows.map((r: any) => {
                    const ext = type === "live" ? "m3u8" : (r.container_extension || (type === "series" ? "mkv" : "mp4"));
                    const pUrl = settings ? `${window.location.protocol}//${window.location.host}/api/public/${type === "live" ? "live" : type === "vod" ? "movie" : "series"}/${encodeURIComponent(settings.proxy_username || "")}/${encodeURIComponent(settings.proxy_password || "")}/${r.upstream_id}.${ext}` : "";
                    
                    return (
                      <tr key={r.id} className="border-t border-border hover:bg-muted/50 group">
                        <td className="p-3">{r.name}</td>
                        <td className="p-3 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setPreviewItem({ name: r.name, url: pUrl })}
                            disabled={!settings}
                          >
                            <Play className="size-4 mr-2" />
                            Preview
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
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
      
      {previewItem && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setPreviewItem(null); }}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none">
            <DialogHeader className="absolute top-0 inset-x-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
              <DialogTitle className="text-white drop-shadow-md">{previewItem.name}</DialogTitle>
            </DialogHeader>
            <div className="relative pt-[56.25%] w-full bg-black">
              <ReactPlayer 
                src={previewItem.url} 
                controls 
                playing
                width="100%"
                height="100%"
                className="absolute inset-0"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
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
