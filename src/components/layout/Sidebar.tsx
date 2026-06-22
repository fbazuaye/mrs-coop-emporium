import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, LogIn, LayoutDashboard, Settings2, Banknote, ClipboardCheck, Package, ShoppingBag, Truck, Bike } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { useAuth } from "@/hooks/use-auth";

export function Sidebar() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "store_owner" || role === "super_admin";
  const canReviewCredit = role === "credit_officer" || role === "super_admin" || role === "store_owner";
  const isRider = role === "rider" || role === "fleet_manager" || role === "super_admin";

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/" });
  };

  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 border-r border-border/60 bg-sidebar md:flex md:flex-col">
      <nav className="flex-1 space-y-1 p-4">
        <div className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Menu
        </div>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition hover:bg-sidebar-accent data-[status=active]:bg-gradient-burgundy data-[status=active]:text-primary-foreground data-[status=active]:shadow-burgundy"
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        ))}
        {user && (
          <Link
            to="/dashboard"
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition hover:bg-sidebar-accent data-[status=active]:bg-gradient-burgundy data-[status=active]:text-primary-foreground data-[status=active]:shadow-burgundy"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>
        )}
        {user && (
          <Link
            to="/orders"
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition hover:bg-sidebar-accent data-[status=active]:bg-gradient-burgundy data-[status=active]:text-primary-foreground data-[status=active]:shadow-burgundy"
          >
            <ShoppingBag className="h-5 w-5" />
            <span>My orders</span>
          </Link>
        )}
        {user && (
          <Link
            to="/credit"
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition hover:bg-sidebar-accent data-[status=active]:bg-gradient-burgundy data-[status=active]:text-primary-foreground data-[status=active]:shadow-burgundy"
          >
            <Banknote className="h-5 w-5" />
            <span>Buy on credit</span>
          </Link>
        )}
        {(isAdmin || role === "fleet_manager") && (
          <Link
            to="/admin/orders"
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition hover:bg-sidebar-accent data-[status=active]:bg-gradient-burgundy data-[status=active]:text-primary-foreground data-[status=active]:shadow-burgundy"
          >
            <Package className="h-5 w-5" />
            <span>Order management</span>
          </Link>
        )}
        {(isAdmin || role === "fleet_manager") && (
          <Link
            to="/admin/fleet"
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition hover:bg-sidebar-accent data-[status=active]:bg-gradient-burgundy data-[status=active]:text-primary-foreground data-[status=active]:shadow-burgundy"
          >
            <Truck className="h-5 w-5" />
            <span>Fleet management</span>
          </Link>
        )}
        {canReviewCredit && (
          <Link
            to="/credit-admin"
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition hover:bg-sidebar-accent data-[status=active]:bg-gradient-burgundy data-[status=active]:text-primary-foreground data-[status=active]:shadow-burgundy"
          >
            <ClipboardCheck className="h-5 w-5" />
            <span>Credit admin</span>
          </Link>
        )}
        {isAdmin && (
          <Link
            to="/admin/products"
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition hover:bg-sidebar-accent data-[status=active]:bg-gradient-burgundy data-[status=active]:text-primary-foreground data-[status=active]:shadow-burgundy"
          >
            <Settings2 className="h-5 w-5" />
            <span>Admin</span>
          </Link>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        {user ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign out</span>
          </button>
        ) : (
          <Link
            to="/auth"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
          >
            <LogIn className="h-5 w-5" />
            <span>Sign in</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
