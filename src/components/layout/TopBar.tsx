import { Link } from "@tanstack/react-router";
import { Search, Bell, User, ShoppingCart } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Container } from "./Container";

export function TopBar() {
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
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gradient-gold px-1 text-[10px] font-bold text-accent-foreground">
              3
            </span>
          </Link>
          <button
            type="button"
            aria-label="Notifications"
            className="relative grid h-10 w-10 place-items-center rounded-full text-foreground transition hover:bg-muted"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-background" />
          </button>
          <Link
            to="/account"
            aria-label="Account"
            className="grid h-10 w-10 place-items-center rounded-full bg-gradient-burgundy text-primary-foreground transition hover:opacity-90"
          >
            <User className="h-5 w-5" />
          </Link>
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
