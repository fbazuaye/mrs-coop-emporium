import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Clock,
  Truck,
  CircleStop,
} from "lucide-react";
import { Container } from "@/components/layout/Container";
import { DeliveryMap } from "@/components/tracking/DeliveryMap";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchOrderById,
  fetchRiderForOrder,
  fetchRecentPings,
  recordRiderPing,
  decodePolyline,
  formatEta,
  formatDistance,
  estimateFallbackEta,
  isLowConfidenceRoute,
  type RiderPing,
} from "@/lib/tracking";
import { computeRoute, type RouteResult } from "@/lib/maps.functions";
import {
  ORDER_STATUSES,
  STATUS_LABELS,
  STATUS_TONE,
  updateOrderStatus,
  nextStatus,
  type Order,
} from "@/lib/orders";
import type { Rider } from "@/lib/fleet";

// Default warehouse / store hub origin (Lagos)
const HUB: { lat: number; lng: number } = { lat: 6.4350, lng: 3.4350 };

export const Route = createFileRoute("/_authenticated/track/$orderId")({
  head: () => ({
    meta: [
      { title: "Live Delivery — MRS Staff Coop" },
      { name: "description", content: "Track your delivery in real time." },
    ],
  }),
  component: TrackingPage,
});

function TrackingPage() {
  const { orderId } = useParams({ from: "/_authenticated/track/$orderId" });
  const { user, role } = useAuth();
  const callComputeRoute = useServerFn(computeRoute);

  const [order, setOrder] = useState<Order | null>(null);
  const [rider, setRider] = useState<Rider | null>(null);
  const [pings, setPings] = useState<RiderPing[]>([]);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [etaSource, setEtaSource] = useState<"routes" | "fallback" | null>(null);
  const [loading, setLoading] = useState(true);
  const [routing, setRouting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastStatusRef = useRef<string | null>(null);

  const isStaff =
    role === "store_owner" || role === "super_admin" || role === "fleet_manager";
  const isRiderViewer = !!rider && rider.user_id === user?.id;

  // Initial load
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const o = await fetchOrderById(orderId);
        if (!alive) return;
        setOrder(o);
        if (o?.assigned_rider_id) {
          const r = await fetchRiderForOrder(orderId, o.assigned_rider_id);
          if (alive) setRider(r as Rider | null);
        }
        const p = await fetchRecentPings(orderId);
        if (alive) setPings(p);
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [orderId]);

  // Realtime: order updates, rider row, new pings
  useEffect(() => {
    const channel = supabase
      .channel(`track-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => setOrder(payload.new as Order),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rider_locations", filter: `order_id=eq.${orderId}` },
        (payload) => setPings((prev) => [...prev, payload.new as RiderPing].slice(-200)),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId]);

  // When assigned_rider_id changes, fetch rider details. Live position
  // updates flow through the rider_locations channel (already subscribed
  // above) — we no longer subscribe directly to the riders table to avoid
  // broadcasting rider PII (phone/plate) over Realtime.
  useEffect(() => {
    if (!order?.assigned_rider_id) {
      setRider(null);
      return;
    }
    let alive = true;
    void fetchRiderForOrder(orderId, order.assigned_rider_id).then((r) => {
      if (alive) setRider(r as Rider | null);
    });
    return () => {
      alive = false;
    };
  }, [orderId, order?.assigned_rider_id]);

  const riderPos = useMemo(() => {
    if (rider?.current_lat != null && rider?.current_lng != null) {
      return { lat: rider.current_lat as number, lng: rider.current_lng as number };
    }
    const last = pings[pings.length - 1];
    return last ? { lat: last.lat, lng: last.lng } : null;
  }, [rider, pings]);

  const destPos = useMemo(() => {
    if (order?.dest_lat != null && order?.dest_lng != null) {
      return { lat: order.dest_lat as number, lng: order.dest_lng as number };
    }
    return null;
  }, [order]);

  const breadcrumbs = useMemo(
    () => pings.map((p) => ({ lat: p.lat, lng: p.lng })),
    [pings],
  );

  // Compute route whenever rider or destination meaningfully moves.
  // Falls back to a haversine-based estimate if the Routes API fails or
  // returns a low-confidence result.
  useEffect(() => {
    if (!destPos) return;
    const origin = riderPos ?? HUB;
    let cancelled = false;
    setRouting(true);
    callComputeRoute({ data: { origin, destination: destPos, travelMode: "TWO_WHEELER" } })
      .then((r) => {
        if (cancelled) return;
        if (isLowConfidenceRoute(r)) {
          const fb = estimateFallbackEta(origin, destPos);
          setRoute({ polyline: "", distanceMeters: fb.distanceMeters, durationSeconds: fb.durationSeconds });
          setEtaSource("fallback");
        } else {
          setRoute(r);
          setEtaSource("routes");
        }
      })
      .catch((e) => {
        if (cancelled) return;
        console.warn("Routes API failed, using fallback ETA", e);
        const fb = estimateFallbackEta(origin, destPos);
        setRoute({ polyline: "", distanceMeters: fb.distanceMeters, durationSeconds: fb.durationSeconds });
        setEtaSource("fallback");
      })
      .finally(() => {
        if (!cancelled) setRouting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    destPos?.lat,
    destPos?.lng,
    riderPos?.lat,
    riderPos?.lng,
    callComputeRoute,
  ]);

  const path = useMemo(
    () => (route?.polyline ? decodePolyline(route.polyline) : []),
    [route],
  );

  // Rider location sharing
  const startSharing = () => {
    if (!navigator.geolocation || !rider) return;
    if (watchIdRef.current != null) return;
    setSharing(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        void recordRiderPing({
          rider_id: rider.id,
          order_id: orderId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        }).catch((e) => console.error(e));
      },
      (err) => {
        toast.error(`Location error: ${err.message}`);
        stopSharing();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    toast.success("Sharing live location");
  };
  const stopSharing = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharing(false);
  };
  useEffect(() => () => stopSharing(), []);

  // Browser push notifications: ask once on mount, then fire when the
  // order status changes (works for customers, riders, fleet, store owners).
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
  );
  const requestNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const p = await Notification.requestPermission();
      setNotifPermission(p);
      if (p === "granted") toast.success("Delivery alerts enabled");
    } catch {
      /* ignore */
    }
  };
  useEffect(() => {
    if (!order) return;
    const prev = lastStatusRef.current;
    if (prev && prev !== order.status) {
      const label = STATUS_LABELS[order.status] ?? order.status;
      const body = `Order ${order.order_number} • ${label}`;
      toast.info(body);
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted" &&
        document.visibilityState !== "visible"
      ) {
        try {
          const n = new Notification("Delivery update", {
            body,
            tag: `order-${order.id}`,
            icon: "/favicon.ico",
          });
          n.onclick = () => {
            window.focus();
            n.close();
          };
        } catch {
          /* ignore */
        }
      }
    }
    lastStatusRef.current = order.status;
  }, [order?.status, order?.order_number, order?.id]);

  const advance = async () => {
    if (!order) return;
    const next = nextStatus(order.status);
    if (!next) return;
    try {
      await updateOrderStatus(order.id, next);
      toast.success(`Marked as ${STATUS_LABELS[next]}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (loading) {
    return (
      <Container className="py-8">
        <p className="text-sm text-muted-foreground">Loading delivery…</p>
      </Container>
    );
  }

  if (!order) {
    return (
      <Container className="py-8">
        <p className="text-sm text-muted-foreground">Order not found or access denied.</p>
        <Link to="/orders" className="mt-4 inline-flex items-center gap-2 text-sm text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>
      </Container>
    );
  }

  const eta = route ? formatEta(route.durationSeconds) : "—";
  const dist = route ? formatDistance(route.distanceMeters) : "—";

  const backTo = isStaff ? "/admin/fleet" : "/orders";

  return (
    <Container className="space-y-5 py-6 md:py-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          to={backTo}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-center gap-2">
          {notifPermission === "default" && (
            <button
              onClick={requestNotifications}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted"
            >
              Enable alerts
            </button>
          )}
          {notifPermission === "granted" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              Alerts on
            </span>
          )}
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_TONE[order.status]}`}
          >
            {STATUS_LABELS[order.status]}
          </span>
        </div>
      </div>

      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Tracking {order.order_number}
        </h1>
        <p className="text-sm text-muted-foreground">
          Live delivery view for {order.full_name} • {order.city}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="space-y-3">
          <DeliveryMap
            rider={riderPos}
            destination={destPos}
            origin={HUB}
            path={path}
            breadcrumbs={breadcrumbs}
            className="h-[460px] w-full overflow-hidden rounded-2xl border border-border"
          />
          <div className="grid grid-cols-3 gap-3 text-sm">
            <KPI
              icon={<Clock className="h-4 w-4" />}
              label={etaSource === "fallback" ? "ETA (est.)" : "ETA"}
              value={routing ? "…" : eta}
              hint={etaSource === "fallback" ? "Live routing unavailable — distance-based estimate" : undefined}
            />
            <KPI icon={<Navigation className="h-4 w-4" />} label="Distance" value={dist} />
            <KPI
              icon={<Truck className="h-4 w-4" />}
              label="Rider"
              value={rider ? rider.full_name.split(" ")[0] : "Unassigned"}
            />
          </div>
        </section>

        <aside className="space-y-4">
          {/* Drop-off card */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Drop-off
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">{order.full_name}</p>
            <p className="text-sm text-muted-foreground">{order.address}</p>
            <p className="text-sm text-muted-foreground">{order.city}</p>
            <a
              href={`tel:${order.phone}`}
              className="mt-3 inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Phone className="h-4 w-4" /> {order.phone}
            </a>
            {!destPos && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
                Destination coordinates not set yet — ETA will appear once the rider is en route.
              </p>
            )}
          </div>

          {/* Rider card */}
          {rider && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Truck className="h-3.5 w-3.5" /> Rider
              </div>
              <p className="mt-2 text-sm font-medium">{rider.full_name}</p>
              <p className="text-sm text-muted-foreground">
                {rider.vehicle_type} {rider.plate_number ? `• ${rider.plate_number}` : ""}
              </p>
              <a
                href={`tel:${rider.phone}`}
                className="mt-2 inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Phone className="h-4 w-4" /> {rider.phone}
              </a>
              {rider.location_updated_at && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Last ping {new Date(rider.location_updated_at).toLocaleTimeString()}
                </p>
              )}
            </div>
          )}

          {/* Rider sharing controls */}
          {isRiderViewer && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Rider controls
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {!sharing ? (
                  <button
                    onClick={startSharing}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-burgundy px-4 py-2 text-sm font-semibold text-primary-foreground shadow-burgundy"
                  >
                    <Navigation className="h-4 w-4" /> Start sharing location
                  </button>
                ) : (
                  <button
                    onClick={stopSharing}
                    className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold text-foreground"
                  >
                    <CircleStop className="h-4 w-4" /> Stop sharing
                  </button>
                )}
                {nextStatus(order.status) && (
                  <button
                    onClick={advance}
                    className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"
                  >
                    Mark {STATUS_LABELS[nextStatus(order.status)!]}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Staff controls */}
          {isStaff && !isRiderViewer && nextStatus(order.status) && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Operations
              </p>
              <button
                onClick={advance}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"
              >
                <RefreshCw className="h-4 w-4" />
                Advance to {STATUS_LABELS[nextStatus(order.status)!]}
              </button>
            </div>
          )}

          {/* Timeline */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Delivery progress
            </p>
            <ol className="mt-3 space-y-2">
              {ORDER_STATUSES.map((s, i) => {
                const reached =
                  ORDER_STATUSES.indexOf(order.status) >= i || order.status === s;
                return (
                  <li key={s} className="flex items-center gap-3 text-sm">
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ${
                        reached
                          ? "bg-gradient-burgundy text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className={reached ? "text-foreground" : "text-muted-foreground"}>
                      {STATUS_LABELS[s]}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>
    </Container>
  );
}

function KPI({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3" title={hint}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 text-base font-semibold text-foreground">{value}</div>
      {hint && <div className="mt-1 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
