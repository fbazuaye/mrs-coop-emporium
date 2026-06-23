import { Link } from "@tanstack/react-router";
import { Package, Plus } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import type { ProductWithImages } from "@/lib/products";

const formatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function DbProductCard({ product }: { product: ProductWithImages }) {
  const { add } = useCart();
  const primary = product.images?.find((i) => i.is_primary) ?? product.images?.[0];
  const price = Number(product.discount_price ?? product.price);
  const prev = product.discount_price ? Number(product.price) : undefined;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft transition hover:-translate-y-1 hover:shadow-premium">
      <Link
        to="/admin/products/$id"
        params={{ id: product.id }}
        className="relative block aspect-[4/3] overflow-hidden bg-muted"
      >
        {primary ? (
          <img
            src={primary.url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <Package className="h-10 w-10" />
          </div>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            add({
              id: product.id,
              name: product.name,
              price,
              prevPrice: prev,
              emoji: "🛍️",
              gradient: "from-primary/20 to-accent/20",
              category: product.category?.name ?? "Shop",
            });
          }}
          aria-label={`Add ${product.name} to cart`}
          className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-gradient-gold text-accent-foreground shadow-gold transition hover:scale-110 active:scale-95"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {product.category?.name ?? "Shop"}
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{product.name}</h3>
        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="font-display text-base font-bold text-primary">{formatter.format(price)}</div>
            {prev && (
              <div className="text-xs text-muted-foreground line-through">{formatter.format(prev)}</div>
            )}
          </div>
          {product.stock_quantity === 0 && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-destructive">
              Out of stock
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
