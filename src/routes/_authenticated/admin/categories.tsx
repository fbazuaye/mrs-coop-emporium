import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
  type Category,
} from "@/lib/products";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: CategoriesPage,
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function CategoriesPage() {
  const [items, setItems] = useState<Category[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; slug: string; sort_order: number; is_active: boolean }>({
    name: "", slug: "", sort_order: 0, is_active: true,
  });
  const [creating, setCreating] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", slug: "" });

  async function load() {
    try { setItems(await fetchCategories()); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Load failed"); setItems([]); }
  }
  useEffect(() => { void load(); }, []);

  async function handleCreate() {
    if (!newCat.name.trim()) return;
    try {
      await createCategory({
        name: newCat.name.trim(),
        slug: (newCat.slug || slugify(newCat.name)).trim(),
        description: null, icon: null,
        sort_order: (items?.length ?? 0) + 1,
        is_active: true,
      });
      toast.success("Category added");
      setNewCat({ name: "", slug: "" });
      setCreating(false);
      void load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  function startEdit(c: Category) {
    setEditingId(c.id);
    setDraft({ name: c.name, slug: c.slug, sort_order: c.sort_order, is_active: c.is_active });
  }

  async function saveEdit(id: string) {
    try {
      await updateCategory(id, draft);
      toast.success("Saved");
      setEditingId(null);
      void load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
  }

  async function handleDelete(c: Category) {
    if (!confirm(`Delete category "${c.name}"? Products will become uncategorised.`)) return;
    try { await deleteCategory(c.id); toast.success("Deleted"); void load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {!creating ? (
          <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Add category</Button>
        ) : null}
      </div>

      {creating && (
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</label>
              <Input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Slug (optional)</label>
              <Input value={newCat.slug} onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })} placeholder={slugify(newCat.name)} className="mt-1.5" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setCreating(false); setNewCat({ name: "", slug: "" }); }}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        {items === null ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No categories yet.</div>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((c) => {
              const editing = editingId === c.id;
              return (
                <li key={c.id} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_140px_100px_120px]">
                  {editing ? (
                    <>
                      <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                      <Input className="hidden sm:block" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
                      <div className="hidden items-center gap-2 sm:flex">
                        <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
                        <span className="text-xs">{draft.is_active ? "Active" : "Hidden"}</span>
                      </div>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => saveEdit(c.id)}><Save className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{c.name}</div>
                        <div className="truncate text-xs text-muted-foreground">/{c.slug}</div>
                      </div>
                      <div className="hidden text-sm text-muted-foreground sm:block">{c.slug}</div>
                      <div className="hidden text-xs sm:block">
                        <span className={c.is_active ? "text-emerald-600" : "text-muted-foreground"}>
                          {c.is_active ? "Active" : "Hidden"}
                        </span>
                      </div>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
