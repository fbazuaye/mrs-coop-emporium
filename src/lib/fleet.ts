import { supabase } from "@/integrations/supabase/client";

export type RiderStatus = "available" | "on_delivery" | "off_duty" | "suspended";
export type VehicleType = "motorcycle" | "bicycle" | "car" | "van";

export type Rider = {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string;
  vehicle_type: VehicleType;
  plate_number: string | null;
  zone: string | null;
  status: RiderStatus;
  rating: number;
  total_deliveries: number;
  notes: string | null;
  current_lat: number | null;
  current_lng: number | null;
  location_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export const RIDER_STATUS_LABEL: Record<RiderStatus, string> = {
  available: "Available",
  on_delivery: "On delivery",
  off_duty: "Off duty",
  suspended: "Suspended",
};

export const RIDER_STATUS_TONE: Record<RiderStatus, string> = {
  available: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  on_delivery: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  off_duty: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  suspended: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

export const VEHICLE_LABEL: Record<VehicleType, string> = {
  motorcycle: "Motorcycle",
  bicycle: "Bicycle",
  car: "Car",
  van: "Van",
};

const db = supabase as unknown as { from: (t: string) => any };

export async function fetchRiders(): Promise<Rider[]> {
  const { data, error } = await db.from("riders").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Rider[];
}

export async function createRider(input: Omit<Rider, "id" | "created_at" | "updated_at" | "rating" | "total_deliveries" | "current_lat" | "current_lng" | "location_updated_at"> & { rating?: number }): Promise<Rider> {
  const { data, error } = await db.from("riders").insert(input).select("*").single();
  if (error) throw error;
  return data as Rider;
}

export async function updateRider(id: string, patch: Partial<Rider>): Promise<void> {
  const { error } = await db.from("riders").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteRider(id: string): Promise<void> {
  const { error } = await db.from("riders").delete().eq("id", id);
  if (error) throw error;
}

export async function assignRiderToOrder(orderId: string, riderId: string): Promise<void> {
  const { error } = await db
    .from("orders")
    .update({ assigned_rider_id: riderId, status: "assigned_rider" })
    .eq("id", orderId);
  if (error) throw error;
}

export async function bulkAssignRider(orderIds: string[], riderId: string): Promise<void> {
  if (orderIds.length === 0) return;
  const { error } = await db
    .from("orders")
    .update({ assigned_rider_id: riderId, status: "assigned_rider" })
    .in("id", orderIds);
  if (error) throw error;
}

export async function bulkReassignRider(orderIds: string[], riderId: string): Promise<void> {
  if (orderIds.length === 0) return;
  // Re-assignment keeps current status if already past assignment; otherwise sets to assigned_rider.
  const { error } = await db
    .from("orders")
    .update({ assigned_rider_id: riderId })
    .in("id", orderIds);
  if (error) throw error;
}
