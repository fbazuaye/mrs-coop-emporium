import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Bike, Wallet } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/rider")({
  component: RiderLayout,
});

function RiderLayout() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <Container>
        <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>
      </Container>
    );
  }

  const allowed = role === "rider" || role === "fleet_manager" || role === "super_admin";
  if (!allowed) {
    return (
      <Container>
        <div className="mx-auto max-w-md py-20 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-4 font-display text-xl font-semibold">Rider access only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need a rider profile to view the rider app.
          </p>
          <Link to="/dashboard" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-4 sm:py-6">
      <header className="mb-4 flex items-center justify-between">
        <Link to="/rider" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-burgundy text-primary-foreground shadow-burgundy">
            <Bike className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Rider</div>
            <div className="text-sm font-semibold leading-tight">My deliveries</div>
          </div>
        </Link>
        <Link
          to="/rider/earnings"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold"
        >
          <Wallet className="h-4 w-4" /> Earnings
        </Link>
      </header>
      <Outlet />
    </div>
  );
}
