import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag, Sparkles, ShieldCheck, Truck } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { PremiumCard } from "@/components/common/PremiumCard";
import { SectionHeading } from "@/components/common/SectionHeading";
import { BrandButton } from "@/components/brand/BrandButton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MRS Staff Coop Store — Members' Marketplace" },
      {
        name: "description",
        content:
          "Welcome to the MRS Staff Cooperative Society store. Members-only pricing, curated essentials, delivered with care.",
      },
      { property: "og:title", content: "MRS Staff Coop Store" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="space-y-12 py-6 sm:py-10">
      <Container>
        <section className="relative overflow-hidden rounded-3xl bg-gradient-burgundy p-8 text-primary-foreground shadow-burgundy sm:p-12">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-gold opacity-30 blur-3xl" />
          <div className="relative max-w-2xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-accent-soft" />
              Members Only
            </div>
            <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              The cooperative store, reimagined for every member.
            </h1>
            <p className="text-sm text-primary-foreground/80 sm:text-base">
              A premium shopping experience built exclusively for MRS Staff
              Cooperative Society members.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/shop">
                <BrandButton variant="gold">
                  <ShoppingBag className="h-4 w-4" />
                  Start shopping
                </BrandButton>
              </Link>
              <Link to="/account">
                <BrandButton variant="outline" className="border-white/30 bg-white/5 text-primary-foreground hover:bg-white/10">
                  My account
                </BrandButton>
              </Link>
            </div>
          </div>
        </section>
      </Container>

      <Container>
        <SectionHeading
          eyebrow="Foundation Ready"
          title="A premium foundation, ready for features"
          subtitle="The design system, navigation shell, and installable app experience are in place. Catalog, cart, and member accounts come next."
        />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <PremiumCard key={feature.title} interactive>
              <div className="mb-4 inline-grid h-11 w-11 place-items-center rounded-xl bg-gradient-burgundy text-primary-foreground shadow-burgundy">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </PremiumCard>
          ))}
        </div>
      </Container>
    </div>
  );
}

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Members-only access",
    description:
      "Designed exclusively for MRS Staff Cooperative Society members and their households.",
  },
  {
    icon: Sparkles,
    title: "Premium experience",
    description:
      "Luxury retail aesthetics with the speed and reliability of a modern enterprise app.",
  },
  {
    icon: Truck,
    title: "Installable everywhere",
    description:
      "Install on Android, iOS, iPad, Windows, and Mac for a native-feeling experience.",
  },
];
