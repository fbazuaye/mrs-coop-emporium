import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Camera,
  Check,
  MapPin,
  Navigation,
  Phone,
  Truck,
  PackageCheck,
  Loader2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
// auth handled by parent layout
import {
  acceptAssignment,
  completeDelivery,
  markOutForDelivery,
  navigationUrl,
  startDelivery,
  calcPayout,
} from "@/lib/rider";
import { fetchOrderById } from "@/lib/tracking";
import { fetchOrderItems, formatNaira, STATUS_LABELS, STATUS_TONE, type Order, type OrderItem } from "@/lib/orders";

export const Route = createFileRoute("/_authenticated/rider/$orderId")({
  component: RiderOrderDetail,
});

function RiderOrderDetail() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showPod, setShowPod] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const load = async () => {
    const [o, its] = await Promise.all([fetchOrderById(orderId), fetchOrderItems(orderId)]);
    setOrder(o);
    setItems(its);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (loading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!order) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card p-6 text-center text-sm">
        Order not found.{" "}
        <Link to="/rider" className="font-semibold text-primary">
          Back
        </Link>
      </div>
    );
  }

  const payout = calcPayout(order);
  const canAccept = order.status === "assigned_rider" && !order.rider_accepted_at;
  const canStart = order.status === "assigned_rider" && !!order.rider_accepted_at;
  const canOutForDelivery = order.status === "picked_up";
  const canComplete = order.status === "out_for_delivery" || order.status === "picked_up";

  const run = async (label: string, fn: () => Promise<void>) => {
    try {
      setBusy(true);
      await fn();
      toast.success(label);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async () => {
    if (!recipient.trim()) {
      toast.error("Recipient name is required");
      return;
    }
    try {
      setBusy(true);
      await completeDelivery({ orderId, recipientName: recipient.trim(), notes: notes.trim() || undefined, photoFile: photo });
      toast.success("Delivery completed");
      setShowPod(false);
      void navigate({ to: "/rider" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to complete");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Link to="/rider" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <section className="rounded-3xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{order.order_number}</div>
            <h1 className="mt-1 font-display text-xl font-semibold">{order.full_name}</h1>
            <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[order.status]}`}>
              {STATUS_LABELS[order.status]}
            </span>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-muted-foreground">Payout</div>
            <div className="font-display text-lg font-bold text-primary">{formatNaira(payout)}</div>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{order.address}, {order.city}</span>
          </div>
          <a href={`tel:${order.phone}`} className="flex items-center gap-2 text-primary">
            <Phone className="h-4 w-4" /> {order.phone}
          </a>
          {order.notes && (
            <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">Notes: {order.notes}</p>
          )}
        </div>

        <a
          href={navigationUrl(order)}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-background"
        >
          <Navigation className="h-4 w-4" /> Open in Google Maps
        </a>
        <Link
          to="/track/$orderId"
          params={{ orderId: order.id }}
          className="mt-2 flex items-center justify-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground"
        >
          Live map view
        </Link>
      </section>

      <section className="rounded-3xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Items ({items.length})</h2>
        <ul className="mt-2 divide-y divide-border">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="truncate">
                {it.emoji && <span className="mr-1">{it.emoji}</span>}
                {it.name} <span className="text-muted-foreground">× {it.quantity}</span>
              </span>
              <span className="font-semibold">{formatNaira(it.price * it.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-display text-base font-bold">{formatNaira(order.total)}</span>
        </div>
      </section>

      {!showPod ? (
        <section className="space-y-2">
          {canAccept && (
            <ActionButton onClick={() => run("Assignment accepted", () => acceptAssignment(orderId))} busy={busy} icon={Check}>
              Accept assignment
            </ActionButton>
          )}
          {canStart && (
            <ActionButton onClick={() => run("Picked up", () => startDelivery(orderId))} busy={busy} icon={Truck}>
              Mark picked up
            </ActionButton>
          )}
          {canOutForDelivery && (
            <ActionButton onClick={() => run("Out for delivery", () => markOutForDelivery(orderId))} busy={busy} icon={Navigation}>
              Out for delivery
            </ActionButton>
          )}
          {canComplete && (
            <ActionButton onClick={() => setShowPod(true)} busy={busy} icon={PackageCheck} variant="primary">
              Complete delivery
            </ActionButton>
          )}
          {order.status === "delivered" && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="flex items-center gap-2 font-semibold">
                <PackageCheck className="h-4 w-4" /> Delivered
              </div>
              {order.pod_recipient_name && (
                <div className="mt-1 text-xs">Received by {order.pod_recipient_name}</div>
              )}
              {order.pod_captured_at && (
                <div className="mt-0.5 flex items-center gap-1 text-xs opacity-80">
                  <Clock className="h-3 w-3" />
                  {new Date(order.pod_captured_at).toLocaleString()}
                </div>
              )}
              {order.pod_photo_url && (
                <a href={order.pod_photo_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold underline">
                  View proof photo
                </a>
              )}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-3 rounded-3xl border border-border bg-card p-4">
          <h2 className="font-display text-base font-semibold">Proof of delivery</h2>
          <div className="space-y-1.5">
            <Label htmlFor="recipient">Received by *</Label>
            <Input id="recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Recipient name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pod-notes">Notes (optional)</Label>
            <Textarea id="pod-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Left with security, etc." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pod-photo" className="flex items-center gap-1.5">
              <Camera className="h-4 w-4" /> Photo (optional)
            </Label>
            <input
              id="pod-photo"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary-foreground"
            />
            {photo && <p className="text-xs text-muted-foreground">{photo.name}</p>}
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setShowPod(false)} disabled={busy}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleComplete} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm delivery"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function ActionButton({
  onClick,
  busy,
  icon: Icon,
  children,
  variant = "default",
}: {
  onClick: () => void;
  busy: boolean;
  icon: typeof Check;
  children: React.ReactNode;
  variant?: "default" | "primary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold transition disabled:opacity-60 ${
        variant === "primary"
          ? "bg-gradient-burgundy text-primary-foreground shadow-burgundy"
          : "border border-border bg-card hover:bg-muted"
      }`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}
