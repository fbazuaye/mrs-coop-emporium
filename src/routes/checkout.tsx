import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Wallet, CreditCard, CheckCircle2, ArrowLeft, Lock, Truck, MapPin, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Container } from "@/components/layout/Container";
import { BrandButton } from "@/components/brand/BrandButton";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { formatPrice } from "@/lib/catalog-data";
import { createOrder } from "@/lib/orders";
import { quoteDelivery, type DeliveryQuote } from "@/lib/delivery.functions";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — MRS Staff Coop Store" },
      { name: "description", content: "Complete your order with pay now or buy on credit." },
      { property: "og:title", content: "Checkout — MRS Staff Coop Store" },
      { property: "og:url", content: "/checkout" },
    ],
    links: [{ rel: "canonical", href: "/checkout" }],
  }),
  component: CheckoutPage,
});

type PaymentMethod = "pay_now" | "credit";

function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState<PaymentMethod>("pay_now");
  const [placing, setPlacing] = useState(false);
  const [form, setForm] = useState({
    fullName: (user?.user_metadata?.full_name as string) ?? "",
    phone: (user?.user_metadata?.phone as string) ?? "",
    address: "",
    city: "",
    notes: "",
  });

  const quoteFn = useServerFn(quoteDelivery);
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Debounced auto-quote when address (+ optional city) changes
  const fullAddress = useMemo(() => {
    const a = form.address.trim();
    const c = form.city.trim();
    if (!a) return "";
    return c ? `${a}, ${c}` : a;
  }, [form.address, form.city]);

  useEffect(() => {
    if (!fullAddress || fullAddress.length < 5) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    setQuoteError(null);
    const t = setTimeout(async () => {
      try {
        const q = await quoteFn({ data: { address: fullAddress } });
        if (!cancelled) setQuote(q);
      } catch (err: any) {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(err?.message ?? "Could not calculate delivery");
        }
      } finally {
        if (!cancelled) setQuoting(false);
      }
    }, 800);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [fullAddress, quoteFn]);

  const deliveryFee = quote?.fee ?? 0;
  const total = subtotal + deliveryFee;

  if (items.length === 0) {
    return (
      <Container>
        <div className="space-y-4 py-10 text-center">
          <h1 className="font-display text-2xl font-semibold text-foreground">Your cart is empty</h1>
          <p className="text-sm text-muted-foreground">Add items before checking out.</p>
          <Link to="/shop">
            <BrandButton>Go to shop</BrandButton>
          </Link>
        </div>
      </Container>
    );
  }

  const update = <K extends keyof typeof form>(key: K, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canPlace =
    form.fullName.trim() && form.phone.trim() && form.address.trim() && form.city.trim() && quote;

  const placeOrder = async () => {
    if (!canPlace || !quote) {
      toast.error(quote ? "Please complete delivery details" : "Waiting for delivery quote");
      return;
    }
    if (!user) {
      toast.error("Please sign in to place an order");
      void navigate({ to: "/auth" });
      return;
    }
    setPlacing(true);
    try {
      const order = await createOrder({
        user_id: user.id,
        payment_method: method,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        full_name: form.fullName,
        phone: form.phone,
        address: form.address,
        city: form.city,
        notes: form.notes || undefined,
        dest_lat: quote.destination.lat,
        dest_lng: quote.destination.lng,
        delivery_distance_m: quote.distanceMeters,
        delivery_duration_s: quote.durationSeconds,
        items: items.map((i) => ({
          product_id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          image: i.image,
          emoji: i.emoji,
          gradient: i.gradient,
          category: i.category,
        })),
      });
      await clear();
      toast.success(`Order ${order.order_number} placed`);
      void navigate({ to: "/orders" });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not place order");
    } finally {
      setPlacing(false);
    }
  };


  return (
    <Container>
      <div className="space-y-6 py-6 sm:py-10">
        <header className="space-y-1">
          <Link
            to="/cart"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to cart
          </Link>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Checkout
          </h1>
          <p className="text-sm text-muted-foreground">
            Confirm delivery details and choose how you'd like to pay.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            {/* Delivery details */}
            <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft sm:p-6">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <h2 className="font-display text-base font-semibold text-foreground">Delivery details</h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Full name" value={form.fullName} onChange={(v) => update("fullName", v)} />
                <Field
                  label="Phone number"
                  value={form.phone}
                  onChange={(v) => update("phone", v)}
                  type="tel"
                  placeholder="080..."
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Delivery address"
                    value={form.address}
                    onChange={(v) => update("address", v)}
                    placeholder="Street, area, landmark"
                  />
                </div>
                <Field label="City / LGA" value={form.city} onChange={(v) => update("city", v)} />
                <Field
                  label="Notes (optional)"
                  value={form.notes}
                  onChange={(v) => update("notes", v)}
                  placeholder="Gate code, drop-off, etc."
                />
              </div>
            </section>

            {/* Payment options */}
            <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft sm:p-6">
              <h2 className="font-display text-base font-semibold text-foreground">
                Payment method
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <PaymentOption
                  active={method === "pay_now"}
                  onClick={() => setMethod("pay_now")}
                  icon={<Wallet className="h-5 w-5" />}
                  title="Pay Now"
                  description="Card, transfer or USSD — instant confirmation"
                  badge="Recommended"
                />
                <PaymentOption
                  active={method === "credit"}
                  onClick={() => setMethod("credit")}
                  icon={<CreditCard className="h-5 w-5" />}
                  title="Buy On Credit"
                  description="Use your member credit line — repay from payroll"
                  badge="Members only"
                />
              </div>

              {method === "credit" && !user && (
                <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  You need to{" "}
                  <Link to="/auth" className="font-semibold underline">
                    sign in
                  </Link>{" "}
                  as a cooperative member to use credit.
                </p>
              )}
            </section>
          </div>

          {/* Summary */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-premium">
              <h2 className="font-display text-lg font-semibold text-foreground">Order summary</h2>
              <ul className="mt-4 space-y-3 border-b border-border pb-4">
                {items.map((item) => (
                  <li key={item.id} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3">
                    <div
                      className={`grid aspect-square place-items-center overflow-hidden rounded-lg bg-gradient-to-br ${item.gradient ?? "from-muted to-muted/50"}`}
                    >
                      <span className="text-lg">{item.emoji ?? "🛍️"}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-foreground">{item.name}</div>
                      <div className="text-[11px] text-muted-foreground">Qty {item.quantity}</div>
                    </div>
                    <div className="text-xs font-semibold tabular-nums text-foreground">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="font-semibold tabular-nums text-foreground">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Delivery fee</dt>
                  <dd className="font-semibold tabular-nums text-foreground">
                    {quoting ? (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Calculating…
                      </span>
                    ) : quote ? (
                      formatPrice(deliveryFee)
                    ) : (
                      <span className="text-muted-foreground">Enter address</span>
                    )}
                  </dd>
                </div>
                {quote && (
                  <div className="rounded-xl bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1.5">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                      <span className="truncate">{quote.formattedAddress}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {(quote.distanceMeters / 1000).toFixed(1)} km from store
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        ~{Math.max(1, Math.round(quote.durationSeconds / 60))} min
                      </span>
                    </div>
                  </div>
                )}
                {quoteError && (
                  <div className="rounded-xl bg-rose-50 p-2 text-[11px] text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                    {quoteError}
                  </div>
                )}

                <div className="my-3 h-px bg-border" />
                <div className="flex items-baseline justify-between">
                  <dt className="font-semibold text-foreground">Total</dt>
                  <dd className="font-display text-xl font-bold text-primary tabular-nums">
                    {formatPrice(total)}
                  </dd>
                </div>
              </dl>

              <BrandButton
                onClick={placeOrder}
                disabled={placing}
                className="mt-5 w-full"
                variant={method === "credit" ? "gold" : "primary"}
              >
                {placing ? (
                  "Processing..."
                ) : method === "pay_now" ? (
                  <>
                    <Lock className="h-4 w-4" />
                    Pay {formatPrice(total)}
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Submit credit request
                  </>
                )}
              </BrandButton>

              <p className="mt-3 flex items-start gap-2 text-[11px] text-muted-foreground">
                <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                Your information is encrypted and used only to fulfill this order.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </Container>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-foreground">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-ring/30"
      />
    </label>
  );
}

function PaymentOption({
  active,
  onClick,
  icon,
  title,
  description,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border-2 p-4 text-left transition",
        active
          ? "border-primary bg-primary/5 shadow-soft"
          : "border-border bg-card hover:border-primary/40",
      )}
    >
      <div
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
          active ? "bg-gradient-burgundy text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badge && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <CheckCircle2
        className={cn("h-5 w-5 shrink-0 transition", active ? "text-primary" : "text-transparent")}
      />
    </button>
  );
}
