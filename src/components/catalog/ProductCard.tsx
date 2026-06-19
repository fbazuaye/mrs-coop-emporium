import { Plus, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice, type Product } from "@/lib/catalog-data";

export function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft transition hover:-translate-y-1 hover:shadow-premium",
      )}
    >
      <div
        className={cn(
          "relative grid place-items-center bg-gradient-to-br",
          product.gradient,
          compact ? "aspect-square" : "aspect-[4/3]",
        )}
      >
        <span className="text-5xl drop-shadow-sm sm:text-6xl" aria-hidden>
          {product.emoji}
        </span>
        {product.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-gradient-burgundy px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-burgundy">
            {product.badge}
          </span>
        )}
        <button
          type="button"
          aria-label={`Add ${product.name} to cart`}
          className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-gradient-gold text-accent-foreground shadow-gold transition hover:scale-110 active:scale-95"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {product.category}
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
          {product.name}
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="font-display text-base font-bold text-primary">
              {formatPrice(product.price)}
            </div>
            {product.prevPrice && (
              <div className="text-xs text-muted-foreground line-through">
                {formatPrice(product.prevPrice)}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            <span className="font-medium text-foreground">{product.rating}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
