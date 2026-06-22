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
