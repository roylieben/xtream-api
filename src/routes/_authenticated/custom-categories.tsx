import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  getCustomCategories,
  createCustomCategory,
  deleteCustomCategory,
  setCustomCategoryEnabled,
  renameCustomCategory,
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
import { Loader2, Plus, Trash2, X, Search, Pencil, Check } from "lucide-react";
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
  const renameCat = useServerFn(renameCustomCategory);

  const [name, setName] = useState("");
  const [managing, setManaging] = useState<{ id: number; name: string } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

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
          pageSize: 5000,
        },
      }),
  });

  const linkedIds = new Set((linkedQ.data ?? []).map((s: any) => s.upstream_id));

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset selection when the filtered list changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [debounced, categoryId]);

  const selectableRows = (availableQ.data?.rows ?? []).filter(
    (s: any) => !linkedIds.has(s.upstream_id),
  );

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(selectableRows.map((s: any) => s.upstream_id)));
  };
  const selectNone = () => setSelectedIds(new Set());

  const add = useMutation({
    mutationFn: (streamIds: string[]) =>
      addStreams({ data: { categoryId: category.id, streamIds } }),
    onSuccess: (_d, vars) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of vars) next.delete(id);
        return next;
      });
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
      <DialogContent className="w-[80vw] max-w-[80vw] sm:max-w-[80vw] h-[80vh] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage streams — {category.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)] gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Linked */}
          <div className="flex flex-col border border-border rounded-md overflow-hidden min-h-0">
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
                <ul>
                  {(linkedQ.data ?? []).map((s: any) => (
                    <li
                      key={s.upstream_id}
                      className="flex items-center gap-2 px-3 py-2 border-b border-border last:border-0 hover:bg-muted/30"
                    >
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
                      <span className="flex-1 truncate text-sm">{s.name}</span>
                      <Button size="sm" variant="ghost" onClick={() => remove.mutate(s.upstream_id)}>
                        <X className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Available */}
          <div className="flex border border-border rounded-md overflow-hidden min-h-0">
            {/* Category sidebar */}
            <div className="w-56 flex flex-col border-r border-border bg-muted/20 shrink-0">
              <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                <Switch
                  id="dlg-enabled-only"
                  checked={showEnabledCatsOnly}
                  onCheckedChange={setShowEnabledCatsOnly}
                />
                <label htmlFor="dlg-enabled-only" className="text-xs cursor-pointer">
                  Enabled only
                </label>
              </div>
              <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
                {!showEnabledCatsOnly && (
                  <Button
                    variant={categoryId === "all" ? "secondary" : "ghost"}
                    className="w-full justify-start font-normal text-left h-auto py-1.5 text-xs"
                    onClick={() => setCategoryId("all")}
                  >
                    <span className="flex-1 truncate">All Categories</span>
                  </Button>
                )}
                {categories.map((c: any) => (
                  <Button
                    key={c.upstream_id}
                    variant={categoryId === c.upstream_id ? "secondary" : "ghost"}
                    className="w-full justify-start font-normal text-left h-auto py-1.5 text-xs"
                    onClick={() => setCategoryId(c.upstream_id)}
                  >
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">{c.stream_count}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Streams list */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="px-3 py-2 bg-muted/50 border-b border-border space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-medium">
                    Available live streams ({selectableRows.length})
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectAll} disabled={selectableRows.length === 0}>
                      Select all
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectNone} disabled={selectedIds.size === 0}>
                      Select none
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      disabled={selectedIds.size === 0 || add.isPending}
                      onClick={() => add.mutate(Array.from(selectedIds))}
                    >
                      {add.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                      Add selected ({selectedIds.size})
                    </Button>
                  </div>
                </div>
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
                  <ul>
                    {(availableQ.data?.rows ?? []).map((s: any) => {
                      const isLinked = linkedIds.has(s.upstream_id);
                      const isSelected = selectedIds.has(s.upstream_id);
                      return (
                        <li
                          key={s.upstream_id}
                          className={`flex items-center gap-2 px-3 py-2 border-b border-border last:border-0 ${isLinked ? "opacity-60" : "hover:bg-muted/30 cursor-pointer"}`}
                          onClick={() => !isLinked && toggleSelected(s.upstream_id)}
                        >
                          <input
                            type="checkbox"
                            className="size-4 shrink-0 accent-primary"
                            checked={isSelected}
                            disabled={isLinked}
                            onChange={() => toggleSelected(s.upstream_id)}
                            onClick={(e) => e.stopPropagation()}
                          />
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
                          <span className="flex-1 truncate text-sm">{s.name}</span>
                          {isLinked && (
                            <span className="text-xs text-muted-foreground">Added</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
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
