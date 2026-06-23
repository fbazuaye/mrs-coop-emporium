import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Wallet,
  CreditCard,
  Truck,
  Radio,
  Tag,
  Zap,
  Star,
  Sparkles,
  Clock,
  PlayCircle,
  Users,
  Plus,
} from "lucide-react";
import { Container } from "@/components/layout/Container";

import { ProductRow } from "@/components/catalog/ProductRow";
import { DbProductCard } from "@/components/catalog/DbProductCard";
import {
  CATEGORIES,
  FEATURED,
  FLASH_DEALS,
  TOP_SELLING,
  formatPrice,
} from "@/lib/catalog-data";
import heroAsset from "@/assets/hero-pineapple.png.asset.json";
import { useCart } from "@/hooks/use-cart";
import { fetchActiveSessions, type LiveSession } from "@/lib/live";
import { fetchProducts, type ProductWithImages } from "@/lib/products";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MRS Staff Coop Store — Quality products, great prices, delivered to you" },
      {
        name: "description",
        content:
          "Shop groceries, beverages, electronics, household, agro, pharmacy and personal care at members-only prices. Pay now or buy on credit, with fast delivery and live shopping.",
      },
      { property: "og:title", content: "MRS Staff Coop Store" },
      {
        property: "og:description",
        content:
          "Quality products, great prices, delivered to you. The official MRS Staff Cooperative Society store.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

const BENEFITS = [
  { icon: Wallet, label: "Pay Now", desc: "Card, transfer, USSD" },
  { icon: CreditCard, label: "Buy On Credit", desc: "Member credit lines" },
  { icon: Truck, label: "Fast Delivery", desc: "Same-day options" },
  { icon: Radio, label: "Live Shopping", desc: "Shop while you watch" },
  { icon: Tag, label: "Best Deals", desc: "Members-only pricing" },
];

function HomePage() {
  return (
    <div className="space-y-12 py-4 sm:space-y-16 sm:py-8">
      {/* Hero */}
      <Container>
        <section className="overflow-hidden rounded-3xl shadow-burgundy">
          <Link to="/shop" aria-label="Shop now">
            <img
              src={heroAsset.url}
              alt="Quality products, great prices, delivered to you"
              className="block h-auto w-full"
            />
          </Link>
        </section>
      </Container>

      {/* Service Benefits */}
      <Container>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {BENEFITS.map((b) => (
            <div
              key={b.label}
              className="group rounded-2xl border border-border/60 bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-premium"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-burgundy text-primary-foreground shadow-burgundy transition group-hover:scale-110">
                <b.icon className="h-5 w-5" />
              </div>
              <div className="mt-3 text-sm font-semibold text-foreground">{b.label}</div>
              <div className="text-xs text-muted-foreground">{b.desc}</div>
            </div>
          ))}
        </div>
      </Container>

      {/* Categories */}
      <Container>
        <section className="space-y-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                Browse
              </div>
              <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Shop by category
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                to="/shop"
                className="group relative overflow-hidden rounded-2xl border border-border/60 shadow-soft transition hover:-translate-y-1 hover:shadow-premium"
              >
                {/* Card background image or gradient placeholder */}
                <div className="relative aspect-[4/5] w-full overflow-hidden">
                  {c.image ? (
                    <img
                      src={c.image}
                      alt={c.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full flex-col items-center justify-center gap-4 bg-gradient-to-br ${c.tint}`}
                    >
                      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-card/80 text-primary shadow-soft backdrop-blur-sm">
                        <c.icon className="h-8 w-8" />
                      </div>
                    </div>
                  )}

                  {/* Bottom gradient overlay for text readability */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                  {/* Category name */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                      {c.image ? "Category" : "Browse"}
                    </div>
                    <div className="mt-0.5 text-sm font-bold text-white sm:text-base">
                      {c.name}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </Container>

      {/* Flash Deals strip */}
      <Container>
        <section className="space-y-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-gradient-burgundy p-4 text-primary-foreground sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-gold text-accent-foreground shadow-gold">
                <Zap className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="font-display text-lg font-bold sm:text-xl">Flash Deals</div>
                <div className="flex items-center gap-1.5 text-xs text-primary-foreground/80">
                  <Clock className="h-3.5 w-3.5" />
                  Ends in 04:32:17
                </div>
              </div>
            </div>
            <Link
              to="/shop"
              className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur transition hover:bg-white/20 sm:text-sm"
            >
              See all
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {FLASH_DEALS.map((p) => (
              <FlashDealCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      </Container>

      {/* Featured */}
      <Container>
        <ProductRow
          eyebrow="Handpicked"
          title="Featured Products"
          icon={Sparkles}
          products={FEATURED}
        />
      </Container>

      {/* Top Selling */}
      <Container>
        <ProductRow
          eyebrow="Member favorites"
          title="Top Selling"
          icon={Star}
          products={TOP_SELLING}
          accent
        />
      </Container>

      {/* Recently Added (from database) */}
      <Container>
        <RecentlyAddedFromDb />
      </Container>

      {/* Live Shopping Preview */}
      <Container>
        <LiveShoppingPreview />
      </Container>
    </div>
  );
}

function RecentlyAddedFromDb() {
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  useEffect(() => {
    fetchProducts()
      .then((rows) => setProducts(rows.filter((p) => p.is_active).slice(0, 8)))
      .catch(() => null);
  }, []);
  if (products.length === 0) return null;
  return (
    <section className="space-y-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Fresh on the shelves
          </div>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Recently Added
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
          <DbProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

function FlashDealCard({ product }: { product: (typeof FLASH_DEALS)[number] }) {
  const { add } = useCart();
  const discount = product.prevPrice
    ? Math.round(((product.prevPrice - product.price) / product.prevPrice) * 100)
    : 0;
  return (
    <article className="group overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft transition hover:-translate-y-1 hover:shadow-premium">
      <div className={`relative aspect-square bg-gradient-to-br ${product.gradient} grid place-items-center`}>
        <span className="text-5xl drop-shadow-sm sm:text-6xl">{product.emoji}</span>
        {discount > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-destructive px-2.5 py-1 text-[10px] font-bold text-destructive-foreground shadow-md">
            -{discount}%
          </span>
        )}
      </div>
      <div className="space-y-2 p-3 sm:p-4">
        <h3 className="line-clamp-2 text-xs font-semibold text-foreground sm:text-sm">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-sm font-bold text-primary sm:text-base">
            {formatPrice(product.price)}
          </span>
          {product.prevPrice && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(product.prevPrice)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            add({
              id: product.id,
              name: product.name,
              price: product.price,
              prevPrice: product.prevPrice,
              emoji: product.emoji,
              gradient: product.gradient,
              category: product.category,
            })
          }
          className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary/10 py-2 text-xs font-semibold text-primary transition hover:bg-gradient-burgundy hover:text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          Add to cart
        </button>
      </div>
    </article>
  );
}

function LiveShoppingPreview() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  useEffect(() => {
    fetchActiveSessions().then(setSessions).catch(() => null);
  }, []);

  if (sessions.length === 0) return null;

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            MRS Live
          </div>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Live now — shop while you watch
          </h2>
        </div>
        <Link to="/live" className="shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground">
          See all
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.slice(0, 3).map((s) => (
          <Link
            key={s.id}
            to="/live/$sessionId"
            params={{ sessionId: s.id }}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft transition hover:-translate-y-1 hover:shadow-premium"
          >
            <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary-deep via-primary to-primary-deep">
              {s.thumbnail_url ? (
                <img src={s.thumbnail_url} alt={s.title} className="h-full w-full object-cover transition group-hover:scale-105" />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(244,180,0,0.25),transparent_55%)]" />
              )}
              <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-destructive-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive-foreground" />
                Live
              </span>
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
                <Users className="h-3 w-3" />
                {s.viewer_peak}
              </span>
              <div className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
                <PlayCircle className="h-14 w-14 text-white drop-shadow-lg" />
              </div>
            </div>
            <div className="p-3">
              <div className="line-clamp-1 text-sm font-semibold">{s.title}</div>
              <div className="text-xs text-muted-foreground">{s.host_name ?? "MRS Coop Live"}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
