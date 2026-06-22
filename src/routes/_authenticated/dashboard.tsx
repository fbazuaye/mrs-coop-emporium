import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Shield, Store, Truck, CreditCard, Bike, Users, Package, BarChart3, Wallet, ClipboardList, Tags,
} from "lucide-react";
import { Container } from "@/components/layout/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { useAuth, ROLE_LABELS, type AppRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MRS Staff Coop Store" }] }),
  component: DashboardPage,
});

type Card = { icon: typeof Shield; label: string; hint: string; to?: string };

const ROLE_CONFIG: Record<AppRole, { icon: typeof Shield; tagline: string; cards: Card[] }> = {
  super_admin: {
    icon: Shield,
    tagline: "Full platform oversight and configuration.",
    cards: [
      { icon: Users, label: "User & Role Management", hint: "Approve members, assign roles" },
      { icon: Store, label: "Store Operations", hint: "Catalog, inventory, pricing" },
      { icon: BarChart3, label: "Analytics", hint: "Sales, performance, KPIs" },
      { icon: Shield, label: "System Settings", hint: "Policies, integrations, audit log" },
    ],
  },
  store_owner: {
    icon: Store,
    tagline: "Manage your storefront and inventory.",
    cards: [
      { icon: Package, label: "Products", hint: "Add, edit, restock items", to: "/admin/products" },
      { icon: Tags, label: "Categories", hint: "Organise your catalog", to: "/admin/categories" },
      { icon: ClipboardList, label: "Orders", hint: "Fulfil and track customer orders" },
      { icon: BarChart3, label: "Sales Reports", hint: "Daily, weekly, monthly insights" },
    ],
  },
  fleet_manager: {
    icon: Truck,
    tagline: "Coordinate riders and dispatch operations.",
    cards: [
      { icon: Truck, label: "Active Dispatches", hint: "Live deliveries on the move" },
      { icon: Bike, label: "Rider Roster", hint: "Assign and manage riders" },
      { icon: BarChart3, label: "Delivery Performance", hint: "ETA and SLA tracking" },
    ],
  },
  credit_officer: {
    icon: CreditCard,
    tagline: "Review and approve cooperative credit requests.",
    cards: [
      { icon: ClipboardList, label: "Credit Applications", hint: "Pending review queue" },
      { icon: Wallet, label: "Active Credit Lines", hint: "Outstanding balances" },
      { icon: BarChart3, label: "Repayment Trends", hint: "Risk and recovery metrics" },
    ],
  },
  rider: {
    icon: Bike,
    tagline: "Your assigned deliveries for today.",
    cards: [
      { icon: ClipboardList, label: "My Deliveries", hint: "Pickup → drop-off list" },
      { icon: Truck, label: "Route Map", hint: "Optimised navigation" },
      { icon: Wallet, label: "Earnings", hint: "Trips and payouts" },
    ],
  },
  cooperative_member: {
    icon: Users,
    tagline: "Member benefits and your activity at a glance.",
    cards: [
      { icon: Package, label: "My Orders", hint: "Track your purchases" },
      { icon: Wallet, label: "Savings & Credit", hint: "Cooperative balance" },
      { icon: Store, label: "Shop the Store", hint: "Member pricing on every item" },
    ],
  },
};

function DashboardPage() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <Container>
        <div className="py-16 text-center text-sm text-muted-foreground">Loading your dashboard…</div>
      </Container>
    );
  }

  const effectiveRole: AppRole = role ?? "cooperative_member";
  const cfg = ROLE_CONFIG[effectiveRole];
  const Icon = cfg.icon;
  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "Member";

  return (
    <Container>
      <div className="space-y-8 py-6 sm:py-10">
        <div className="flex flex-wrap items-start gap-4 rounded-3xl border border-border/60 bg-gradient-burgundy p-6 text-primary-foreground shadow-burgundy sm:p-8">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <Icon className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-[0.2em] opacity-80">{ROLE_LABELS[effectiveRole]}</div>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">Welcome, {name}</h1>
            <p className="mt-1 text-sm opacity-90">{cfg.tagline}</p>
          </div>
        </div>

        <SectionHeading eyebrow="Quick actions" title="Your workspace" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cfg.cards.map((c) => (
            <div key={c.label} className="group rounded-2xl border border-border/60 bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-premium">
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <c.icon className="h-5 w-5" />
              </div>
              <div className="font-display text-base font-semibold text-foreground">{c.label}</div>
              <div className="mt-1 text-sm text-muted-foreground">{c.hint}</div>
            </div>
          ))}
          <Link to="/" className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground transition hover:bg-muted/60">
            ← Back to the storefront
          </Link>
        </div>
      </div>
    </Container>
  );
}
