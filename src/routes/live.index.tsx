import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Radio, Users, PlayCircle, Calendar } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { EmptyState } from "@/components/common/EmptyState";
import { fetchAllSessions, type LiveSession } from "@/lib/live";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "MRS Live — Shop while you watch" },
      {
        name: "description",
        content:
          "Join live shopping sessions hosted by MRS Coop. Chat with hosts, see featured products, and check out instantly.",
      },
      { property: "og:title", content: "MRS Live — Shop while you watch" },
      { property: "og:url", content: "/live" },
    ],
    links: [{ rel: "canonical", href: "/live" }],
  }),
  component: LivePage,
});

function LivePage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchAllSessions()
      .then((d) => {
        if (active) setSessions(d);
      })
      .finally(() => active && setLoading(false));

    const channel = supabase
      .channel("live-sessions-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_sessions" },
        () => {
          fetchAllSessions().then((d) => active && setSessions(d));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const liveNow = sessions.filter((s) => s.status === "live");
  const upcoming = sessions.filter((s) => s.status === "scheduled");
  const past = sessions.filter((s) => s.status === "ended");

  return (
    <Container>
      <div className="space-y-10 py-6 sm:py-10">
        <SectionHeading
          eyebrow="MRS Live"
          title="Shop while you watch"
          subtitle="Tune into live sessions from MRS Coop hosts. Chat, see featured products, and check out without leaving the stream."
        />

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="aspect-video animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : (
          <>
            <SessionGroup
              title="Live now"
              icon={<Radio className="h-4 w-4 text-destructive" />}
              sessions={liveNow}
              empty="No live sessions right now. Check back soon."
            />
            {upcoming.length > 0 && (
              <SessionGroup
                title="Upcoming"
                icon={<Calendar className="h-4 w-4 text-primary" />}
                sessions={upcoming}
                empty=""
              />
            )}
            {past.length > 0 && (
              <SessionGroup
                title="Recently ended"
                icon={<PlayCircle className="h-4 w-4 text-muted-foreground" />}
                sessions={past.slice(0, 6)}
                empty=""
              />
            )}
          </>
        )}
      </div>
    </Container>
  );
}

function SessionGroup({
  title,
  icon,
  sessions,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  sessions: LiveSession[];
  empty: string;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{sessions.length}</span>
      </div>
      {sessions.length === 0 ? (
        empty ? (
          <EmptyState icon={<Radio className="h-6 w-6" />} title={empty} description="" />
        ) : null
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => (
            <SessionCard key={s.id} s={s} />
          ))}
        </div>
      )}
    </section>
  );
}

function SessionCard({ s }: { s: LiveSession }) {
  const isLive = s.status === "live";
  return (
    <Link
      to="/live/$sessionId"
      params={{ sessionId: s.id }}
      className="group overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft transition hover:-translate-y-1 hover:shadow-premium"
    >
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary-deep via-primary to-primary-deep">
        {s.thumbnail_url ? (
          <img
            src={s.thumbnail_url}
            alt={s.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(244,180,0,0.25),transparent_55%)]" />
        )}
        {isLive && (
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-destructive-foreground shadow-md">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive-foreground" />
            Live
          </span>
        )}
        {s.viewer_peak > 0 && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
            <Users className="h-3 w-3" />
            {s.viewer_peak}
          </span>
        )}
      </div>
      <div className="space-y-1 p-4">
        <h3 className="line-clamp-2 font-semibold text-foreground">{s.title}</h3>
        <p className="text-xs text-muted-foreground">{s.host_name ?? "MRS Coop Live"}</p>
        {s.status === "scheduled" && s.scheduled_for && (
          <p className="text-xs text-primary">
            {new Date(s.scheduled_for).toLocaleString()}
          </p>
        )}
      </div>
    </Link>
  );
}
