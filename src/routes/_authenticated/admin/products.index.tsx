import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, AlertTriangle, Pencil, Trash2, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  deleteProduct,
  fetchProducts,
  formatStock,
  type ProductWithImages,
} from "@/lib/products-ui";

export const Route = createFileRoute("/_authenticated/admin/products/")({
  component: ProductsListPage,
});

function ProductsListPage() {
  const [products, setProducts] = useState<ProductWithImages[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");

  async function load() {
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load products");
      setProducts([]);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (filter === "low" && p.stock_quantity > p.low_stock_threshold) return false;
      if (filter === "out" && p.stock_quantity !== 0) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, query, filter]);

  const lowCount = products?.filter((p) => p.stock_quantity <= p.low_stock_threshold).length ?? 0;
  const outCount = products?.filter((p) => p.stock_quantity === 0).length ?? 0;

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct(id);
      toast.success("Product deleted");
      setProducts((p) => p?.filter((x) => x.id !== id) ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total products" value={products?.length ?? 0} icon={<Package className="h-5 w-5" />} />
        <StatCard label="Low stock" value={lowCount} icon={<AlertTriangle className="h-5 w-5" />} tone="warn" onClick={() => setFilter("low")} />
        <StatCard label="Out of stock" value={outCount} icon={<AlertTriangle className="h-5 w-5" />} tone="danger" onClick={() => setFilter("out")} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, SKU or category" className="pl-9" />
        </div>
        <div className="flex gap-1 rounded-full border border-border bg-card p-1">
          {(["all", "low", "out"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f === "all" ? "All" : f === "low" ? "Low stock" : "Out of stock"}
            </button>
          ))}
        </div>
        <Link to="/admin/products/new">
          <Button><Plus className="h-4 w-4" /> Add product</Button>
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="hidden grid-cols-[1fr_120px_120px_110px_120px_100px] gap-3 border-b border-border/60 bg-muted/40 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
          <div>Product</div>
          <div>SKU</div>
          <div>Category</div>
          <div>Price</div>
          <div>Stock</div>
          <div className="text-right">Actions</div>
        </div>
        {products === null ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No products found.</div>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((p) => {
              const primary = p.images?.find((i) => i.is_primary) ?? p.images?.[0];
              const stockState = formatStock(p);
              return (
                <li
                  key={p.id}
                  className="grid grid-cols-[64px_1fr_auto] items-center gap-3 px-4 py-3 md:grid-cols-[1fr_120px_120px_110px_120px_100px]"
                >
                  <div className="flex items-center gap-3 md:col-span-1">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                      {primary ? (
                        <img src={primary.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-muted-foreground">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link to="/admin/products/$id" params={{ id: p.id }} className="block truncate text-sm font-semibold hover:underline">
                        {p.name}
                      </Link>
                      <div className="flex gap-1.5 md:hidden">
                        <span className="text-xs text-muted-foreground">{p.sku}</span>
                      </div>
                    </div>
                  </div>
                  <div className="hidden text-sm text-muted-foreground md:block">{p.sku}</div>
                  <div className="hidden text-sm text-muted-foreground md:block">{p.category?.name ?? "—"}</div>
                  <div className="hidden text-sm font-medium md:block">₦{Number(p.price).toLocaleString()}</div>
                  <div className="hidden md:block">
                    <Badge variant={stockState.tone === "danger" ? "destructive" : stockState.tone === "warn" ? "default" : "secondary"} className={stockState.tone === "warn" ? "bg-amber-500 text-white hover:bg-amber-500" : ""}>
                      {stockState.label}
                    </Badge>
                  </div>
                  <div className="flex justify-end gap-1">
                    <Link to="/admin/products/$id" params={{ id: p.id }}>
                      <Button size="icon" variant="ghost" title="Edit"><Pencil className="h-4 w-4" /></Button>
                    </Link>
                    <Button size="icon" variant="ghost" title="Delete" onClick={() => handleDelete(p.id, p.name)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon, tone, onClick,
}: { label: string; value: number; icon: React.ReactNode; tone?: "warn" | "danger"; onClick?: () => void }) {
  const toneClass =
    tone === "danger" ? "border-destructive/40 bg-destructive/5 text-destructive"
    : tone === "warn" ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
    : "border-border/60 bg-card";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between gap-4 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${toneClass}`}
    >
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</div>
        <div className="mt-1 font-display text-2xl font-semibold">{value}</div>
      </div>
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-background/60">{icon}</div>
    </button>
  );
}
