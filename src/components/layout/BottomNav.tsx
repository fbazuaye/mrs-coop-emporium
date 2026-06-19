import { Link } from "@tanstack/react-router";
import { NAV_ITEMS } from "@/lib/nav";

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="group flex flex-col items-center gap-1 py-2.5 text-muted-foreground transition data-[status=active]:text-primary"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full transition group-data-[status=active]:bg-primary/10">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
