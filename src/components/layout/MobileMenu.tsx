import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Menu, LogOut, LogIn, LayoutDashboard, Settings2, Banknote, ClipboardCheck,
  Package, ShoppingBag, Truck, Bike, Radio, User,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NAV_ITEMS } from "@/lib/nav";
import { useAuth } from "@/hooks/use-auth";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "store_owner" || role === "super_admin";
  const canReviewCredit = role === "credit_officer" || role === "super_admin" || role === "store_owner";
  const isRider = role === "rider" || role === "fleet_manager" || role === "super_admin";

  const close = () => setOpen(false);
  const handleSignOut = async () => {
    close();
    await signOut();
    void navigate({ to: "/" });
  };

  const linkClass =
    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground transition hover:bg-sidebar-accent data-[status=active]:bg-gradient-burgundy data-[status=active]:text-primary-foreground";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground transition hover:bg-muted md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 max-w-[85vw] overflow-y-auto bg-sidebar p-0">
        <SheetHeader className="border-b border-sidebar-border p-4">
          <SheetTitle className="text-left font-display">Menu</SheetTitle>
        </SheetHeader>
        <nav className="space-y-1 p-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} activeOptions={{ exact: to === "/" }} onClick={close} className={linkClass}>
              <Icon className="h-5 w-5" /> <span>{label}</span>
            </Link>
          ))}
          <Link to="/live" onClick={close} className={linkClass}>
            <Radio className="h-5 w-5" /> <span>MRS Live</span>
          </Link>
          {user && (
            <>
              <Link to="/dashboard" onClick={close} className={linkClass}>
                <LayoutDashboard className="h-5 w-5" /> <span>Dashboard</span>
              </Link>
              <Link to="/orders" onClick={close} className={linkClass}>
                <ShoppingBag className="h-5 w-5" /> <span>My orders</span>
              </Link>
              <Link to="/credit" onClick={close} className={linkClass}>
                <Banknote className="h-5 w-5" /> <span>Buy on credit</span>
              </Link>
              <Link to="/account" onClick={close} className={linkClass}>
                <User className="h-5 w-5" /> <span>My account</span>
              </Link>
            </>
          )}
          {(isAdmin || role === "fleet_manager") && (
            <>
              <Link to="/admin/orders" onClick={close} className={linkClass}>
                <Package className="h-5 w-5" /> <span>Order management</span>
              </Link>
              <Link to="/admin/fleet" onClick={close} className={linkClass}>
                <Truck className="h-5 w-5" /> <span>Fleet management</span>
              </Link>
            </>
          )}
          {isRider && (
            <Link to="/rider" onClick={close} className={linkClass}>
              <Bike className="h-5 w-5" /> <span>Rider app</span>
            </Link>
          )}
          {canReviewCredit && (
            <Link to="/credit-admin" onClick={close} className={linkClass}>
              <ClipboardCheck className="h-5 w-5" /> <span>Credit admin</span>
            </Link>
          )}
          {isAdmin && (
            <>
              <Link to="/admin/products" onClick={close} className={linkClass}>
                <Settings2 className="h-5 w-5" /> <span>Admin</span>
              </Link>
              <Link to="/admin/live" onClick={close} className={linkClass}>
                <Radio className="h-5 w-5" /> <span>Live sessions</span>
              </Link>
            </>
          )}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-destructive transition hover:bg-sidebar-accent"
            >
              <LogOut className="h-5 w-5" /> <span>Sign out</span>
            </button>
          ) : (
            <Link to="/auth" onClick={close} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground transition hover:bg-sidebar-accent">
              <LogIn className="h-5 w-5" /> <span>Sign in</span>
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
