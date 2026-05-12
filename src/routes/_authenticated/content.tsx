import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getContent, getCategories } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  
  const { data: categories } = useQuery({
    queryKey: ["categories", type],
    queryFn: () => fetchCats({ data: { type } }),
  });
  
  const { data, isLoading } = useQuery({
    queryKey: ["content", type, search, categoryId, page],
    queryFn: () => fetchContent({ data: { type, search: search || undefined, categoryId: categoryId === "all" ? undefined : categoryId, page } }),
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
        <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((c: any) => (
              <SelectItem key={c.upstream_id} value={c.upstream_id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground ml-auto">
          {data?.total ?? 0} items
        </div>
      </div>
      <Card>
        <CardContent className="p-0 max-h-[60vh] overflow-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground"><Loader2 className="inline size-4 animate-spin" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium w-24">ID</th>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium w-32">Category</th>
                </tr>
              </thead>
              <tbody>
                {(data?.rows ?? []).length === 0 ? (
                  <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">Nothing here yet.</td></tr>
                ) : data!.rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3 font-mono text-xs text-muted-foreground">{r.upstream_id}</td>
                    <td className="p-3">{r.name}</td>
                    <td className="p-3 text-xs text-muted-foreground">{r.category_name ?? r.category_id ?? "—"}</td>
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
  );
}

function ContentPage() {
  return (
    <div className="p-6 space-y-6 max-w-5xl">
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
        <TabsContent value="live"><Browser type="live" /></TabsContent>
        <TabsContent value="vod"><Browser type="vod" /></TabsContent>
        <TabsContent value="series"><Browser type="series" /></TabsContent>
      </Tabs>
    </div>
  );
}
