import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ClipboardList,
  Eye,
  Package,
  Search,
  Truck,
  Wallet,
  XCircle,
} from "lucide-react";
import { Container } from "@/components/layout/Container";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchAllOrders,
  fetchOrderItems,
  formatNaira,
  nextStatus,
  ORDER_STATUSES,
  STATUS_LABELS,
  STATUS_TONE,
  updateOrderStatus,
  type Order,
  type OrderItem,
  type OrderStatus,
} from "@/lib/orders";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({
    meta: [
      { title: "Order Management — MRS Staff Coop" },
      { name: "description", content: "Manage the order queue, status, and fulfillment." },
    ],
  }),
  component: AdminOrdersPage,
});

type Tab = "queue" | "active" | "delivered" | "all";

const TAB_FILTERS: Record<Tab, (s: OrderStatus) => boolean> = {
  queue: (s) => s === "order_received" || s === "approved",
  active: (s) =>
    ["processing", "packed", "assigned_rider", "picked_up", "out_for_delivery"].includes(s),
  delivered: (s) => s === "delivered" || s === "cancelled",
  all: () => true,
};

function AdminOrdersPage() {
  const { role, loading: authLoading } = useAuth();
  const canManage =
    role === "store_owner" || role === "super_admin" || role === "fleet_manager";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("queue");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Order | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setOrders(await fetchAllOrders());
    } catch (err) {
      console.error(err);
      toast.error("Could not load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) void refresh();
  }, [canManage]);

  const stats = useMemo(() => {
    const total = orders.length;
    const queue = orders.filter((o) => TAB_FILTERS.queue(o.status)).length;
    const active = orders.filter((o) => TAB_FILTERS.active(o.status)).length;
    const revenue = orders
      .filter((o) => o.status === "delivered")
      .reduce((s, o) => s + Number(o.total), 0);
    return { total, queue, active, revenue };
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders
      .filter((o) => TAB_FILTERS[tab](o.status))
      .filter((o) => {
        if (!q) return true;
        return (
          o.order_number.toLowerCase().includes(q) ||
          o.full_name.toLowerCase().includes(q) ||
          o.phone.toLowerCase().includes(q) ||
          o.city.toLowerCase().includes(q)
        );
      });
  }, [orders, tab, query]);

  if (authLoading) {
    return (
      <Container>
        <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>
      </Container>
    );
  }

  if (!canManage) {
    return (
      <Container>
        <div className="mx-auto max-w-md py-20 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-4 font-display text-xl font-semibold">Restricted area</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Store Owner, Fleet Manager, or Super Admin access required.
          </p>
          <Link to="/dashboard" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6 py-6 sm:py-10">
        <header>
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Order management</div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Order queue</h1>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<ClipboardList className="h-5 w-5" />} label="In queue" value={String(stats.queue)} />
          <Stat icon={<Truck className="h-5 w-5" />} label="Active" value={String(stats.active)} />
          <Stat icon={<Package className="h-5 w-5" />} label="Total orders" value={String(stats.total)} />
          <Stat icon={<Wallet className="h-5 w-5" />} label="Delivered revenue" value={formatNaira(stats.revenue)} />
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex flex-wrap gap-2">
            {(["queue", "active", "delivered", "all"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${
                  tab === t
                    ? "bg-gradient-burgundy text-primary-foreground shadow-burgundy"
                    : "border border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
          <div className="relative ml-auto min-w-[240px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search number, name, phone, city…"
              className="h-10 w-full rounded-full border border-input bg-muted/60 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-hidden focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
            No orders here.
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((o) => (
              <li key={o.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">{o.order_number}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_TONE[o.status]}`}>
                        {STATUS_LABELS[o.status]}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">
                        {o.payment_method === "credit" ? "Credit" : "Pay now"}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{o.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {o.phone} · {o.address}, {o.city}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(o.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="font-display text-lg font-bold text-primary">{formatNaira(Number(o.total))}</div>
                    <button
                      onClick={() => setActive(o)}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold hover:bg-muted"
                    >
                      <Eye className="h-3.5 w-3.5" /> Manage
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {active && (
        <ManageDrawer
          order={active}
          onClose={() => setActive(null)}
          onChanged={() => {
            void refresh();
            setActive(null);
          }}
        />
      )}
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

function ManageDrawer({
  order,
  onClose,
  onChanged,
}: {
  order: Order;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState<OrderStatus>(order.status);

  useEffect(() => {
    void fetchOrderItems(order.id).then(setItems).catch(console.error);
  }, [order.id]);

  const next = nextStatus(order.status);

  const advance = async (status: OrderStatus) => {
    setBusy(true);
    try {
      await updateOrderStatus(order.id, status);
      toast.success(`Moved to ${STATUS_LABELS[status]}`);
      onChanged();
    } catch (err: any) {
      toast.error(err?.message ?? "Update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-y-auto bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Manage order</div>
            <h2 className="mt-1 font-display text-xl font-semibold">{order.order_number}</h2>
            <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-muted">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-border/60 bg-card p-4 text-sm">
          <div className="text-[10px] font-semibold uppercase text-muted-foreground">Customer</div>
          <div className="mt-1 font-semibold">{order.full_name}</div>
          <div className="text-muted-foreground">{order.phone}</div>
          <div className="mt-1 text-muted-foreground">{order.address}, {order.city}</div>
          {order.notes && <div className="mt-2 rounded-md bg-muted/60 p-2 text-xs">Note: {order.notes}</div>}
        </div>

        <div className="mt-6 rounded-xl border border-border/60 bg-card p-4">
          <div className="text-sm font-semibold">Update status</div>
          {next && (
            <button
              disabled={busy}
              onClick={() => advance(next)}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-burgundy px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-burgundy disabled:opacity-50"
            >
              Advance to {STATUS_LABELS[next]}
            </button>
          )}
          <div className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <select
                value={chosen}
                onChange={(e) => setChosen(e.target.value as OrderStatus)}
                className="h-10 w-full appearance-none rounded-lg border border-border bg-background pl-3 pr-9 text-sm"
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
                <option value="cancelled">Cancel order</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <button
              disabled={busy || chosen === order.status}
              onClick={() => advance(chosen)}
              className="rounded-lg border border-border bg-background px-3 text-xs font-semibold hover:bg-muted disabled:opacity-50"
            >
              Apply
            </button>
          </div>
          {order.status !== "cancelled" && order.status !== "delivered" && (
            <button
              disabled={busy}
              onClick={() => advance("cancelled")}
              className="mt-2 w-full rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >
              Cancel order
            </button>
          )}
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
          <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-semibold tabular-nums">{formatNaira(Number(order.subtotal))}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Delivery fee</dt><dd className="font-semibold tabular-nums">{Number(order.delivery_fee) === 0 ? "Free" : formatNaira(Number(order.delivery_fee))}</dd></div>
          <div className="my-2 h-px bg-border" />
          <div className="flex justify-between"><dt className="font-semibold">Total</dt><dd className="font-display text-lg font-bold text-primary tabular-nums">{formatNaira(Number(order.total))}</dd></div>
        </dl>

        {order.status_history && order.status_history.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold">History</h3>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {order.status_history.map((h, i) => (
                <li key={i} className="flex justify-between">
                  <span>{STATUS_LABELS[h.status] ?? h.status}</span>
                  <span>{new Date(h.at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
