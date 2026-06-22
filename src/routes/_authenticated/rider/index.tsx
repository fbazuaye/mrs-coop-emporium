import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Inbox, PackageCheck, Truck, MapPin, Phone, ChevronRight, Bell, BellOff, WifiOff, CloudUpload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  bucketOrders,
  fetchRiderForUser,
  fetchRiderOrders,
  earningsForPeriod,
  totalEarnings,
} from "@/lib/rider";
import { formatNaira, STATUS_LABELS, STATUS_TONE, type Order } from "@/lib/orders";
import type { Rider } from "@/lib/fleet";
import { supabase } from "@/integrations/supabase/client";
import {
  flushQueue,
  isOnline as isOnlineNow,
  loadCachedOrders,
  loadQueue,
  notify,
  onConnectivityChange,
  queueSize,
  requestRiderNotifications,
  saveCachedOrders,
} from "@/lib/rider-offline";

export const Route = createFileRoute("/_authenticated/rider/")({
  component: RiderHome,
});

type Tab = "assigned" | "active" | "completed";

function RiderHome() {
  const { user } = useAuth();
  const [rider, setRider] = useState<Rider | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("assigned");
  const [online, setOnline] = useState<boolean>(isOnlineNow());
  const [pending, setPending] = useState<number>(0);
  const [perm, setPerm] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied",
  );
  const prevSnapshot = useRef<Map<string, Order>>(new Map());

  // Bootstrap: load rider + orders, with cache-first when offline
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetchRiderForUser(user.id);
        if (cancelled) return;
        setRider(r);
        if (!r) {
          setLoading(false);
          return;
        }
        // Seed from cache immediately
        const cached = loadCachedOrders(r.id);
        if (cached.length) {
          setOrders(cached);
          prevSnapshot.current = new Map(cached.map((o) => [o.id, o]));
        }
        if (isOnlineNow()) {
          const list = await fetchRiderOrders(r.id);
          if (!cancelled) {
            setOrders(list);
            saveCachedOrders(r.id, list);
            prevSnapshot.current = new Map(list.map((o) => [o.id, o]));
          }
        }
      } catch {
        // Fall back silently — cache covers offline.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Realtime: refresh + fire notifications on changes
  useEffect(() => {
    if (!rider) return;
    const channel = supabase
      .channel(`rider-orders-${rider.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `assigned_rider_id=eq.${rider.id}` },
        async () => {
          if (!isOnlineNow()) return;
          const list = await fetchRiderOrders(rider.id);
          // Diff against snapshot to fire notifications
          const prev = prevSnapshot.current;
          for (const o of list) {
            const before = prev.get(o.id);
            if (!before) {
              // New assignment
              toast.info(`New delivery: ${o.order_number}`, { description: o.full_name });
              notify("New delivery assigned", `${o.order_number} • ${o.full_name}`, `assign-${o.id}`);
            } else if (before.status !== o.status) {
              toast.info(`${o.order_number} → ${STATUS_LABELS[o.status]}`);
              notify(
                `Order ${o.order_number}`,
                `Status: ${STATUS_LABELS[o.status]}`,
                `status-${o.id}-${o.status}`,
              );
            }
          }
          prevSnapshot.current = new Map(list.map((o) => [o.id, o]));
          setOrders(list);
          saveCachedOrders(rider.id, list);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [rider]);

  // Connectivity + queue flushing
  useEffect(() => {
    setPending(queueSize());
    const off = onConnectivityChange(async (isOn) => {
      setOnline(isOn);
      if (isOn) {
        const res = await flushQueue();
        setPending(res.remaining);
        if (res.flushed > 0) {
          toast.success(`Synced ${res.flushed} pending update${res.flushed === 1 ? "" : "s"}`);
          if (rider) {
            const list = await fetchRiderOrders(rider.id);
            setOrders(list);
            saveCachedOrders(rider.id, list);
            prevSnapshot.current = new Map(list.map((o) => [o.id, o]));
          }
        }
      }
    });
    // Initial sync attempt if any items linger
    if (isOnlineNow() && loadQueue().length) {
      void flushQueue().then((res) => setPending(res.remaining));
    }
    const tick = window.setInterval(() => setPending(queueSize()), 4000);
    return () => {
      off();
      window.clearInterval(tick);
    };
  }, [rider]);

  const buckets = useMemo(() => bucketOrders(orders), [orders]);
  const todayPayout = useMemo(() => earningsForPeriod(orders, 1), [orders]);
  const weekPayout = useMemo(() => earningsForPeriod(orders, 7), [orders]);
  const lifetime = useMemo(() => totalEarnings(orders), [orders]);

  const enableAlerts = async () => {
    const p = await requestRiderNotifications();
    setPerm(p);
    if (p === "granted") toast.success("Notifications enabled");
    else if (p === "denied") toast.error("Notifications blocked in browser settings");
  };

  if (loading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (!rider) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card p-6 text-center">
        <h2 className="font-display text-lg font-semibold">No rider profile</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A fleet manager hasn't linked you to a rider record yet. Ask them to add you.
        </p>
      </div>
    );
  }

  const list = buckets[tab];

  return (
    <div className="space-y-4">
      {/* Status bar: connectivity + alerts */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          {!online && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-amber-800">
              <WifiOff className="h-3 w-3" /> Offline
            </span>
          )}
          {pending > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-sky-800">
              <CloudUpload className="h-3 w-3" /> {pending} queued
            </span>
          )}
          {online && pending === 0 && (
            <span className="text-muted-foreground">All synced</span>
          )}
        </div>
        {perm !== "granted" ? (
          <button
            type="button"
            onClick={enableAlerts}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold"
          >
            <Bell className="h-3 w-3" /> Enable alerts
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-800">
            <Bell className="h-3 w-3" /> Alerts on
          </span>
        )}
        {perm === "denied" && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <BellOff className="h-3 w-3" />
          </span>
        )}
      </div>

      <section className="rounded-3xl bg-gradient-burgundy p-4 text-primary-foreground shadow-burgundy">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] opacity-80">Hello</div>
            <div className="font-display text-xl font-semibold">{rider.full_name}</div>
          </div>
          <div className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
            {rider.status.replace("_", " ")}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Today" value={formatNaira(todayPayout)} />
          <Stat label="7 days" value={formatNaira(weekPayout)} />
          <Stat label="Lifetime" value={formatNaira(lifetime)} />
        </div>
      </section>

      <nav className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-1">
        <TabBtn active={tab === "assigned"} onClick={() => setTab("assigned")} icon={Inbox} label="Assigned" count={buckets.assigned.length} />
        <TabBtn active={tab === "active"} onClick={() => setTab("active")} icon={Truck} label="Active" count={buckets.active.length} />
        <TabBtn active={tab === "completed"} onClick={() => setTab("completed")} icon={PackageCheck} label="Done" count={buckets.completed.length} />
      </nav>

      {list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {online ? "Nothing here yet." : "Nothing cached for this view."}
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((o) => (
            <li key={o.id}>
              <Link
                to="/rider/$orderId"
                params={{ orderId: o.id }}
                className="block rounded-2xl border border-border bg-card p-4 transition active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <span>{o.order_number}</span>
                      <span className={`rounded-full px-2 py-0.5 ${STATUS_TONE[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                    </div>
                    <div className="mt-1.5 truncate font-display text-base font-semibold">{o.full_name}</div>
                    <div className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-2">{o.address}, {o.city}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> {o.phone}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Payout</div>
                    <div className="font-display text-base font-bold text-primary">
                      {formatNaira(Math.round((o.delivery_fee || 0) * 0.75))}
                    </div>
                    <ChevronRight className="ml-auto mt-2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-2 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-0.5 text-sm font-bold">{value}</div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Inbox;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition ${
        active ? "bg-gradient-burgundy text-primary-foreground shadow-burgundy" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
      <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-white/20" : "bg-muted-foreground/15"}`}>{count}</span>
    </button>
  );
}
