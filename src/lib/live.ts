import { supabase } from "@/integrations/supabase/client";

// Local types since generated types haven't been regenerated yet
export type LiveStatus = "scheduled" | "live" | "ended";
export type LiveMessageKind = "chat" | "system" | "purchase";

export type LiveSession = {
  id: string;
  title: string;
  description: string | null;
  host_id: string | null;
  host_name: string | null;
  stream_url: string | null;
  thumbnail_url: string | null;
  status: LiveStatus;
  scheduled_for: string | null;
  started_at: string | null;
  ended_at: string | null;
  viewer_peak: number;
  created_at: string;
  updated_at: string;
};

export type LiveProduct = {
  id: string;
  session_id: string;
  product_id: string;
  live_price: number | null;
  is_spotlight: boolean;
  sort_order: number;
  created_at: string;
  product?: {
    id: string;
    name: string;
    price: number;
    discount_price: number | null;
    sku: string;
    images?: { url: string; is_primary: boolean }[];
  };
};

export type LiveMessage = {
  id: string;
  session_id: string;
  user_id: string | null;
  user_name: string | null;
  content: string;
  kind: LiveMessageKind;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function fetchActiveSessions(): Promise<LiveSession[]> {
  const { data, error } = await db
    .from("live_sessions")
    .select("*")
    .eq("status", "live")
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LiveSession[];
}

export async function fetchAllSessions(): Promise<LiveSession[]> {
  const { data, error } = await db
    .from("live_sessions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LiveSession[];
}

export async function fetchSession(id: string): Promise<LiveSession | null> {
  const { data, error } = await db.from("live_sessions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as LiveSession) ?? null;
}

export async function fetchSessionProducts(sessionId: string): Promise<LiveProduct[]> {
  const { data, error } = await db
    .from("live_session_products")
    .select("*, product:products(id,name,price,discount_price,sku,images:product_images(url,is_primary))")
    .eq("session_id", sessionId)
    .order("is_spotlight", { ascending: false })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as LiveProduct[];
}

export async function fetchRecentMessages(sessionId: string, limit = 80): Promise<LiveMessage[]> {
  const { data, error } = await db
    .from("live_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as LiveMessage[]).reverse();
}

export async function postMessage(input: {
  sessionId: string;
  content: string;
  userName: string;
  kind?: LiveMessageKind;
  metadata?: Record<string, unknown>;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in to chat");
  const { error } = await db.from("live_messages").insert({
    session_id: input.sessionId,
    user_id: u.user.id,
    user_name: input.userName,
    content: input.content,
    kind: input.kind ?? "chat",
    metadata: input.metadata ?? null,
  });
  if (error) throw error;
}

export type CreateSessionInput = {
  title: string;
  description?: string | null;
  host_name?: string | null;
  stream_url?: string | null;
  thumbnail_url?: string | null;
  scheduled_for?: string | null;
};

export async function createSession(input: CreateSessionInput): Promise<LiveSession> {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await db
    .from("live_sessions")
    .insert({ ...input, host_id: u.user?.id ?? null, status: "scheduled" })
    .select()
    .single();
  if (error) throw error;
  return data as LiveSession;
}

export async function updateSessionStatus(id: string, status: LiveStatus) {
  const patch: Record<string, unknown> = { status };
  if (status === "live") patch.started_at = new Date().toISOString();
  if (status === "ended") patch.ended_at = new Date().toISOString();
  const { error } = await db.from("live_sessions").update(patch).eq("id", id);
  if (error) throw error;
}

export async function updateSession(id: string, patch: Partial<CreateSessionInput>) {
  const { error } = await db.from("live_sessions").update(patch).eq("id", id);
  if (error) throw error;
}

export async function addSessionProduct(input: {
  sessionId: string;
  productId: string;
  livePrice?: number | null;
  isSpotlight?: boolean;
}) {
  const { error } = await db.from("live_session_products").insert({
    session_id: input.sessionId,
    product_id: input.productId,
    live_price: input.livePrice ?? null,
    is_spotlight: input.isSpotlight ?? false,
  });
  if (error) throw error;
}

export async function setSpotlight(sessionId: string, liveProductId: string) {
  await db.from("live_session_products").update({ is_spotlight: false }).eq("session_id", sessionId);
  const { error } = await db
    .from("live_session_products")
    .update({ is_spotlight: true })
    .eq("id", liveProductId);
  if (error) throw error;
}

export async function removeSessionProduct(id: string) {
  const { error } = await db.from("live_session_products").delete().eq("id", id);
  if (error) throw error;
}

export async function bumpViewerPeak(sessionId: string, viewers: number) {
  await db
    .from("live_sessions")
    .update({ viewer_peak: viewers })
    .eq("id", sessionId)
    .lt("viewer_peak", viewers);
}

export function pickPrimaryImage(p: LiveProduct["product"]): string | null {
  if (!p?.images?.length) return null;
  const primary = p.images.find((i) => i.is_primary);
  return (primary ?? p.images[0]).url;
}

export async function uploadLiveThumbnail(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("live-thumbnails")
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) throw error;
  // Bucket is private; use a long-lived signed URL (10 years) so the image
  // renders for anonymous viewers on the homepage and live pages.
  const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
  const { data, error: signErr } = await supabase.storage
    .from("live-thumbnails")
    .createSignedUrl(path, TEN_YEARS);
  if (signErr || !data?.signedUrl) throw signErr ?? new Error("Failed to sign thumbnail URL");
  return data.signedUrl;
}
