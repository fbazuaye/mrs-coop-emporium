import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ShoppingBag, Search } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Input } from "@/components/ui/input";
import { DbProductCard } from "@/components/catalog/DbProductCard";
import { fetchProducts, type ProductWithImages } from "@/lib/products";
import { toast } from "sonner";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — MRS Staff Coop Store" },
      {
        name: "description",
        content:
          "Browse the cooperative catalog. Curated essentials with members-only pricing.",
      },
      { property: "og:title", content: "Shop — MRS Staff Coop Store" },
      { property: "og:url", content: "/shop" },
    ],
    links: [{ rel: "canonical", href: "/shop" }],
  }),
  component: ShopPage,
});

function ShopPage() {
  const [products, setProducts] = useState<ProductWithImages[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchProducts()
      .then((rows) => setProducts(rows.filter((p) => p.is_active)))
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Failed to load products");
        setProducts([]);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category?.name ?? "").toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q),
    );
  }, [products, query]);

  return (
    <Container>
      <div className="space-y-8 py-6 sm:py-10">
        <SectionHeading
          eyebrow="Catalog"
          title="Shop the cooperative"
          subtitle="Members-only pricing on essentials, fresh stock and seasonal picks."
        />

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products"
            className="pl-9"
          />
        </div>

        {products === null ? (
          <div className="py-20 text-center text-sm text-muted-foreground">Loading products…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-7 w-7" />}
            title={query ? "No matches" : "No products yet"}
            description={
              query
                ? "Try a different search term."
                : "Products added in the admin will appear here."
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {filtered.map((p) => (
              <DbProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
