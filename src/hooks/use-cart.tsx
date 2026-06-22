import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  prevPrice?: number;
  emoji?: string;
  gradient?: string;
  image?: string;
  category?: string;
  quantity: number;
};

type AddInput = Omit<CartItem, "quantity"> & { quantity?: number };

type CartState = {
  items: CartItem[];
  count: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  syncing: boolean;
  add: (item: AddInput) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartState | undefined>(undefined);
const STORAGE_KEY = "mrs-coop-cart-v1";
const DELIVERY_FEE = 1500;
const FREE_DELIVERY_THRESHOLD = 50000;

type DbRow = {
  product_id: string;
  name: string;
  price: number;
  prev_price: number | null;
  quantity: number;
  emoji: string | null;
  gradient: string | null;
  image: string | null;
  category: string | null;
};

const rowToItem = (r: DbRow): CartItem => ({
  id: r.product_id,
  name: r.name,
  price: Number(r.price),
  prevPrice: r.prev_price ?? undefined,
  quantity: r.quantity,
  emoji: r.emoji ?? undefined,
  gradient: r.gradient ?? undefined,
  image: r.image ?? undefined,
  category: r.category ?? undefined,
});

const itemToRow = (userId: string, i: CartItem) => ({
  user_id: userId,
  product_id: i.id,
  name: i.name,
  price: i.price,
  prev_price: i.prevPrice ?? null,
  quantity: i.quantity,
  emoji: i.emoji ?? null,
  gradient: i.gradient ?? null,
  image: i.image ?? null,
  category: i.category ?? null,
});

function mergeCarts(a: CartItem[], b: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>();
  for (const i of a) map.set(i.id, { ...i });
  for (const i of b) {
    const existing = map.get(i.id);
    if (existing) existing.quantity = Math.max(existing.quantity, i.quantity);
    else map.set(i.id, { ...i });
  }
  return Array.from(map.values());
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const lastUserId = useRef<string | null>(null);
  const mergedForUser = useRef<string | null>(null);

  // Hydrate from localStorage once.
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persist locally as a fallback / offline cache.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, hydrated]);

  // On sign-in: merge local + server, write merged back to server.
  // On sign-out: clear in-memory cart (local copy remains for guest).
  useEffect(() => {
    if (!hydrated) return;
    const uid = user?.id ?? null;

    if (uid === lastUserId.current) return;
    lastUserId.current = uid;

    if (!uid) {
      mergedForUser.current = null;
      return;
    }

    let cancelled = false;
    (async () => {
      setSyncing(true);
      try {
        const { data, error } = await supabase
          .from("cart_items")
          .select("product_id,name,price,prev_price,quantity,emoji,gradient,image,category")
          .eq("user_id", uid);
        if (error) throw error;
        const serverItems = (data ?? []).map(rowToItem);
        const localItems = items;
        const merged = mergeCarts(serverItems, localItems);

        // Push merged result to server (upsert all, then prune anything not in merged).
        if (merged.length > 0) {
          const rows = merged.map((i) => itemToRow(uid, i));
          const { error: upErr } = await supabase
            .from("cart_items")
            .upsert(rows, { onConflict: "user_id,product_id" });
          if (upErr) throw upErr;
        }
        const keepIds = merged.map((i) => i.id);
        const delQuery = supabase.from("cart_items").delete().eq("user_id", uid);
        const { error: delErr } = keepIds.length
          ? await delQuery.not("product_id", "in", `(${keepIds.map((id) => `"${id.replace(/"/g, '""')}"`).join(",")})`)
          : await delQuery;
        if (delErr) throw delErr;

        if (!cancelled) {
          setItems(merged);
          mergedForUser.current = uid;
        }
      } catch (err) {
        console.error("[cart] sync failed", err);
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, hydrated]);

  const persistUpsert = useCallback(async (uid: string, item: CartItem) => {
    const { error } = await supabase
      .from("cart_items")
      .upsert(itemToRow(uid, item), { onConflict: "user_id,product_id" });
    if (error) console.error("[cart] upsert failed", error);
  }, []);

  const persistDelete = useCallback(async (uid: string, productId: string) => {
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", uid)
      .eq("product_id", productId);
    if (error) console.error("[cart] delete failed", error);
  }, []);

  const persistDeleteAll = useCallback(async (uid: string) => {
    const { error } = await supabase.from("cart_items").delete().eq("user_id", uid);
    if (error) console.error("[cart] clear failed", error);
  }, []);

  const add = useCallback(
    (input: AddInput) => {
      const qty = input.quantity ?? 1;
      let merged: CartItem | null = null;
      setItems((prev) => {
        const existing = prev.find((i) => i.id === input.id);
        if (existing) {
          merged = { ...existing, quantity: existing.quantity + qty };
          return prev.map((i) => (i.id === input.id ? merged! : i));
        }
        merged = { ...input, quantity: qty };
        return [...prev, merged];
      });
      toast.success(`${input.name} added to cart`);
      if (user && merged) void persistUpsert(user.id, merged);
    },
    [user, persistUpsert],
  );

  const remove = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (user) void persistDelete(user.id, id);
    },
    [user, persistDelete],
  );

  const setQty = useCallback(
    (id: string, qty: number) => {
      let updated: CartItem | null = null;
      setItems((prev) =>
        qty <= 0
          ? prev.filter((i) => i.id !== id)
          : prev.map((i) => {
              if (i.id !== id) return i;
              updated = { ...i, quantity: qty };
              return updated;
            }),
      );
      if (user) {
        if (qty <= 0) void persistDelete(user.id, id);
        else if (updated) void persistUpsert(user.id, updated);
      }
    },
    [user, persistDelete, persistUpsert],
  );

  const increment = useCallback(
    (id: string) => {
      let updated: CartItem | null = null;
      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== id) return i;
          updated = { ...i, quantity: i.quantity + 1 };
          return updated;
        }),
      );
      if (user && updated) void persistUpsert(user.id, updated);
    },
    [user, persistUpsert],
  );

  const decrement = useCallback(
    (id: string) => {
      let updated: CartItem | null = null;
      let removed = false;
      setItems((prev) =>
        prev.flatMap((i) => {
          if (i.id !== id) return [i];
          if (i.quantity <= 1) {
            removed = true;
            return [];
          }
          updated = { ...i, quantity: i.quantity - 1 };
          return [updated];
        }),
      );
      if (user) {
        if (removed) void persistDelete(user.id, id);
        else if (updated) void persistUpsert(user.id, updated);
      }
    },
    [user, persistDelete, persistUpsert],
  );

  const clear = useCallback(() => {
    setItems([]);
    if (user) void persistDeleteAll(user.id);
  }, [user, persistDeleteAll]);

  const value = useMemo<CartState>(() => {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const deliveryFee = items.length === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    return {
      items,
      count,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      syncing,
      add,
      remove,
      setQty,
      increment,
      decrement,
      clear,
    };
  }, [items, syncing, add, remove, setQty, increment, decrement, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
