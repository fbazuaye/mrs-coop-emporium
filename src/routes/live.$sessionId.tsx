import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Radio, Users, Send, ShoppingCart, ArrowLeft, Sparkles, Plus } from "lucide-react";
import { toast } from "sonner";
import { Container } from "@/components/layout/Container";
import { BrandButton } from "@/components/brand/BrandButton";
import {
  fetchSession,
  fetchSessionProducts,
  fetchRecentMessages,
  postMessage,
  pickPrimaryImage,
  bumpViewerPeak,
  type LiveSession,
  type LiveProduct,
  type LiveMessage,
} from "@/lib/live";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/catalog-data";

export const Route = createFileRoute("/live/$sessionId")({
  head: ({ params }) => ({
    meta: [
      { title: "MRS Live — Watch & shop" },
      { property: "og:title", content: "MRS Live — Watch & shop" },
      { property: "og:url", content: `/live/${params.sessionId}` },
    ],
  }),
  component: LiveSessionPage,
});

function LiveSessionPage() {
  const { sessionId } = useParams({ from: "/live/$sessionId" });
  const { user } = useAuth();
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Member";
  const { add } = useCart();

  const [session, setSession] = useState<LiveSession | null>(null);
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [viewers, setViewers] = useState(1);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchSession(sessionId),
      fetchSessionProducts(sessionId),
      fetchRecentMessages(sessionId),
    ]).then(([s, p, m]) => {
      if (!active) return;
      setSession(s);
      setProducts(p);
      setMessages(m);
    });
    return () => {
      active = false;
    };
  }, [sessionId]);

  // realtime: chat + product/session updates
  useEffect(() => {
    const channel = supabase
      .channel(`live-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_messages", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as LiveMessage]);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_session_products", filter: `session_id=eq.${sessionId}` },
        () => {
          fetchSessionProducts(sessionId).then(setProducts);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          setSession(payload.new as LiveSession);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // presence-based viewer count
  useEffect(() => {
    const presence = supabase.channel(`live-presence-${sessionId}`, {
      config: { presence: { key: user?.id ?? `guest-${crypto.randomUUID()}` } },
    });
    presence
      .on("presence", { event: "sync" }, () => {
        const state = presence.presenceState();
        const count = Object.keys(state).length;
        setViewers(count);
        bumpViewerPeak(sessionId, count).catch(() => null);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presence.track({ at: new Date().toISOString() });
        }
      });
    return () => {
      supabase.removeChannel(presence);
    };
  }, [sessionId, user?.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const spotlight = useMemo(() => products.find((p) => p.is_spotlight) ?? products[0], [products]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (!user) {
      toast.error("Sign in to chat");
      return;
    }
    setSending(true);
    try {
      await postMessage({
        sessionId,
        content: input.trim(),
        userName: displayName,
      });
      setInput("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const buy = (lp: LiveProduct) => {
    if (!lp.product) return;
    const price = lp.live_price ?? lp.product.discount_price ?? lp.product.price;
    add({
      id: lp.product.id,
      name: lp.product.name,
      price: Number(price),
      prevPrice: lp.live_price ? Number(lp.product.price) : undefined,
      image: pickPrimaryImage(lp.product) ?? undefined,
    });
    if (user) {
      postMessage({
        sessionId,
        content: `🛒 Added ${lp.product.name} to cart`,
        userName: displayName,
        kind: "purchase",
      }).catch(() => null);
    }
    toast.success("Added to cart");
  };

  if (!session) {
    return (
      <Container>
        <div className="py-16 text-center text-muted-foreground">Loading live session…</div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="py-4 sm:py-6">
        <Link to="/live" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All live sessions
        </Link>

        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          {/* Player + spotlight */}
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl bg-black shadow-premium">
              <div className="aspect-video w-full">
                {(() => {
                  if (!session.stream_url) {
                    return (
                      <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary-deep via-primary to-primary-deep text-white/80">
                        <div className="text-center">
                          <Radio className="mx-auto h-10 w-10" />
                          <div className="mt-2 text-sm">Stream not yet started</div>
                        </div>
                      </div>
                    );
                  }
                  const embed = toEmbed(session.stream_url);
                  if (embed) {
                    return (
                      <iframe
                        src={embed}
                        className="h-full w-full"
                        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                        allowFullScreen
                        title={session.title}
                      />
                    );
                  }
                  if (/\.m3u8($|\?)|\.mp4($|\?)|\.webm($|\?)/i.test(session.stream_url)) {
                    return (
                      <video
                        src={session.stream_url}
                        controls
                        autoPlay
                        playsInline
                        className="h-full w-full bg-black object-contain"
                      />
                    );
                  }
                  return (
                    <div className="grid h-full w-full place-items-center bg-black text-center text-white/80">
                      <div className="space-y-2 p-6">
                        <Radio className="mx-auto h-10 w-10" />
                        <p className="text-sm">This stream URL can't be embedded here.</p>
                        <a
                          href={session.stream_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold hover:bg-white/20"
                        >
                          Open stream in new tab
                        </a>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="absolute left-3 top-3 flex items-center gap-2">
                {session.status === "live" && (
                  <span className="flex items-center gap-1.5 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-destructive-foreground">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive-foreground" />
                    Live
                  </span>
                )}
                <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                  <Users className="h-3 w-3" />
                  {viewers} watching
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
              <h1 className="font-display text-xl font-semibold text-foreground sm:text-2xl">
                {session.title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {session.host_name ?? "MRS Coop Live"}
              </p>
              {session.description && (
                <p className="mt-3 text-sm text-foreground/80">{session.description}</p>
              )}
            </div>

            {/* Spotlight */}
            {spotlight?.product && (
              <div className="rounded-2xl border border-accent/40 bg-gradient-to-br from-accent-soft/30 to-card p-4 shadow-gold">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> Spotlight
                </div>
                <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                  <div className="h-20 w-20 overflow-hidden rounded-xl bg-muted">
                    {pickPrimaryImage(spotlight.product) ? (
                      <img
                        src={pickPrimaryImage(spotlight.product)!}
                        alt={spotlight.product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-2xl">📦</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-foreground">
                      {spotlight.product.name}
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-display text-lg font-bold text-primary">
                        {formatPrice(Number(spotlight.live_price ?? spotlight.product.discount_price ?? spotlight.product.price))}
                      </span>
                      {spotlight.live_price && (
                        <span className="text-xs text-muted-foreground line-through">
                          {formatPrice(Number(spotlight.product.price))}
                        </span>
                      )}
                    </div>
                  </div>
                  <BrandButton variant="gold" size="md" onClick={() => buy(spotlight)}>
                    <ShoppingCart className="h-4 w-4" /> Buy now
                  </BrandButton>
                </div>
              </div>
            )}

            {/* All featured products */}
            {products.length > 1 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Featured in this stream
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {products
                    .filter((p) => p.id !== spotlight?.id)
                    .map((p) => (
                      <ProductMini key={p.id} lp={p} onBuy={() => buy(p)} />
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Chat */}
          <div className="flex h-[70vh] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft lg:h-[calc(100vh-9rem)]">
            <div className="border-b border-border/60 p-3 text-sm font-semibold">Live chat</div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {messages.length === 0 && (
                <p className="text-center text-xs text-muted-foreground">Be the first to say hi 👋</p>
              )}
              {messages.map((m) => (
                <ChatBubble key={m.id} m={m} />
              ))}
              <div ref={chatBottomRef} />
            </div>
            <form onSubmit={send} className="flex items-center gap-2 border-t border-border/60 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={user ? "Say something…" : "Sign in to chat"}
                disabled={!user || sending}
                className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={!input.trim() || !user || sending}
                className="grid h-9 w-9 place-items-center rounded-full bg-gradient-burgundy text-primary-foreground shadow-burgundy disabled:opacity-50"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </Container>
  );
}

function ProductMini({ lp, onBuy }: { lp: LiveProduct; onBuy: () => void }) {
  if (!lp.product) return null;
  const img = pickPrimaryImage(lp.product);
  const price = Number(lp.live_price ?? lp.product.discount_price ?? lp.product.price);
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-soft">
      <div className="aspect-square bg-muted">
        {img ? (
          <img src={img} alt={lp.product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-3xl">📦</div>
        )}
      </div>
      <div className="space-y-2 p-2">
        <div className="line-clamp-2 text-xs font-medium">{lp.product.name}</div>
        <div className="text-sm font-bold text-primary">{formatPrice(price)}</div>
        <button
          type="button"
          onClick={onBuy}
          className="flex w-full items-center justify-center gap-1 rounded-full bg-primary/10 py-1.5 text-xs font-semibold text-primary hover:bg-gradient-burgundy hover:text-primary-foreground"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
    </div>
  );
}

function ChatBubble({ m }: { m: LiveMessage }) {
  if (m.kind === "purchase") {
    return (
      <div className="rounded-lg bg-accent-soft/40 px-3 py-1.5 text-xs text-foreground">
        <span className="font-semibold">{m.user_name ?? "Someone"}</span> {m.content.replace(/^🛒\s*/, "")}
      </div>
    );
  }
  if (m.kind === "system") {
    return <div className="text-center text-xs text-muted-foreground">{m.content}</div>;
  }
  return (
    <div className="text-sm">
      <span className="mr-1 font-semibold text-primary">{m.user_name ?? "Member"}:</span>
      <span className="text-foreground/90">{m.content}</span>
    </div>
  );
}

function toEmbed(url: string): string | null {
  // YouTube — supports watch?v=, youtu.be/, /live/, /shorts/, /embed/
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/,
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&playsinline=1&rel=0`;
  // Vimeo
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1`;
  return null;
}
