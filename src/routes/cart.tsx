import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingCart, Trash2, ArrowRight, Truck } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { EmptyState } from "@/components/common/EmptyState";
import { BrandButton } from "@/components/brand/BrandButton";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/catalog-data";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Cart — MRS Staff Coop Store" },
      { name: "description", content: "Review the items in your MRS Coop shopping cart." },
      { property: "og:title", content: "Cart — MRS Staff Coop Store" },
      { property: "og:url", content: "/cart" },
    ],
    links: [{ rel: "canonical", href: "/cart" }],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, subtotal, deliveryFee, total, increment, decrement, remove, clear } = useCart();

  if (items.length === 0) {
    return (
      <Container>
        <div className="space-y-8 py-6 sm:py-10">
          <header className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Your bag
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Shopping cart
            </h1>
          </header>
          <EmptyState
            icon={<ShoppingCart className="h-7 w-7" />}
            title="Your cart is empty"
            description="Browse the catalog and add items to get started."
            action={
              <Link to="/shop">
                <BrandButton>Start shopping</BrandButton>
              </Link>
            }
          />
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6 py-6 sm:py-10">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Your bag
            </div>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Shopping cart ({items.length})
            </h1>
          </div>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
          >
            Clear all
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-soft sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:gap-4 sm:p-4"
              >
                <div
                  className={`grid aspect-square place-items-center overflow-hidden rounded-xl bg-gradient-to-br ${item.gradient ?? "from-muted to-muted/50"}`}
                >
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl sm:text-4xl">{item.emoji ?? "🛍️"}</span>
                  )}
                </div>
                <div className="min-w-0">
                  {item.category && (
                    <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                      {item.category}
                    </div>
                  )}
                  <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
                    {item.name}
                  </h3>
                  <div className="mt-1 font-display text-sm font-bold text-primary sm:text-base">
                    {formatPrice(item.price)}
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 p-0.5">
                    <button
                      type="button"
                      onClick={() => decrement(item.id)}
                      aria-label="Decrease quantity"
                      className="grid h-7 w-7 place-items-center rounded-full text-foreground transition hover:bg-card"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-6 text-center text-sm font-semibold tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => increment(item.id)}
                      aria-label="Increase quantity"
                      className="grid h-7 w-7 place-items-center rounded-full text-foreground transition hover:bg-card"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="font-display text-sm font-bold text-foreground sm:text-base">
                    {formatPrice(item.price * item.quantity)}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-premium">
              <h2 className="font-display text-lg font-semibold text-foreground">Cart summary</h2>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="font-semibold text-foreground tabular-nums">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Delivery fee</dt>
                  <dd className="font-semibold text-foreground tabular-nums">
                    {deliveryFee === 0 ? "Free" : formatPrice(deliveryFee)}
                  </dd>
                </div>
                <div className="my-3 h-px bg-border" />
                <div className="flex items-baseline justify-between">
                  <dt className="font-semibold text-foreground">Total</dt>
                  <dd className="font-display text-xl font-bold text-primary tabular-nums">
                    {formatPrice(total)}
                  </dd>
                </div>
              </dl>
              {deliveryFee > 0 && (
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                  <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  Add {formatPrice(50000 - subtotal)} more to unlock free delivery.
                </p>
              )}
              <Link to="/checkout" className="mt-5 block">
                <BrandButton className="w-full">
                  Proceed to checkout
                  <ArrowRight className="h-4 w-4" />
                </BrandButton>
              </Link>
              <Link
                to="/shop"
                className="mt-2 block text-center text-xs font-semibold text-muted-foreground hover:text-primary"
              >
                Continue shopping
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </Container>
  );
}
