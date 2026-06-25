import { supabase } from "@/integrations/supabase/client";
import type { Order } from "@/lib/orders";
import type { Rider } from "@/lib/fleet";

const db = supabase as unknown as { from: (t: string) => any };

export type RiderPing = {
  id: string;
  rider_id: string;
  order_id: string | null;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  created_at: string;
};

export async function fetchOrderById(id: string): Promise<Order | null> {
  const { data, error } = await db.from("orders").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as Order | null;
}

export async function fetchRiderById(id: string): Promise<Rider | null> {
  const { data, error } = await db.from("riders").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as Rider | null;
}

/**
 * Safe rider lookup for customers: returns only non-sensitive fields
 * (name, rating, current map position) for an order they own.
 * Falls back to the full rider record when the caller is staff/rider
 * and has direct SELECT access on the riders table.
 */
export async function fetchRiderForOrder(orderId: string, riderId: string): Promise<Partial<Rider> | null> {
  // Try direct (staff / assigned rider with RLS access)
  const direct = await db.from("riders").select("*").eq("id", riderId).maybeSingle();
  if (!direct.error && direct.data) return direct.data as Rider;

  // Customer path: safe RPC that returns only public-safe fields
  const { data, error } = await (supabase as any).rpc("get_rider_for_my_order", { _order_id: orderId });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? null) as Partial<Rider> | null;
}

export async function fetchRecentPings(orderId: string, limit = 50): Promise<RiderPing[]> {
  const { data, error } = await db
    .from("rider_locations")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as RiderPing[]).reverse();
}

export async function recordRiderPing(input: {
  rider_id: string;
  order_id: string;
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
}): Promise<void> {
  const { error: insertErr } = await db.from("rider_locations").insert(input);
  if (insertErr) throw insertErr;
  const { error: updErr } = await db
    .from("riders")
    .update({
      current_lat: input.lat,
      current_lng: input.lng,
      location_updated_at: new Date().toISOString(),
    })
    .eq("id", input.rider_id);
  if (updErr) throw updErr;
}

/** Decode a Google encoded polyline into [lng, lat] pairs */
export function decodePolyline(str: string): { lat: number; lng: number }[] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coords: { lat: number; lng: number }[] = [];
  while (index < str.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    coords.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return coords;
}

export function formatEta(seconds: number): string {
  if (!seconds || seconds < 60) return "<1 min";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Great-circle distance between two coordinates, in meters. */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Distance-based ETA fallback when the Routes API is unavailable or returns a
 * low-confidence result. Inflates straight-line distance by 1.3 to approximate
 * road travel and assumes an urban two-wheeler average of 22 km/h plus a small
 * handover buffer.
 */
export function estimateFallbackEta(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): { distanceMeters: number; durationSeconds: number; confidence: "low" } {
  const straight = haversineMeters(origin, destination);
  const distanceMeters = Math.round(straight * 1.3);
  const avgSpeedMps = (22 * 1000) / 3600; // 22 km/h
  const durationSeconds = Math.round(distanceMeters / avgSpeedMps) + 90;
  return { distanceMeters, durationSeconds, confidence: "low" };
}

/** Flag Routes API results we should not trust. */
export function isLowConfidenceRoute(r: {
  distanceMeters: number;
  durationSeconds: number;
}): boolean {
  if (!r) return true;
  if (r.durationSeconds <= 0 || r.distanceMeters <= 0) return true;
  const speedKph = r.distanceMeters / 1000 / (r.durationSeconds / 3600);
  return speedKph > 90; // implausibly fast → likely bad data
}
