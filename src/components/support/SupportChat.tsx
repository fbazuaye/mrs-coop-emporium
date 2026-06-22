import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Bot, MessageCircle, Send, Trash2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  getSupportHistory,
  clearSupportHistory,
  type SupportMessageRow,
} from "@/lib/support.functions";

const SUGGESTIONS = [
  "Show rice under ₦20,000",
  "Track my order",
  "Which products qualify for credit?",
  "How do I update my account?",
];

function rowsToMessages(rows: SupportMessageRow[]): UIMessage[] {
  return rows.map((r) => ({
    id: r.id,
    role: r.role,
    parts: [{ type: "text", text: r.content }],
  })) as UIMessage[];
}

export function SupportChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open || !user || initial !== null) return;
    setLoadingHistory(true);
    getSupportHistory()
      .then((rows) => setInitial(rowsToMessages(rows)))
      .catch((err) => {
        console.error(err);
        setInitial([]);
      })
      .finally(() => setLoadingHistory(false));
  }, [open, user, initial]);

  const transport = useRef(
    new DefaultChatTransport({
      api: "/api/chat",
      fetch: async (url, init) => {
        const { data } = await supabase.auth.getSession();
        const headers = new Headers(init?.headers);
        if (data.session?.access_token) {
          headers.set("Authorization", `Bearer ${data.session.access_token}`);
        }
        return fetch(url, { ...init, headers });
      },
    }),
  ).current;

  const { messages, sendMessage, setMessages, status, error } = useChat({
    id: user?.id ?? "guest",
    messages: initial ?? [],
    transport,
    onError: (err) => {
      console.error(err);
      toast.error("AI Support is unavailable right now. Please try again.");
    },
  });

  useEffect(() => {
    if (initial && messages.length === 0 && initial.length > 0) {
      setMessages(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, loadingHistory]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, status]);

  const isLoading = status === "submitted" || status === "streaming";

  const submit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    await sendMessage({ text: trimmed });
  };

  const handleClear = async () => {
    if (!user) {
      setMessages([]);
      return;
    }
    try {
      await clearSupportHistory();
      setMessages([]);
      setInitial([]);
      toast.success("Chat cleared");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't clear chat");
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open AI Support"
          className="fixed bottom-24 right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-gradient-burgundy text-primary-foreground shadow-premium transition hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed inset-x-3 bottom-24 z-50 flex max-h-[80dvh] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-premium sm:inset-x-auto sm:right-4 sm:w-[380px] md:bottom-6 md:right-6 md:w-[400px]">
          <header className="flex items-center gap-3 border-b border-border/60 bg-gradient-burgundy px-4 py-3 text-primary-foreground">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm font-semibold">AI Support</div>
              <div className="text-[11px] opacity-80">Online · Cooperative assistant</div>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear chat"
                className="grid h-8 w-8 place-items-center rounded-full text-primary-foreground/80 transition hover:bg-white/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close AI Support"
              className="grid h-8 w-8 place-items-center rounded-full text-primary-foreground/80 transition hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto bg-muted/30 px-3 py-4"
          >
            {loadingHistory && (
              <div className="text-center text-xs text-muted-foreground">Loading…</div>
            )}
            {!loadingHistory && messages.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-2xl bg-card p-3 text-sm text-foreground shadow-soft">
                  👋 Hi! I'm <strong>AI Support</strong>. I can help with products,
                  delivery, credit, orders, and your account. Try one of these:
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => submit(s)}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {!user && (
                  <p className="text-[11px] text-muted-foreground">
                    Sign in to keep your chat history across visits.
                  </p>
                )}
              </div>
            )}
            {messages.map((m) => {
              const text = m.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("");
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={
                      isUser
                        ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground shadow-soft"
                        : "max-w-[90%] rounded-2xl rounded-bl-sm bg-card px-3 py-2 text-sm text-foreground shadow-soft"
                    }
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{text}</p>
                    ) : (
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-headings:my-2">
                        <ReactMarkdown>{text || "…"}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {status === "submitted" && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-card px-3 py-2 text-sm text-muted-foreground shadow-soft">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                  </span>
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                Something went wrong. Please retry.
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit(input);
            }}
            className="flex items-end gap-2 border-t border-border/60 bg-card px-3 py-3"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit(input);
                }
              }}
              rows={1}
              placeholder="Ask about products, orders, credit…"
              className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-input bg-muted/40 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-hidden focus:ring-2 focus:ring-ring/30"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-burgundy text-primary-foreground shadow-soft transition hover:opacity-90 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
