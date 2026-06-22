import { supabase } from "@/integrations/supabase/client";

export type OrderStatus =
  | "order_received"
  | "approved"
  | "processing"
  | "packed"
  | "assigned_rider"
  | "picked_up"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type OrderPaymentMethod = "pay_now" | "credit";

export type Order = {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  payment_method: OrderPaymentMethod;
  subtotal: number;
  delivery_fee: number;
  total: number;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  notes: string | null;
  assigned_rider_id: string | null;
  status_history: { status: OrderStatus; at: string }[];
  approved_at: string | null;
  processed_at: string | null;
  packed_at: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
  emoji: string | null;
  gradient: string | null;
  category: string | null;
};

export const ORDER_STATUSES: OrderStatus[] = [
  "order_received",
  "approved",
  "processing",
  "packed",
  "assigned_rider",
  "picked_up",
  "out_for_delivery",
  "delivered",
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  order_received: "Order Received",
  approved: "Approved",
  processing: "Processing",
  packed: "Packed",
  assigned_rider: "Assigned Rider",
  picked_up: "Picked Up",
  out_for_delivery: "Out For Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_TONE: Record<OrderStatus, string> = {
  order_received: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  approved: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  processing: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  packed: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  assigned_rider: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  picked_up: "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200",
  out_for_delivery: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  delivered: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

const db = supabase as unknown as { from: (t: string) => any };

export function nextStatus(s: OrderStatus): OrderStatus | null {
  const i = ORDER_STATUSES.indexOf(s);
  if (i < 0 || i >= ORDER_STATUSES.length - 1) return null;
  return ORDER_STATUSES[i + 1];
}

export function formatNaira(n: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export async function createOrder(input: {
  user_id: string;
  payment_method: OrderPaymentMethod;
  subtotal: number;
  delivery_fee: number;
  total: number;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  notes?: string;
  items: Array<{
    product_id?: string | null;
    name: string;
    price: number;
    quantity: number;
    image?: string | null;
    emoji?: string | null;
    gradient?: string | null;
    category?: string | null;
  }>;
}): Promise<Order> {
  const { items, ...orderFields } = input;
  const { data, error } = await db
    .from("orders")
    .insert({ ...orderFields, notes: orderFields.notes ?? null })
    .select("*")
    .single();
  if (error) throw error;
  const order = data as Order;

  if (items.length > 0) {
    const rows = items.map((i) => ({
      order_id: order.id,
      product_id: i.product_id ?? null,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      image: i.image ?? null,
      emoji: i.emoji ?? null,
      gradient: i.gradient ?? null,
      category: i.category ?? null,
    }));
    const { error: itemsError } = await db.from("order_items").insert(rows);
    if (itemsError) throw itemsError;
  }
  return order;
}

export async function fetchMyOrders(userId: string): Promise<Order[]> {
  const { data, error } = await db
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Order[];
}

export async function fetchAllOrders(): Promise<Order[]> {
  const { data, error } = await db
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Order[];
}

export async function fetchOrderItems(orderId: string): Promise<OrderItem[]> {
  const { data, error } = await db
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);
  if (error) throw error;
  return (data ?? []) as OrderItem[];
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  patch: { assigned_rider_id?: string | null } = {},
): Promise<void> {
  const { error } = await db.from("orders").update({ status, ...patch }).eq("id", id);
  if (error) throw error;
}
