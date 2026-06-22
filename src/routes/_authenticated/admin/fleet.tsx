import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Bike,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Phone,
  Plus,
  Search,
  Star,
  Truck,
  UserPlus,
  Users,
  XCircle,
  Route as RouteIcon,
  Activity,
} from "lucide-react";
import { Container } from "@/components/layout/Container";
import { useAuth } from "@/hooks/use-auth";
import {
  createRider,
  deleteRider,
  fetchRiders,
  RIDER_STATUS_LABEL,
  RIDER_STATUS_TONE,
  updateRider,
  VEHICLE_LABEL,
  assignRiderToOrder,
  type Rider,
  type RiderStatus,
  type VehicleType,
} from "@/lib/fleet";
import {
  fetchAllOrders,
  formatNaira,
  STATUS_LABELS,
  STATUS_TONE,
  type Order,
} from "@/lib/orders";

export const Route = createFileRoute("/_authenticated/admin/fleet")({
  head: () => ({
    meta: [
      { title: "Fleet Management — MRS Staff Coop" },
      { name: "description", content: "Manage riders, assignments, and delivery analytics." },
    ],
  }),
  component: FleetPage,
});

type Tab = "dashboard" | "riders" | "assignments" | "routes" | "analytics";

function FleetPage() {
  const { role, loading: authLoading } = useAuth();
  const allowed =
    role === "fleet_manager" || role === "store_owner" || role === "super_admin";

  const [tab, setTab] = useState<Tab>("dashboard");
  const [riders, setRiders] = useState<Rider[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Rider | "new" | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [r, o] = await Promise.all([fetchRiders(), fetchAllOrders()]);
      setRiders(r);
      setOrders(o);
    } catch (err) {
      console.error(err);
      toast.error("Could not load fleet data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) void refresh();
  }, [allowed]);

  const kpis = useMemo(() => {
    const active = orders.filter((o) =>
      ["assigned_rider", "picked_up", "out_for_delivery"].includes(o.status),
    ).length;
    const pending = orders.filter((o) =>
      ["order_received", "approved", "processing", "packed"].includes(o.status),
    ).length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const failed = orders.filter((o) => o.status === "cancelled").length;
    return { active, pending, delivered, failed };
  }, [orders]);

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
          <p className="mt-2 text-sm text-muted-foreground">Fleet Manager access required.</p>
          <Link to="/dashboard" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            <ArrowLeft className="h-4 w-4" /> Dashboard
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
            <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
            </Link>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Fleet management</div>
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Fleet command center</h1>
            <p className="mt-1 text-sm text-muted-foreground">Riders, assignments, and delivery performance in one place.</p>
          </div>
          <button
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-burgundy px-4 py-2 text-sm font-semibold text-primary-foreground shadow-burgundy"
          >
            <UserPlus className="h-4 w-4" /> Add rider
          </button>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi tone="emerald" icon={<Activity className="h-5 w-5" />} label="Active deliveries" value={String(kpis.active)} />
          <Kpi tone="amber" icon={<ClipboardList className="h-5 w-5" />} label="Pending deliveries" value={String(kpis.pending)} />
          <Kpi tone="indigo" icon={<CheckCircle2 className="h-5 w-5" />} label="Delivered orders" value={String(kpis.delivered)} />
          <Kpi tone="rose" icon={<XCircle className="h-5 w-5" />} label="Failed deliveries" value={String(kpis.failed)} />
        </section>

        <nav className="flex flex-wrap gap-2 border-b border-border/60 pb-2">
          {(
            [
              { v: "dashboard", l: "Dashboard", i: Activity },
              { v: "riders", l: "Riders", i: Users },
              { v: "assignments", l: "Assignments", i: Truck },
              { v: "routes", l: "Route optimization", i: RouteIcon },
              { v: "analytics", l: "Analytics", i: ClipboardList },
            ] as { v: Tab; l: string; i: any }[]
          ).map(({ v, l, i: Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => setTab(v)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                tab === v
                  ? "bg-gradient-burgundy text-primary-foreground shadow-burgundy"
                  : "border border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {l}
            </button>
          ))}
        </nav>

        {loading ? (
          <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            {tab === "dashboard" && <DashboardTab riders={riders} orders={orders} />}
            {tab === "riders" && (
              <RidersTab
                riders={riders}
                onEdit={(r) => setEditing(r)}
                onDelete={async (id) => {
                  if (!confirm("Delete this rider?")) return;
                  try {
                    await deleteRider(id);
                    toast.success("Rider removed");
                    void refresh();
                  } catch (e: any) {
                    toast.error(e?.message ?? "Delete failed");
                  }
                }}
              />
            )}
            {tab === "assignments" && (
              <AssignmentsTab
                riders={riders}
                orders={orders}
                onAssigned={() => void refresh()}
              />
            )}
            {tab === "routes" && <RoutesTab orders={orders} riders={riders} />}
            {tab === "analytics" && <AnalyticsTab orders={orders} riders={riders} />}
          </>
        )}
      </div>

      {editing && (
        <RiderDrawer
          rider={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void refresh();
          }}
        />
      )}
    </Container>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "emerald" | "amber" | "indigo" | "rose";
}) {
  const map = {
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-700 ring-emerald-200",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-700 ring-amber-200",
    indigo: "from-indigo-500/15 to-indigo-500/5 text-indigo-700 ring-indigo-200",
    rose: "from-rose-500/15 to-rose-500/5 text-rose-700 ring-rose-200",
  } as const;
  return (
    <div className={`rounded-2xl border border-border/60 bg-gradient-to-br ${map[tone]} p-4 shadow-soft ring-1`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-2 font-display text-3xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function DashboardTab({ riders, orders }: { riders: Rider[]; orders: Order[] }) {
  const available = riders.filter((r) => r.status === "available").length;
  const onDelivery = riders.filter((r) => r.status === "on_delivery").length;
  const recent = orders.slice(0, 6);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold">Live delivery feed</h3>
          <ul className="mt-3 divide-y divide-border/60">
            {recent.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No orders yet.</li>}
            {recent.map((o) => {
              const r = riders.find((x) => x.id === o.assigned_rider_id);
              return (
                <li key={o.id} className="flex items-center gap-3 py-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted">
                    <Truck className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold">{o.order_number}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_TONE[o.status]}`}>
                        {STATUS_LABELS[o.status]}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {o.full_name} · {o.city} · {r ? `🏍 ${r.full_name}` : "Unassigned"}
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-primary">{formatNaira(Number(o.total))}</div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold">Fleet status</h3>
          <div className="mt-3 space-y-2 text-sm">
            <Row label="Total riders" value={String(riders.length)} />
            <Row label="Available" value={String(available)} />
            <Row label="On delivery" value={String(onDelivery)} />
            <Row label="Off duty" value={String(riders.filter((r) => r.status === "off_duty").length)} />
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold">Top performers</h3>
          <ul className="mt-3 space-y-2">
            {[...riders]
              .sort((a, b) => b.total_deliveries - a.total_deliveries)
              .slice(0, 4)
              .map((r) => (
                <li key={r.id} className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium">{r.full_name}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {Number(r.rating).toFixed(1)} · {r.total_deliveries}
                  </span>
                </li>
              ))}
            {riders.length === 0 && <li className="text-xs text-muted-foreground">No riders yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function RidersTab({
  riders,
  onEdit,
  onDelete,
}: {
  riders: Rider[];
  onEdit: (r: Rider) => void;
  onDelete: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<RiderStatus | "all">("all");

  const filtered = riders
    .filter((r) => statusFilter === "all" || r.status === statusFilter)
    .filter((r) => {
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return (
        r.full_name.toLowerCase().includes(s) ||
        r.phone.toLowerCase().includes(s) ||
        (r.zone ?? "").toLowerCase().includes(s) ||
        (r.plate_number ?? "").toLowerCase().includes(s)
      );
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone, zone, plate…"
            className="h-10 w-full rounded-full border border-input bg-muted/60 pl-10 pr-4 text-sm focus:border-primary focus:bg-card focus:outline-hidden"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "available", "on_delivery", "off_duty", "suspended"] as const).map((s) => (
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
              {s === "all" ? "All" : RIDER_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          {riders.length === 0 ? "No riders yet. Add your first rider." : "No riders match these filters."}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-display text-base font-semibold">{r.full_name}</div>
                  <div className="mt-0.5 inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" /> {r.phone}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${RIDER_STATUS_TONE[r.status]}`}>
                  {RIDER_STATUS_LABEL[r.status]}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-muted/60 p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Vehicle</div>
                  <div className="font-semibold">{VEHICLE_LABEL[r.vehicle_type]}</div>
                </div>
                <div className="rounded-lg bg-muted/60 p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Plate</div>
                  <div className="font-semibold">{r.plate_number || "—"}</div>
                </div>
                <div className="rounded-lg bg-muted/60 p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Zone</div>
                  <div className="inline-flex items-center gap-1 font-semibold"><MapPin className="h-3 w-3" />{r.zone || "—"}</div>
                </div>
                <div className="rounded-lg bg-muted/60 p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Rating</div>
                  <div className="inline-flex items-center gap-1 font-semibold">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {Number(r.rating).toFixed(1)} · {r.total_deliveries} runs
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button onClick={() => onEdit(r)} className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                  Edit
                </button>
                <button onClick={() => onDelete(r.id)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AssignmentsTab({
  riders,
  orders,
  onAssigned,
}: {
  riders: Rider[];
  orders: Order[];
  onAssigned: () => void;
}) {
  const unassigned = orders.filter(
    (o) => !o.assigned_rider_id && ["packed", "approved", "processing"].includes(o.status),
  );
  const available = riders.filter((r) => r.status === "available");
  const [busyId, setBusyId] = useState<string | null>(null);

  const assign = async (orderId: string, riderId: string) => {
    setBusyId(orderId);
    try {
      await assignRiderToOrder(orderId, riderId);
      toast.success("Rider assigned");
      onAssigned();
    } catch (e: any) {
      toast.error(e?.message ?? "Assignment failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
        <h3 className="text-sm font-semibold">Ready for assignment ({unassigned.length})</h3>
        <p className="mt-1 text-xs text-muted-foreground">Packed orders waiting for a rider.</p>
        <ul className="mt-3 space-y-2">
          {unassigned.length === 0 && <li className="py-4 text-center text-xs text-muted-foreground">All caught up.</li>}
          {unassigned.map((o) => (
            <li key={o.id} className="rounded-xl border border-border/60 bg-background p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs font-bold">{o.order_number}</div>
                  <div className="text-xs text-muted-foreground">{o.full_name} · {o.city}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_TONE[o.status]}`}>
                  {STATUS_LABELS[o.status]}
                </span>
              </div>
              {available.length === 0 ? (
                <div className="mt-2 text-xs text-rose-600">No available riders.</div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {available.map((r) => (
                    <button
                      key={r.id}
                      disabled={busyId === o.id}
                      onClick={() => assign(o.id, r.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold hover:border-primary hover:bg-muted disabled:opacity-50"
                    >
                      <Bike className="h-3 w-3" /> {r.full_name}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
        <h3 className="text-sm font-semibold">Currently on the road</h3>
        <ul className="mt-3 divide-y divide-border/60">
          {orders
            .filter((o) => o.assigned_rider_id && ["assigned_rider", "picked_up", "out_for_delivery"].includes(o.status))
            .map((o) => {
              const r = riders.find((x) => x.id === o.assigned_rider_id);
              return (
                <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <div className="font-mono text-xs font-bold">{o.order_number}</div>
                    <div className="text-xs text-muted-foreground">{r?.full_name ?? "Unknown rider"} · {o.city}</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_TONE[o.status]}`}>
                    {STATUS_LABELS[o.status]}
                  </span>
                </li>
              );
            })}
          {orders.filter((o) => o.assigned_rider_id && o.status !== "delivered" && o.status !== "cancelled").length === 0 && (
            <li className="py-4 text-center text-xs text-muted-foreground">No active deliveries.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function RoutesTab({ orders, riders }: { orders: Order[]; riders: Rider[] }) {
  // Group active deliveries by city/zone to surface batching opportunities.
  const active = orders.filter((o) => ["assigned_rider", "picked_up", "out_for_delivery", "packed"].includes(o.status));
  const byCity = active.reduce<Record<string, Order[]>>((acc, o) => {
    const k = o.city || "Unspecified";
    (acc[k] ||= []).push(o);
    return acc;
  }, {});
  const groups = Object.entries(byCity).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-800">
        <strong>Route optimization</strong> — orders are grouped by drop-off city so dispatchers can batch nearby deliveries onto the same rider.
      </div>
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          No active deliveries to route.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groups.map(([city, list]) => {
            const zoneRiders = riders.filter((r) => (r.zone ?? "").toLowerCase() === city.toLowerCase());
            return (
              <div key={city} className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 font-semibold">
                    <MapPin className="h-4 w-4 text-primary" /> {city}
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{list.length} drops</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Suggested riders: {zoneRiders.length > 0 ? zoneRiders.map((r) => r.full_name).join(", ") : "Any available"}
                </div>
                <ol className="mt-3 space-y-1 text-xs">
                  {list.slice(0, 6).map((o, i) => (
                    <li key={o.id} className="flex justify-between">
                      <span><span className="font-mono font-bold">{i + 1}.</span> {o.full_name}</span>
                      <span className="text-muted-foreground">{o.order_number}</span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({ orders, riders }: { orders: Order[]; riders: Rider[] }) {
  const delivered = orders.filter((o) => o.status === "delivered");
  const cancelled = orders.filter((o) => o.status === "cancelled");
  const total = delivered.length + cancelled.length;
  const successRate = total === 0 ? 0 : (delivered.length / total) * 100;
  const avgValue = delivered.length === 0 ? 0 : delivered.reduce((s, o) => s + Number(o.total), 0) / delivered.length;

  const perRider = riders
    .map((r) => {
      const assigned = orders.filter((o) => o.assigned_rider_id === r.id);
      const done = assigned.filter((o) => o.status === "delivered").length;
      return { r, assigned: assigned.length, done };
    })
    .sort((a, b) => b.done - a.done);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Delivery success</div>
          <div className="mt-1 font-display text-2xl font-bold text-emerald-600">{successRate.toFixed(1)}%</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Avg order value</div>
          <div className="mt-1 font-display text-2xl font-bold">{formatNaira(avgValue)}</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Active fleet</div>
          <div className="mt-1 font-display text-2xl font-bold">{riders.length} riders</div>
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
        <h3 className="text-sm font-semibold">Rider performance</h3>
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="py-2">Rider</th>
              <th className="py-2">Assigned</th>
              <th className="py-2">Delivered</th>
              <th className="py-2">Rate</th>
              <th className="py-2">Rating</th>
            </tr>
          </thead>
          <tbody>
            {perRider.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-center text-xs text-muted-foreground">No riders yet.</td></tr>
            )}
            {perRider.map(({ r, assigned, done }) => (
              <tr key={r.id} className="border-t border-border/60">
                <td className="py-2 font-semibold">{r.full_name}</td>
                <td className="py-2 tabular-nums">{assigned}</td>
                <td className="py-2 tabular-nums">{done}</td>
                <td className="py-2 tabular-nums">{assigned === 0 ? "—" : `${((done / assigned) * 100).toFixed(0)}%`}</td>
                <td className="py-2 inline-flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{Number(r.rating).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RiderDrawer({
  rider,
  onClose,
  onSaved,
}: {
  rider: Rider | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = rider === null;
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: rider?.full_name ?? "",
    phone: rider?.phone ?? "",
    vehicle_type: (rider?.vehicle_type ?? "motorcycle") as VehicleType,
    plate_number: rider?.plate_number ?? "",
    zone: rider?.zone ?? "",
    status: (rider?.status ?? "available") as RiderStatus,
    notes: rider?.notes ?? "",
  });

  const save = async () => {
    if (!form.full_name.trim() || !form.phone.trim()) {
      toast.error("Name and phone required");
      return;
    }
    setBusy(true);
    try {
      if (isNew) {
        await createRider({
          user_id: null,
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          vehicle_type: form.vehicle_type,
          plate_number: form.plate_number || null,
          zone: form.zone || null,
          status: form.status,
          notes: form.notes || null,
        });
        toast.success("Rider added");
      } else if (rider) {
        await updateRider(rider.id, {
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          vehicle_type: form.vehicle_type,
          plate_number: form.plate_number || null,
          zone: form.zone || null,
          status: form.status,
          notes: form.notes || null,
        });
        toast.success("Rider updated");
      }
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">{isNew ? "New rider" : "Edit rider"}</div>
            <h2 className="mt-1 font-display text-xl font-semibold">{isNew ? "Add rider to fleet" : form.full_name}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-muted">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <Field label="Full name">
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vehicle">
              <select value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value as VehicleType })} className={inputCls}>
                {(Object.keys(VEHICLE_LABEL) as VehicleType[]).map((v) => (
                  <option key={v} value={v}>{VEHICLE_LABEL[v]}</option>
                ))}
              </select>
            </Field>
            <Field label="Plate number">
              <input value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Zone">
              <input value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} className={inputCls} placeholder="e.g. Lekki" />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as RiderStatus })} className={inputCls}>
                {(Object.keys(RIDER_STATUS_LABEL) as RiderStatus[]).map((s) => (
                  <option key={s} value={s}>{RIDER_STATUS_LABEL[s]}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={inputCls} />
          </Field>
        </div>

        <div className="mt-6 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border bg-background py-2.5 text-sm font-semibold hover:bg-muted">Cancel</button>
          <button disabled={busy} onClick={save} className="flex-1 rounded-xl bg-gradient-burgundy py-2.5 text-sm font-semibold text-primary-foreground shadow-burgundy disabled:opacity-50">
            {busy ? "Saving…" : isNew ? "Add rider" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-ring/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
