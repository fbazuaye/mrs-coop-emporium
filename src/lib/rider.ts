import { supabase } from "@/integrations/supabase/client";
import type { Order, OrderStatus } from "@/lib/orders";
import type { Rider } from "@/lib/fleet";

const db = supabase as unknown as { from: (t: string) => any };

/** Default rider payout share of the delivery fee. */
export const RIDER_PAYOUT_SHARE = 0.75;

export function calcPayout(order: Pick<Order, "delivery_fee" | "rider_payout">): number {
  if (order.rider_payout != null) return Number(order.rider_payout);
  return Math.round((order.delivery_fee || 0) * RIDER_PAYOUT_SHARE);
}

export async function fetchRiderForUser(userId: string): Promise<Rider | null> {
  const { data, error } = await db
    .from("riders")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Rider | null;
}

export type RiderOrderBucket = "assigned" | "active" | "completed";

export const ACTIVE_STATUSES: OrderStatus[] = ["picked_up", "out_for_delivery"];
export const ASSIGNED_STATUSES: OrderStatus[] = ["assigned_rider"];
export const COMPLETED_STATUSES: OrderStatus[] = ["delivered", "cancelled"];

export async function fetchRiderOrders(riderId: string): Promise<Order[]> {
  const { data, error } = await db
    .from("orders")
    .select("*")
    .eq("assigned_rider_id", riderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Order[];
}

export function bucketOrders(orders: Order[]) {
  return {
    assigned: orders.filter((o) => ASSIGNED_STATUSES.includes(o.status)),
    active: orders.filter((o) => ACTIVE_STATUSES.includes(o.status)),
    completed: orders.filter((o) => COMPLETED_STATUSES.includes(o.status)),
  };
}

export async function acceptAssignment(orderId: string): Promise<{ queued: boolean }> {
  const { enqueue, isOnline } = await import("./rider-offline");
  const ts = new Date().toISOString();
  if (!isOnline()) {
    enqueue({ kind: "accept", orderId });
    return { queued: true };
  }
  const { error } = await db.from("orders").update({ rider_accepted_at: ts }).eq("id", orderId);
  if (error) {
    enqueue({ kind: "accept", orderId });
    return { queued: true };
  }
  return { queued: false };
}

export async function startDelivery(orderId: string): Promise<{ queued: boolean }> {
  const { enqueue, isOnline } = await import("./rider-offline");
  if (!isOnline()) {
    enqueue({ kind: "start", orderId });
    return { queued: true };
  }
  const { error } = await db.from("orders").update({ status: "picked_up" as OrderStatus }).eq("id", orderId);
  if (error) {
    enqueue({ kind: "start", orderId });
    return { queued: true };
  }
  return { queued: false };
}

export async function markOutForDelivery(orderId: string): Promise<{ queued: boolean }> {
  const { enqueue, isOnline } = await import("./rider-offline");
  if (!isOnline()) {
    enqueue({ kind: "out_for_delivery", orderId });
    return { queued: true };
  }
  const { error } = await db.from("orders").update({ status: "out_for_delivery" as OrderStatus }).eq("id", orderId);
  if (error) {
    enqueue({ kind: "out_for_delivery", orderId });
    return { queued: true };
  }
  return { queued: false };
}

export async function completeDelivery(input: {
  orderId: string;
  recipientName: string;
  notes?: string;
  photoFile?: File | null;
}): Promise<void> {
  let photoUrl: string | null = null;
  if (input.photoFile) {
    const ext = input.photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${input.orderId}/pod-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("delivery-proof")
      .upload(path, input.photoFile, { upsert: true, contentType: input.photoFile.type });
    if (upErr) throw upErr;
    const { data: signed } = await supabase.storage
      .from("delivery-proof")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    photoUrl = signed?.signedUrl ?? path;
  }
  const { error } = await db
    .from("orders")
    .update({
      status: "delivered" as OrderStatus,
      pod_recipient_name: input.recipientName,
      pod_notes: input.notes ?? null,
      pod_photo_url: photoUrl,
      pod_captured_at: new Date().toISOString(),
    })
    .eq("id", input.orderId);
  if (error) throw error;
}

export function totalEarnings(orders: Order[]): number {
  return orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + calcPayout(o), 0);
}

export function earningsForPeriod(orders: Order[], sinceDays: number): number {
  const cutoff = Date.now() - sinceDays * 24 * 60 * 60 * 1000;
  return orders
    .filter((o) => o.status === "delivered" && new Date(o.delivered_at ?? o.updated_at).getTime() >= cutoff)
    .reduce((sum, o) => sum + calcPayout(o), 0);
}

export function navigationUrl(o: Pick<Order, "dest_lat" | "dest_lng" | "address" | "city">): string {
  if (o.dest_lat != null && o.dest_lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${o.dest_lat},${o.dest_lng}&travelmode=driving`;
  }
  const q = encodeURIComponent(`${o.address}, ${o.city}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=driving`;
}
