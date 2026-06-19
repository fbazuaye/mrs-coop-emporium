import { Link } from "@tanstack/react-router";
import { Search, Bell, User } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Container } from "./Container";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link to="/" className="shrink-0">
          <Logo />
        </Link>

        <div className="hidden flex-1 max-w-xl md:flex">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search the cooperative store…"
              className="h-11 w-full rounded-full border border-input bg-muted/60 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-hidden focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Notifications"
            className="grid h-10 w-10 place-items-center rounded-full text-foreground transition hover:bg-muted"
          >
            <Bell className="h-5 w-5" />
          </button>
          <Link
            to="/account"
            aria-label="Account"
            className="grid h-10 w-10 place-items-center rounded-full text-foreground transition hover:bg-muted"
          >
            <User className="h-5 w-5" />
          </Link>
        </div>
      </Container>
    </header>
  );
}
