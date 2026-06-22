import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Radio, Square, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Container } from "@/components/layout/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { BrandButton } from "@/components/brand/BrandButton";
import {
  fetchAllSessions,
  createSession,
  updateSessionStatus,
  fetchSessionProducts,
  addSessionProduct,
  setSpotlight,
  removeSessionProduct,
  uploadLiveThumbnail,
  type LiveSession,
  type LiveProduct,
} from "@/lib/live";
import { fetchProducts, type ProductWithImages } from "@/lib/products";

export const Route = createFileRoute("/_authenticated/admin/live")({
  head: () => ({ meta: [{ title: "Live sessions — Admin" }] }),
  component: AdminLivePage,
});

function AdminLivePage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [allProducts, setAllProducts] = useState<ProductWithImages[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [items, setItems] = useState<LiveProduct[]>([]);
  const [form, setForm] = useState({
    title: "",
    host_name: "",
    description: "",
    stream_url: "",
    thumbnail_url: "",
  });
  const [uploading, setUploading] = useState(false);

  const onPickThumbnail = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadLiveThumbnail(file);
      setForm((f) => ({ ...f, thumbnail_url: url }));
      toast.success("Thumbnail uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const reload = () => fetchAllSessions().then(setSessions);

  useEffect(() => {
    reload();
    fetchProducts().then(setAllProducts);
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetchSessionProducts(selected).then(setItems);
  }, [selected]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      const s = await createSession({
        title: form.title,
        host_name: form.host_name || null,
        description: form.description || null,
        stream_url: form.stream_url || null,
        thumbnail_url: form.thumbnail_url || null,
      });
      toast.success("Session created");
      setForm({ title: "", host_name: "", description: "", stream_url: "", thumbnail_url: "" });
      await reload();
      setSelected(s.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const go = async (id: string, status: "live" | "ended" | "scheduled") => {
    await updateSessionStatus(id, status);
    toast.success(`Session ${status}`);
    reload();
  };

  const addProd = async (productId: string) => {
    if (!selected) return;
    try {
      await addSessionProduct({ sessionId: selected, productId });
      fetchSessionProducts(selected).then(setItems);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add");
    }
  };

  return (
    <Container>
      <div className="space-y-8 py-6">
        <SectionHeading eyebrow="MRS Live" title="Manage live sessions" subtitle="Create, schedule, and run live shopping sessions." />

        {/* Create */}
        <form onSubmit={create} className="space-y-3 rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
          <div className="text-sm font-semibold">New live session</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Host name" value={form.host_name} onChange={(e) => setForm({ ...form, host_name: e.target.value })} />
            <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:col-span-2" placeholder="Stream URL (HLS .m3u8, YouTube, or Vimeo)" value={form.stream_url} onChange={(e) => setForm({ ...form, stream_url: e.target.value })} />
            <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:col-span-2" placeholder="Thumbnail URL" value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} />
            <textarea className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <BrandButton type="submit" variant="primary" size="md"><Plus className="h-4 w-4" />Create</BrandButton>
        </form>

        {/* Sessions list */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-2">
            <div className="text-sm font-semibold">All sessions</div>
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s.id)}
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-sm transition ${
                  selected === s.id ? "border-primary bg-primary/5" : "border-border/60 bg-card hover:bg-muted"
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.host_name ?? "—"} · {s.status}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  s.status === "live" ? "bg-destructive text-destructive-foreground" :
                  s.status === "scheduled" ? "bg-accent-soft text-accent-foreground" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {s.status}
                </span>
              </button>
            ))}
            {sessions.length === 0 && <p className="text-sm text-muted-foreground">No sessions yet.</p>}
          </div>

          {/* Selected session detail */}
          <div className="space-y-4">
            {selected ? (() => {
              const s = sessions.find((x) => x.id === selected);
              if (!s) return null;
              return (
                <>
                  <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
                    <div className="flex items-center gap-2">
                      <h3 className="flex-1 font-semibold">{s.title}</h3>
                      {s.status !== "live" ? (
                        <BrandButton variant="primary" size="sm" onClick={() => go(s.id, "live")}>
                          <Radio className="h-4 w-4" /> Go live
                        </BrandButton>
                      ) : (
                        <BrandButton variant="outline" size="sm" onClick={() => go(s.id, "ended")}>
                          <Square className="h-4 w-4" /> End
                        </BrandButton>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Peak viewers: {s.viewer_peak}</p>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
                    <div className="mb-2 text-sm font-semibold">Featured products</div>
                    <div className="space-y-2">
                      {items.map((it) => (
                        <div key={it.id} className="flex items-center gap-2 rounded-lg border border-border/60 p-2 text-sm">
                          <div className="flex-1 truncate">{it.product?.name ?? it.product_id}</div>
                          {it.is_spotlight && <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold">Spotlight</span>}
                          {!it.is_spotlight && (
                            <button onClick={() => setSpotlight(selected!, it.id).then(() => fetchSessionProducts(selected!).then(setItems))} className="rounded p-1 text-primary hover:bg-primary/10" title="Set spotlight">
                              <Sparkles className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => removeSessionProduct(it.id).then(() => fetchSessionProducts(selected!).then(setItems))} className="rounded p-1 text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {items.length === 0 && <p className="text-xs text-muted-foreground">No products featured yet.</p>}
                    </div>
                    <div className="mt-3 border-t border-border/60 pt-3">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add product</div>
                      <select
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        onChange={(e) => {
                          if (e.target.value) {
                            addProd(e.target.value);
                            e.target.value = "";
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="">Select a product…</option>
                        {allProducts
                          .filter((p) => !items.some((i) => i.product_id === p.id))
                          .map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                </>
              );
            })() : (
              <p className="text-sm text-muted-foreground">Select a session to manage products.</p>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}
