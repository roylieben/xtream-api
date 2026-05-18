import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getCustomCategories,
  createCustomCategory,
  deleteCustomCategory,
  setCustomCategoryEnabled,
  getCustomCategoryStreams,
  addStreamsToCustomCategory,
  removeStreamFromCustomCategory,
  getContent,
  getCategories,
} from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, X, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/custom-categories")({
  component: CustomCategoriesPage,
});

function CustomCategoriesPage() {
  const qc = useQueryClient();
  const fetchCats = useServerFn(getCustomCategories);
  const createCat = useServerFn(createCustomCategory);
  const deleteCat = useServerFn(deleteCustomCategory);
  const toggleCat = useServerFn(setCustomCategoryEnabled);

  const [name, setName] = useState("");
  const [managing, setManaging] = useState<{ id: number; name: string } | null>(null);

  const { data: cats, isLoading } = useQuery({
    queryKey: ["custom-categories"],
    queryFn: () => fetchCats(),
  });

  const create = useMutation({
    mutationFn: () => createCat({ data: { name: name.trim() } }),
    onSuccess: () => {
      toast.success("Category created");
      setName("");
      qc.invalidateQueries({ queryKey: ["custom-categories"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: number) => deleteCat({ data: { id } }),
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["custom-categories"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      toggleCat({ data: { id, enabled } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-categories"] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Custom Categories</h1>
        <p className="text-sm text-muted-foreground">
          Build your own live-stream categories by grouping streams from any upstream category.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 flex gap-2">
          <Input
            placeholder="New category name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) create.mutate();
            }}
            maxLength={200}
            className="max-w-sm"
          />
          <Button
            disabled={!name.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Add
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-muted-foreground">
              <Loader2 className="inline size-4 animate-spin" /> Loading…
            </div>
          ) : (cats ?? []).length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No custom categories yet. Create one above.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-right p-3 font-medium w-32">Enabled</th>
                  <th className="text-right p-3 font-medium w-48">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(cats ?? []).map((c: any) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="p-3">{c.name}</td>
                    <td className="p-3 text-right">
                      <Switch
                        checked={c.enabled}
                        onCheckedChange={(v) => toggle.mutate({ id: c.id, enabled: v })}
                      />
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManaging({ id: c.id, name: c.name })}
                        >
                          Manage streams
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm(`Delete category "${c.name}"?`)) del.mutate(c.id);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {managing && (
        <ManageStreamsDialog
          category={managing}
          onClose={() => setManaging(null)}
        />
      )}
    </div>
  );
}

function ManageStreamsDialog({
  category,
  onClose,
}: {
  category: { id: number; name: string };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const fetchLinked = useServerFn(getCustomCategoryStreams);
  const fetchAvailable = useServerFn(getContent);
  const fetchCats = useServerFn(getCategories);
  const addStreams = useServerFn(addStreamsToCustomCategory);
  const removeStream = useServerFn(removeStreamFromCustomCategory);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [showEnabledCatsOnly, setShowEnabledCatsOnly] = useState(true);

  const onSearchChange = (v: string) => {
    setSearch(v);
    setTimeout(() => setDebounced(v), 250);
  };

  const { data: allCategories } = useQuery({
    queryKey: ["categories", "live"],
    queryFn: () => fetchCats({ data: { type: "live" } }),
  });

  const categories = (allCategories ?? []).filter((c: any) => (showEnabledCatsOnly ? c.enabled : true));

  useEffect(() => {
    if (showEnabledCatsOnly && categoryId === "all" && categories.length > 0) {
      setCategoryId(categories[0].upstream_id);
    } else if (!showEnabledCatsOnly && categoryId !== "all" && categories.length > 0 && !categories.some((c: any) => c.upstream_id === categoryId)) {
      setCategoryId("all");
    }
  }, [showEnabledCatsOnly, categories, categoryId]);

  const linkedQ = useQuery({
    queryKey: ["custom-cat-streams", category.id],
    queryFn: () => fetchLinked({ data: { categoryId: category.id } }),
  });

  const availableQ = useQuery({
    queryKey: ["live-search", debounced, categoryId],
    queryFn: () =>
      fetchAvailable({
        data: {
          type: "live",
          search: debounced || undefined,
          categoryId: categoryId === "all" ? undefined : categoryId,
          page: 1,
        },
      }),
  });

  const linkedIds = new Set((linkedQ.data ?? []).map((s: any) => s.upstream_id));

  const add = useMutation({
    mutationFn: (streamId: string) =>
      addStreams({ data: { categoryId: category.id, streamIds: [streamId] } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-cat-streams", category.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (streamId: string) =>
      removeStream({ data: { categoryId: category.id, streamId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-cat-streams", category.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage streams — {category.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Linked */}
          <div className="flex flex-col border border-border rounded-md overflow-hidden">
            <div className="px-3 py-2 bg-muted/50 text-xs font-medium border-b border-border">
              Linked streams ({linkedQ.data?.length ?? 0})
            </div>
            <div className="flex-1 overflow-auto">
              {linkedQ.isLoading ? (
                <div className="p-4 text-muted-foreground text-sm">
                  <Loader2 className="inline size-4 animate-spin" /> Loading…
                </div>
              ) : (linkedQ.data ?? []).length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No streams linked yet.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground bg-muted/30 sticky top-0">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">Name</th>
                      <th className="text-left font-medium px-3 py-2 w-48">Category</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(linkedQ.data ?? []).map((s: any) => (
                      <tr key={s.upstream_id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {s.stream_icon && (
                              <img
                                src={s.stream_icon}
                                alt=""
                                className="size-6 rounded object-cover shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            )}
                            <span className="truncate">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground truncate">{s.category_name ?? "—"}</td>
                        <td className="px-2 py-2 text-right">
                          <Button size="sm" variant="ghost" onClick={() => remove.mutate(s.upstream_id)}>
                            <X className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Available */}
          <div className="flex flex-col border border-border rounded-md overflow-hidden">
            <div className="px-3 py-2 bg-muted/50 border-b border-border space-y-2">
              <div className="text-xs font-medium">Available live streams</div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by stream or category name…"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="h-8 pl-7 text-sm"
                />
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {availableQ.isLoading ? (
                <div className="p-4 text-muted-foreground text-sm">
                  <Loader2 className="inline size-4 animate-spin" /> Loading…
                </div>
              ) : (availableQ.data?.rows ?? []).length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No streams found.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground bg-muted/30 sticky top-0">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">Name</th>
                      <th className="text-left font-medium px-3 py-2 w-48">Category</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(availableQ.data?.rows ?? []).map((s: any) => {
                      const isLinked = linkedIds.has(s.upstream_id);
                      return (
                        <tr key={s.upstream_id} className="border-t border-border hover:bg-muted/30">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {s.stream_icon && (
                                <img
                                  src={s.stream_icon}
                                  alt=""
                                  className="size-6 rounded object-cover shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              )}
                              <span className="truncate">{s.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground truncate">{s.category_name ?? "—"}</td>
                          <td className="px-2 py-2 text-right">
                            <Button
                              size="sm"
                              variant={isLinked ? "ghost" : "outline"}
                              disabled={isLinked || add.isPending}
                              onClick={() => add.mutate(s.upstream_id)}
                            >
                              {isLinked ? "Added" : <Plus className="size-4" />}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {(availableQ.data?.total ?? 0) > (availableQ.data?.rows.length ?? 0) && (
                <div className="p-2 text-center text-xs text-muted-foreground">
                  Showing {availableQ.data?.rows.length} of {availableQ.data?.total}. Refine
                  your search to narrow results.
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
