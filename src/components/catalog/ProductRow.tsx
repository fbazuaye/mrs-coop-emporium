import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/lib/catalog-data";

export function ProductRow({
  eyebrow,
  title,
  icon: Icon,
  products,
  accent = false,
}: {
  eyebrow?: string;
  title: string;
  icon?: LucideIcon;
  products: Product[];
  accent?: boolean;
}) {
  return (
    <section className="space-y-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              {eyebrow}
            </div>
          )}
          <h2 className="mt-1 flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {Icon && (
              <span
                className={
                  accent
                    ? "grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-gold text-accent-foreground shadow-gold"
                    : "grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
                }
              >
                <Icon className="h-5 w-5" />
              </span>
            )}
            <span className="truncate">{title}</span>
          </h2>
        </div>
        <Link
          to="/shop"
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/5 sm:text-sm"
        >
          See all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
