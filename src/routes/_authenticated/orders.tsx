import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Package, Search, ShoppingBag, Wallet, Truck, CheckCircle2 } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchMyOrders,
  fetchOrderItems,
  formatNaira,
  ORDER_STATUSES,
  STATUS_LABELS,
  STATUS_TONE,
  type Order,
  type OrderItem,
  type OrderStatus,
} from "@/lib/orders";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "My Orders — MRS Staff Coop" },
      { name: "description", content: "Track your orders and delivery status." },
    ],
  }),
  component: OrdersPage,
});

type StatusFilter = "all" | "active" | "delivered" | "cancelled" | OrderStatus;
type DateRange = "all" | "7d" | "30d" | "90d";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const DATE_FILTERS: { value: DateRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

function withinRange(d: string, r: DateRange): boolean {
  if (r === "all") return true;
  const days = r === "7d" ? 7 : r === "30d" ? 30 : 90;
  const cutoff = Date.now() - days * 86400_000;
  return new Date(d).getTime() >= cutoff;
}

function matchesStatus(s: OrderStatus, f: StatusFilter): boolean {
  if (f === "all") return true;
  if (f === "active") return s !== "delivered" && s !== "cancelled";
  if (f === "delivered") return s === "delivered";
  if (f === "cancelled") return s === "cancelled";
  return s === f;
}

function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateRange>("all");
  const [active, setActive] = useState<Order | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    fetchMyOrders(user.id)
      .then((rows) => !cancelled && setOrders(rows))
      .catch((err) => {
        console.error(err);
        toast.error("Could not load orders");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const stats = useMemo(() => {
    const total = orders.length;
    const active = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const spend = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + Number(o.total), 0);
    return { total, active, delivered, spend };
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders
      .filter((o) => matchesStatus(o.status, statusFilter))
      .filter((o) => withinRange(o.created_at, dateFilter))
      .filter((o) => {
        if (!q) return true;
        return (
          o.order_number.toLowerCase().includes(q) ||
          STATUS_LABELS[o.status].toLowerCase().includes(q) ||
          o.city.toLowerCase().includes(q)
        );
      });
  }, [orders, query, statusFilter, dateFilter]);

  return (
    <Container>
      <div className="space-y-6 py-6 sm:py-10">
        <header>
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Orders</div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">My order history</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every order you've placed, with full delivery tracking.</p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Package className="h-5 w-5" />} label="Total orders" value={String(stats.total)} />
          <Stat icon={<Truck className="h-5 w-5" />} label="In progress" value={String(stats.active)} />
          <Stat icon={<CheckCircle2 className="h-5 w-5" />} label="Delivered" value={String(stats.delivered)} />
          <Stat icon={<Wallet className="h-5 w-5" />} label="Lifetime spend" value={formatNaira(stats.spend)} />
        </section>

        <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by order number, status, city…"
                className="h-10 w-full rounded-full border border-input bg-muted/60 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-hidden focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateRange)}
              className="h-10 rounded-full border border-input bg-background px-4 text-xs font-semibold"
            >
              {DATE_FILTERS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === f.value
                    ? "bg-gradient-burgundy text-primary-foreground shadow-burgundy"
                    : "border border-border bg-background hover:bg-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
            <div className="mx-1 h-6 w-px self-center bg-border" />
            {ORDER_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                  statusFilter === s
                    ? "bg-foreground text-background"
                    : "border border-border bg-background hover:bg-muted"
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {orders.length === 0 ? "You haven't placed any orders yet." : "No orders match these filters."}
            </p>
            {orders.length === 0 && (
              <Link to="/shop" className="mt-4 inline-flex rounded-xl bg-gradient-burgundy px-4 py-2 text-sm font-semibold text-primary-foreground shadow-burgundy">
                Start shopping
              </Link>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((o) => (
              <li
                key={o.id}
                onClick={() => setActive(o)}
                className="cursor-pointer rounded-2xl border border-border/60 bg-card p-4 shadow-soft transition hover:border-primary/40 hover:shadow-premium"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">{o.order_number}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_TONE[o.status]}`}>
                        {STATUS_LABELS[o.status]}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">
                        {o.payment_method === "credit" ? "Credit" : "Paid"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString()} · {o.city}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg font-bold text-primary">{formatNaira(Number(o.total))}</div>
                    <div className="mt-1 flex items-center justify-end gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {o.status !== "delivered" && o.status !== "cancelled" && (
                        <Link
                          to="/track/$orderId"
                          params={{ orderId: o.id }}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-full bg-gradient-burgundy px-2.5 py-1 font-semibold text-primary-foreground"
                        >
                          Track live
                        </Link>
                      )}
                      <span>View details →</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {active && <OrderDrawer order={active} onClose={() => setActive(null)} />}
    </Container>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-2 font-display text-xl font-bold text-foreground">{value}</div>
    </div>
  );
}

export function OrderDrawer({ order, onClose }: { order: Order; onClose: () => void }) {
  const [items, setItems] = useState<OrderItem[]>([]);
  useEffect(() => {
    void fetchOrderItems(order.id).then(setItems).catch(console.error);
  }, [order.id]);

  const currentIdx = ORDER_STATUSES.indexOf(order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-y-auto bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Order</div>
            <h2 className="mt-1 font-display text-xl font-semibold">{order.order_number}</h2>
            <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</div>
          </div>
          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase ${STATUS_TONE[order.status]}`}>
            {STATUS_LABELS[order.status]}
          </span>
        </div>

        {!isCancelled && (
          <ol className="mt-6 space-y-3">
            {ORDER_STATUSES.map((s, idx) => {
              const done = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <li key={s} className="flex items-center gap-3">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                      done ? "bg-gradient-burgundy text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className={`text-sm ${isCurrent ? "font-semibold text-foreground" : done ? "text-foreground" : "text-muted-foreground"}`}>
                    {STATUS_LABELS[s]}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-6 rounded-xl border border-border/60 bg-card p-4 text-sm">
          <div className="text-[10px] font-semibold uppercase text-muted-foreground">Delivery</div>
          <div className="mt-1 font-medium">{order.full_name} · {order.phone}</div>
          <div className="text-muted-foreground">{order.address}, {order.city}</div>
          {order.notes && <div className="mt-2 text-xs text-muted-foreground">Note: {order.notes}</div>}
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold">Items ({items.length})</h3>
          <ul className="mt-2 divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 p-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br ${i.gradient ?? "from-muted to-muted/50"}`}>
                  <span className="text-lg">{i.emoji ?? "🛍️"}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{i.name}</div>
                  <div className="text-[11px] text-muted-foreground">Qty {i.quantity} · {formatNaira(Number(i.price))}</div>
                </div>
                <div className="text-sm font-semibold tabular-nums">{formatNaira(Number(i.price) * i.quantity)}</div>
              </li>
            ))}
          </ul>
        </div>

        <dl className="mt-6 space-y-2 rounded-xl bg-muted/50 p-4 text-sm">
          <Row label="Subtotal" value={formatNaira(Number(order.subtotal))} />
          <Row label="Delivery fee" value={Number(order.delivery_fee) === 0 ? "Free" : formatNaira(Number(order.delivery_fee))} />
          <Row label="Payment" value={order.payment_method === "credit" ? "Credit" : "Paid"} />
          <div className="my-2 h-px bg-border" />
          <Row label="Total" value={formatNaira(Number(order.total))} bold />
        </dl>

        {order.status_history && order.status_history.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold">Timeline</h3>
            <ul className="mt-2 space-y-1 rounded-xl border border-border/60 bg-card p-3 text-xs text-muted-foreground">
              {order.status_history.map((h, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="font-medium text-foreground">{STATUS_LABELS[h.status] ?? h.status}</span>
                  <span>{new Date(h.at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl border border-border bg-background py-2.5 text-sm font-semibold hover:bg-muted"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`tabular-nums ${bold ? "font-display text-lg font-bold text-primary" : "font-semibold text-foreground"}`}>{value}</dd>
    </div>
  );
}
