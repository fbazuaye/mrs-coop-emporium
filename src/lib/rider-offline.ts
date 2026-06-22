import type { Order } from "@/lib/orders";
import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight offline layer for the rider app.
 *
 * - Caches the rider's order list in localStorage so the app is usable
 *   without a connection (read-through cache).
 *
 * - Queues status-update mutations while offline and flushes them when the
 *   browser regains connectivity.
 *
 * Photo uploads (proof of delivery) require connectivity and are not queued.
 */

const ORDERS_KEY = (riderId: string) => `rider:orders:${riderId}`;
const QUEUE_KEY = "rider:pending-mutations";

export type PendingMutation =
  | { id: string; kind: "accept"; orderId: string; queuedAt: number }
  | { id: string; kind: "start"; orderId: string; queuedAt: number }
  | { id: string; kind: "out_for_delivery"; orderId: string; queuedAt: number };

const db = supabase as unknown as { from: (t: string) => any };

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

/* ---------------- Orders cache ---------------- */

export function loadCachedOrders(riderId: string): Order[] {
  if (typeof window === "undefined") return [];
  return safeParse<Order[]>(window.localStorage.getItem(ORDERS_KEY(riderId))) ?? [];
}

export function saveCachedOrders(riderId: string, orders: Order[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ORDERS_KEY(riderId), JSON.stringify(orders));
  } catch {
    // Quota or serialization issue — non-fatal.
  }
}

export function patchCachedOrder(riderId: string, orderId: string, patch: Partial<Order>): void {
  const list = loadCachedOrders(riderId);
  const next = list.map((o) => (o.id === orderId ? { ...o, ...patch } : o));
  saveCachedOrders(riderId, next);
}

/* ---------------- Mutation queue ---------------- */

export function loadQueue(): PendingMutation[] {
  if (typeof window === "undefined") return [];
  return safeParse<PendingMutation[]>(window.localStorage.getItem(QUEUE_KEY)) ?? [];
}

function saveQueue(items: PendingMutation[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export function enqueue(m: Omit<PendingMutation, "id" | "queuedAt">): PendingMutation {
  const item = { ...m, id: crypto.randomUUID(), queuedAt: Date.now() } as PendingMutation;
  saveQueue([...loadQueue(), item]);
  return item;
}

export function queueSize(): number {
  return loadQueue().length;
}

async function applyMutation(m: PendingMutation): Promise<void> {
  if (m.kind === "accept") {
    await db.from("orders").update({ rider_accepted_at: new Date(m.queuedAt).toISOString() }).eq("id", m.orderId);
  } else if (m.kind === "start") {
    await db.from("orders").update({ status: "picked_up" }).eq("id", m.orderId);
  } else if (m.kind === "out_for_delivery") {
    await db.from("orders").update({ status: "out_for_delivery" }).eq("id", m.orderId);
  }
}

let flushing = false;
export async function flushQueue(): Promise<{ flushed: number; remaining: number }> {
  if (flushing) return { flushed: 0, remaining: loadQueue().length };
  flushing = true;
  let flushed = 0;
  try {
    let queue = loadQueue();
    for (const m of queue) {
      if (!isOnline()) break;
      try {
        await applyMutation(m);
        queue = queue.filter((q) => q.id !== m.id);
        saveQueue(queue);
        flushed++;
      } catch {
        // Stop on first failure; leave remainder for next attempt.
        break;
      }
    }
    return { flushed, remaining: loadQueue().length };
  } finally {
    flushing = false;
  }
}

/* ---------------- Online listener ---------------- */

export function onConnectivityChange(cb: (online: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const on = () => cb(true);
  const off = () => cb(false);
  window.addEventListener("online", on);
  window.addEventListener("offline", off);
  return () => {
    window.removeEventListener("online", on);
    window.removeEventListener("offline", off);
  };
}

/* ---------------- Notifications ---------------- */

export async function requestRiderNotifications(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "default") {
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }
  return Notification.permission;
}

export function notify(title: string, body: string, tag?: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return; // Avoid duplicate w/ in-app toast
  try {
    new Notification(title, { body, tag, icon: "/icon-192.png", badge: "/icon-192.png" });
  } catch {
    /* ignore */
  }
}
