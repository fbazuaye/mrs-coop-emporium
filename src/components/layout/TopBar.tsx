import { Link, useNavigate } from "@tanstack/react-router";
import { Search, User, ShoppingCart, LogOut, LayoutDashboard } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Logo } from "@/components/brand/Logo";
import { Container } from "./Container";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopBar() {
  const { user, role, signOut } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/" });
  };

  const initials = (user?.user_metadata?.full_name as string | undefined)?.[0]?.toUpperCase()
    ?? user?.email?.[0]?.toUpperCase()
    ?? "M";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <Container className="flex h-16 items-center gap-3 sm:gap-4">
        <Link to="/" className="shrink-0">
          <Logo />
        </Link>

        <div className="hidden flex-1 md:flex md:max-w-xl md:ml-4">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search products, brands and categories…"
              className="h-11 w-full rounded-full border border-input bg-muted/60 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-hidden focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Link
            to="/cart"
            aria-label="Cart"
            className="relative grid h-10 w-10 place-items-center rounded-full text-foreground transition hover:bg-muted"
          >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gradient-gold px-1 text-[10px] font-bold text-accent-foreground">
                {count}
              </span>
            )}
          </Link>
          <NotificationBell />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  className="grid h-10 w-10 place-items-center rounded-full bg-gradient-burgundy text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="truncate text-sm font-medium">
                    {(user.user_metadata?.full_name as string) ?? user.email}
                  </div>
                  {role && (
                    <div className="text-xs font-normal text-muted-foreground capitalize">
                      {role.replace(/_/g, " ")}
                    </div>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account" className="flex items-center gap-2">
                    <User className="h-4 w-4" /> My account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/auth"
              aria-label="Sign in"
              className="grid h-10 w-10 place-items-center rounded-full bg-gradient-burgundy text-primary-foreground transition hover:opacity-90"
            >
              <User className="h-5 w-5" />
            </Link>
          )}
        </div>
      </Container>

      <div className="border-t border-border/60 px-4 pb-3 md:hidden">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search products…"
            className="mt-3 h-10 w-full rounded-full border border-input bg-muted/60 pl-11 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-hidden focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>
    </header>
  );
}
