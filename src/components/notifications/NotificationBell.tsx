import { useNavigate } from "@tanstack/react-router";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications, type Notification } from "@/hooks/use-notifications";
import { useAuth } from "@/hooks/use-auth";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const TYPE_TONE: Record<string, string> = {
  credit_submitted: "bg-blue-500",
  credit_under_review: "bg-amber-500",
  credit_approved: "bg-emerald-500",
  credit_rejected: "bg-rose-500",
  credit_repayment: "bg-indigo-500",
  credit_completed: "bg-slate-500",
};

export function NotificationBell() {
  const { user } = useAuth();
  const { items, unread, markRead, markAllRead, remove } = useNotifications();
  const navigate = useNavigate();

  if (!user) {
    return (
      <button
        type="button"
        aria-label="Notifications"
        className="relative grid h-10 w-10 place-items-center rounded-full text-foreground transition hover:bg-muted"
        onClick={() => void navigate({ to: "/auth" })}
      >
        <Bell className="h-5 w-5" />
      </button>
    );
  }

  const handleClick = async (n: Notification) => {
    if (!n.read_at) await markRead(n.id);
    if (n.link) void navigate({ to: n.link });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid h-10 w-10 place-items-center rounded-full text-foreground transition hover:bg-muted"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div>
            <div className="text-sm font-semibold">Notifications</div>
            <div className="text-[11px] text-muted-foreground">
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </div>
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-muted"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`group relative cursor-pointer px-4 py-3 transition hover:bg-muted/60 ${
                    n.read_at ? "" : "bg-primary/[0.03]"
                  }`}
                  onClick={() => void handleClick(n)}
                >
                  <div className="flex gap-3">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TYPE_TONE[n.type] ?? "bg-muted-foreground"}`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className={`text-sm ${n.read_at ? "font-medium text-foreground" : "font-semibold text-foreground"}`}>
                          {n.title}
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                      </div>
                      {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                    </div>
                  </div>
                  <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
                    {!n.read_at && (
                      <button
                        type="button"
                        aria-label="Mark as read"
                        onClick={(e) => {
                          e.stopPropagation();
                          void markRead(n.id);
                        }}
                        className="grid h-6 w-6 place-items-center rounded-md bg-background/80 text-muted-foreground hover:text-foreground"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        void remove(n.id);
                      }}
                      className="grid h-6 w-6 place-items-center rounded-md bg-background/80 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
