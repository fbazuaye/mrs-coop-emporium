import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, TrendingUp, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { calcPayout, earningsForPeriod, fetchRiderForUser, fetchRiderOrders, totalEarnings } from "@/lib/rider";
import { formatNaira, type Order } from "@/lib/orders";

export const Route = createFileRoute("/_authenticated/rider/earnings")({
  component: RiderEarnings,
});

function RiderEarnings() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const r = await fetchRiderForUser(user.id);
      if (r) {
        const list = await fetchRiderOrders(r.id);
        if (!cancelled) setOrders(list);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const delivered = useMemo(() => orders.filter((o) => o.status === "delivered"), [orders]);
  const today = useMemo(() => earningsForPeriod(orders, 1), [orders]);
  const week = useMemo(() => earningsForPeriod(orders, 7), [orders]);
  const month = useMemo(() => earningsForPeriod(orders, 30), [orders]);
  const lifetime = useMemo(() => totalEarnings(orders), [orders]);
  const avg = delivered.length ? Math.round(lifetime / delivered.length) : 0;

  if (loading) return <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <Link to="/rider" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <section className="rounded-3xl bg-gradient-burgundy p-5 text-primary-foreground shadow-burgundy">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] opacity-80">
          <Wallet className="h-3.5 w-3.5" /> Lifetime earnings
        </div>
        <div className="mt-1 font-display text-3xl font-bold">{formatNaira(lifetime)}</div>
        <div className="mt-1 flex items-center gap-1 text-xs opacity-80">
          <TrendingUp className="h-3.5 w-3.5" /> {delivered.length} deliveries · avg {formatNaira(avg)}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <Card label="Today" value={formatNaira(today)} />
        <Card label="7 days" value={formatNaira(week)} />
        <Card label="30 days" value={formatNaira(month)} />
      </section>

      <section className="rounded-3xl border border-border bg-card p-4">
        <h2 className="font-display text-base font-semibold">Recent payouts</h2>
        {delivered.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No deliveries yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {delivered.slice(0, 30).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{o.order_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(o.delivered_at ?? o.updated_at).toLocaleDateString()} · {o.full_name}
                  </div>
                </div>
                <div className="font-display text-sm font-bold text-primary">{formatNaira(calcPayout(o))}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-bold">{value}</div>
    </div>
  );
}
