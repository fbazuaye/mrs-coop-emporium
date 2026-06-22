import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

type NotificationsState = {
  items: Notification[];
  unread: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const Ctx = createContext<NotificationsState | undefined>(undefined);

// Untyped client until DB types regenerate.
const db = supabase as unknown as { from: (t: string) => any };

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setItems([]);
      seenIds.current.clear();
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await db
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      const rows = (data ?? []) as Notification[];
      setItems(rows);
      seenIds.current = new Set(rows.map((r) => r.id));
      setLoading(false);
    })();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notification;
          if (seenIds.current.has(n.id)) return;
          seenIds.current.add(n.id);
          setItems((prev) => [n, ...prev].slice(0, 50));
          toast(n.title, { description: n.body ?? undefined });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => prev.map((p) => (p.id === n.id ? n : p)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const id = (payload.old as { id: string }).id;
          seenIds.current.delete(id);
          setItems((prev) => prev.filter((p) => p.id !== id));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const value = useMemo<NotificationsState>(() => {
    const unread = items.filter((i) => !i.read_at).length;
    return {
      items,
      unread,
      loading,
      markRead: async (id) => {
        setItems((prev) => prev.map((p) => (p.id === id ? { ...p, read_at: new Date().toISOString() } : p)));
        await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
      },
      markAllRead: async () => {
        if (!user) return;
        const now = new Date().toISOString();
        setItems((prev) => prev.map((p) => (p.read_at ? p : { ...p, read_at: now })));
        await db.from("notifications").update({ read_at: now }).eq("user_id", user.id).is("read_at", null);
      },
      remove: async (id) => {
        setItems((prev) => prev.filter((p) => p.id !== id));
        await db.from("notifications").delete().eq("id", id);
      },
    };
  }, [items, loading, user?.id]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
