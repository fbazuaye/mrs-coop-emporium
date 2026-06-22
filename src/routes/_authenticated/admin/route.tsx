import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { Package, Tags, AlertTriangle, ArrowLeft, BarChart3 } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <Container>
        <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>
      </Container>
    );
  }

  const allowed = role === "store_owner" || role === "super_admin" || role === "fleet_manager";
  if (!allowed) {
    return (
      <Container>
        <div className="mx-auto max-w-md py-20 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-4 font-display text-xl font-semibold">Restricted area</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need Store Owner or Super Admin access to view this page.
          </p>
          <Link to="/dashboard" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="py-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Admin</div>
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Store management</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Link
              to="/admin/products"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold transition data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground sm:text-sm"
            >
              <Package className="h-4 w-4" /> Products
            </Link>
            <Link
              to="/admin/categories"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold transition data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground sm:text-sm"
            >
              <Tags className="h-4 w-4" /> Categories
            </Link>
            <Link
              to="/admin/analytics"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold transition data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground sm:text-sm"
            >
              <BarChart3 className="h-4 w-4" /> Analytics
            </Link>
          </nav>
        </div>
        <Outlet />
      </div>
    </Container>
  );
}
