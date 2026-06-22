import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Banknote,
  Bike,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Package,
  ShoppingBag,
  Star,
  Truck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Container } from "@/components/layout/Container";
import { useAuth } from "@/hooks/use-auth";
import { fetchAllOrders, formatNaira, STATUS_LABELS, type Order } from "@/lib/orders";
import { fetchRiders, type Rider } from "@/lib/fleet";
import {
  fetchAllCreditRequests,
  fetchAllRepayments,
  type CreditRepayment,
  type CreditRequest,
} from "@/lib/credit";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — MRS Staff Coop" },
      { name: "description", content: "Enterprise analytics dashboards for store, fleet and credit." },
    ],
  }),
  component: AnalyticsPage,
});

type Scope = "store" | "fleet" | "credit";

function AnalyticsPage() {
  const { role, loading: authLoading } = useAuth();
  const allowed =
    role === "store_owner" ||
    role === "super_admin" ||
    role === "fleet_manager" ||
    role === "credit_officer";

  const [scope, setScope] = useState<Scope>(
    role === "fleet_manager" ? "fleet" : role === "credit_officer" ? "credit" : "store",
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [repayments, setRepayments] = useState<CreditRepayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [o, r, c, p] = await Promise.all([
          fetchAllOrders().catch(() => []),
          fetchRiders().catch(() => []),
          fetchAllCreditRequests().catch(() => []),
          fetchAllRepayments().catch(() => []),
        ]);
        if (cancelled) return;
        setOrders(o);
        setRiders(r);
        setRequests(c);
        setRepayments(p);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  if (authLoading) {
    return (
      <Container>
        <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>
      </Container>
    );
  }
  if (!allowed) {
    return (
      <Container>
        <div className="mx-auto max-w-md py-20 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-4 font-display text-xl font-semibold">Restricted area</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Store Owner, Fleet Manager, or Credit Officer access required.
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
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
            </Link>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Enterprise analytics
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Reporting & insights
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              KPI cards, trend charts, and management reports across the cooperative.
            </p>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2 border-b border-border/60 pb-2">
          {(
            [
              { v: "store", l: "Store Owner", i: BarChart3 },
              { v: "fleet", l: "Fleet", i: Truck },
              { v: "credit", l: "Credit", i: CreditCard },
            ] as { v: Scope; l: string; i: any }[]
          ).map(({ v, l, i: Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => setScope(v)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                scope === v
                  ? "bg-gradient-burgundy text-primary-foreground shadow-burgundy"
                  : "border border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {l}
            </button>
          ))}
        </nav>

        {loading ? (
          <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
            Loading analytics…
          </div>
        ) : scope === "store" ? (
          <StoreOwnerDashboard orders={orders} requests={requests} />
        ) : scope === "fleet" ? (
          <FleetDashboard orders={orders} riders={riders} />
        ) : (
          <CreditDashboard requests={requests} repayments={repayments} />
        )}
      </div>
    </Container>
  );
}

/* ----------------------------- KPI Card ----------------------------- */

function Kpi({
  icon,
  label,
  value,
  delta,
  tone = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta?: string;
  tone?: "primary" | "emerald" | "amber" | "indigo" | "rose" | "sky";
}) {
  const map = {
    primary: "from-primary/15 to-primary/5 text-primary ring-primary/20",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-700 ring-emerald-200",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-700 ring-amber-200",
    indigo: "from-indigo-500/15 to-indigo-500/5 text-indigo-700 ring-indigo-200",
    rose: "from-rose-500/15 to-rose-500/5 text-rose-700 ring-rose-200",
    sky: "from-sky-500/15 to-sky-500/5 text-sky-700 ring-sky-200",
  } as const;
  return (
    <div className={`rounded-2xl border border-border/60 bg-gradient-to-br ${map[tone]} p-4 shadow-soft ring-1`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-2 font-display text-2xl font-bold text-foreground sm:text-3xl">{value}</div>
      {delta && <div className="mt-1 text-[11px] font-semibold text-muted-foreground">{delta}</div>}
    </div>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-end justify-between gap-2">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/* ------------------------- Helpers / shaping ------------------------ */

function lastNMonthsKeys(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const dd = new Date(d);
    dd.setMonth(d.getMonth() - i);
    out.push(dd.toISOString().slice(0, 7));
  }
  return out;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleString(undefined, { month: "short" });
}

/* --------------------------- Store Owner --------------------------- */

function StoreOwnerDashboard({
  orders,
  requests,
}: {
  orders: Order[];
  requests: CreditRequest[];
}) {
  const revenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.total || 0), 0);
  const ordersCount = orders.length;
  const customers = new Set(orders.map((o) => o.user_id)).size;
  const creditSales = requests
    .filter((r) => ["approved", "repaying", "completed"].includes(r.status))
    .reduce((s, r) => s + Number(r.approved_amount ?? r.amount), 0);
  const deliveries = orders.filter((o) => o.status === "delivered").length;

  const months = lastNMonthsKeys(6);
  const revenueByMonth = months.map((key) => {
    const rev = orders
      .filter((o) => o.created_at.startsWith(key) && o.status !== "cancelled")
      .reduce((s, o) => s + Number(o.total || 0), 0);
    const cnt = orders.filter((o) => o.created_at.startsWith(key)).length;
    return { month: monthLabel(key), revenue: Math.round(rev), orders: cnt };
  });

  const statusBreakdown = Object.entries(
    orders.reduce<Record<string, number>>((acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([k, v]) => ({ name: STATUS_LABELS[k as keyof typeof STATUS_LABELS] ?? k, value: v }));

  const productAgg = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of orders) {
    // we don't have items here; approximate using order rows
  }
  // Top customers (by spend)
  const customerAgg = new Map<string, { name: string; spend: number; orders: number }>();
  for (const o of orders) {
    const cur = customerAgg.get(o.user_id) ?? { name: o.full_name, spend: 0, orders: 0 };
    cur.spend += Number(o.total || 0);
    cur.orders += 1;
    customerAgg.set(o.user_id, cur);
  }
  const topCustomers = Array.from(customerAgg.values())
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5);

  const pieColors = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#0ea5e9", "#ef4444", "#84cc16"];

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi tone="primary" icon={<Banknote className="h-5 w-5" />} label="Revenue" value={formatNaira(revenue)} delta={`${ordersCount} orders`} />
        <Kpi tone="sky" icon={<ShoppingBag className="h-5 w-5" />} label="Orders" value={String(ordersCount)} />
        <Kpi tone="indigo" icon={<Users className="h-5 w-5" />} label="Customers" value={String(customers)} />
        <Kpi tone="amber" icon={<CreditCard className="h-5 w-5" />} label="Credit Sales" value={formatNaira(creditSales)} />
        <Kpi tone="emerald" icon={<Truck className="h-5 w-5" />} label="Deliveries" value={String(deliveries)} />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Revenue trend" hint="Last 6 months">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueByMonth}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatNaira(v)} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>
        </div>
        <Panel title="Order status mix" hint="All time">
          {statusBreakdown.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No orders yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {statusBreakdown.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Orders per month" hint="Volume">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Top customers" hint="By spend">
          {topCustomers.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No customer data yet.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Customer</th>
                  <th className="py-2 text-right">Orders</th>
                  <th className="py-2 text-right">Spend</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="py-2 font-semibold">{c.name}</td>
                    <td className="py-2 text-right tabular-nums">{c.orders}</td>
                    <td className="py-2 text-right font-semibold tabular-nums text-primary">
                      {formatNaira(c.spend)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ----------------------------- Fleet ------------------------------ */

function FleetDashboard({ orders, riders }: { orders: Order[]; riders: Rider[] }) {
  const active = orders.filter((o) =>
    ["assigned_rider", "picked_up", "out_for_delivery"].includes(o.status),
  ).length;
  const delivered = orders.filter((o) => o.status === "delivered");
  const cancelled = orders.filter((o) => o.status === "cancelled");
  const total = delivered.length + cancelled.length;
  const successRate = total === 0 ? 0 : (delivered.length / total) * 100;

  const months = lastNMonthsKeys(6);
  const trend = months.map((key) => {
    const del = orders.filter((o) => o.delivered_at?.startsWith(key)).length;
    const fail = orders.filter((o) => o.cancelled_at?.startsWith(key)).length;
    return { month: monthLabel(key), Delivered: del, Cancelled: fail };
  });

  const perRider = riders
    .map((r) => {
      const assigned = orders.filter((o) => o.assigned_rider_id === r.id);
      const done = assigned.filter((o) => o.status === "delivered").length;
      const rate = assigned.length === 0 ? 0 : Math.round((done / assigned.length) * 100);
      return { name: r.full_name, assigned: assigned.length, delivered: done, rate, rating: Number(r.rating) };
    })
    .sort((a, b) => b.delivered - a.delivered)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <Kpi tone="indigo" icon={<Truck className="h-5 w-5" />} label="Active deliveries" value={String(active)} />
        <Kpi
          tone="emerald"
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Success rate"
          value={`${successRate.toFixed(1)}%`}
          delta={`${delivered.length} delivered · ${cancelled.length} failed`}
        />
        <Kpi
          tone="amber"
          icon={<Bike className="h-5 w-5" />}
          label="Active fleet"
          value={`${riders.filter((r) => r.status !== "off_duty" && r.status !== "suspended").length} / ${riders.length}`}
          delta="riders on duty"
        />
      </section>

      <Panel title="Delivery trend" hint="Delivered vs cancelled · last 6 months">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="Delivered" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Cancelled" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Rider performance" hint="Deliveries completed">
          {perRider.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No riders yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={perRider} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="delivered" stackId="a" fill="#10b981" name="Delivered" />
                <Bar dataKey="assigned" stackId="b" fill="#6366f1" name="Assigned" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Rider scorecard" hint="Top 8 by deliveries">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Rider</th>
                <th className="py-2 text-right">Assigned</th>
                <th className="py-2 text-right">Delivered</th>
                <th className="py-2 text-right">Rate</th>
                <th className="py-2 text-right">Rating</th>
              </tr>
            </thead>
            <tbody>
              {perRider.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-xs text-muted-foreground">
                    No riders yet.
                  </td>
                </tr>
              )}
              {perRider.map((r) => (
                <tr key={r.name} className="border-t border-border/60">
                  <td className="py-2 font-semibold">{r.name}</td>
                  <td className="py-2 text-right tabular-nums">{r.assigned}</td>
                  <td className="py-2 text-right tabular-nums">{r.delivered}</td>
                  <td className="py-2 text-right tabular-nums">{r.rate}%</td>
                  <td className="py-2 text-right">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {r.rating.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}

/* ----------------------------- Credit ----------------------------- */

function CreditDashboard({
  requests,
  repayments,
}: {
  requests: CreditRequest[];
  repayments: CreditRepayment[];
}) {
  const outstanding = requests.reduce((s, r) => s + Number(r.outstanding_balance || 0), 0);
  const approvedTotal = requests
    .filter((r) => ["approved", "repaying", "completed"].includes(r.status))
    .reduce((s, r) => s + Number(r.approved_amount ?? r.amount), 0);
  const approvedCount = requests.filter((r) => ["approved", "repaying", "completed"].includes(r.status)).length;
  const collected = repayments.reduce((s, p) => s + Number(p.amount || 0), 0);

  const months = lastNMonthsKeys(6);
  const repayTrend = months.map((key) => {
    const total = repayments
      .filter((p) => p.paid_on.startsWith(key))
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const issued = requests
      .filter((r) => r.created_at.startsWith(key))
      .reduce((s, r) => s + Number(r.amount || 0), 0);
    return { month: monthLabel(key), Repayments: Math.round(total), Issued: Math.round(issued) };
  });

  const statusMix = Object.entries(
    requests.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([k, v]) => ({ name: k.replace("_", " "), value: v }));

  const topBalances = [...requests]
    .filter((r) => Number(r.outstanding_balance) > 0)
    .sort((a, b) => Number(b.outstanding_balance) - Number(a.outstanding_balance))
    .slice(0, 6);

  const pieColors = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#6366f1", "#94a3b8"];

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi tone="rose" icon={<Wallet className="h-5 w-5" />} label="Outstanding balances" value={formatNaira(outstanding)} />
        <Kpi tone="emerald" icon={<CheckCircle2 className="h-5 w-5" />} label="Approved credits" value={formatNaira(approvedTotal)} delta={`${approvedCount} approved`} />
        <Kpi tone="indigo" icon={<TrendingUp className="h-5 w-5" />} label="Repayments collected" value={formatNaira(collected)} />
        <Kpi tone="amber" icon={<ClipboardList className="h-5 w-5" />} label="Pending review" value={String(requests.filter((r) => r.status === "submitted" || r.status === "under_review").length)} />
      </section>

      <Panel title="Repayment trends" hint="Issued vs repaid · last 6 months">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={repayTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatNaira(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Issued" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Repayments" fill="#10b981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Request status mix">
          {statusMix.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No requests yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={95} paddingAngle={2}>
                  {statusMix.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Largest outstanding balances">
          {topBalances.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No outstanding balances.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Member</th>
                  <th className="py-2 text-right">Approved</th>
                  <th className="py-2 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {topBalances.map((r) => (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="py-2 font-semibold">
                      {r.member_name}
                      <span className="ml-1 text-xs text-muted-foreground">#{r.employee_id}</span>
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatNaira(Number(r.approved_amount ?? r.amount))}
                    </td>
                    <td className="py-2 text-right font-bold tabular-nums text-rose-600">
                      {formatNaira(Number(r.outstanding_balance))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );
}
