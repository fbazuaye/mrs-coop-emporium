import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionHeading } from "@/components/common/SectionHeading";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — MRS Staff Coop Store" },
      {
        name: "description",
        content:
          "Browse the cooperative catalog. Curated essentials with members-only pricing.",
      },
      { property: "og:title", content: "Shop — MRS Staff Coop Store" },
      { property: "og:url", content: "/shop" },
    ],
    links: [{ rel: "canonical", href: "/shop" }],
  }),
  component: ShopPage,
});

function ShopPage() {
  return (
    <Container>
      <div className="space-y-8 py-6 sm:py-10">
        <SectionHeading
          eyebrow="Catalog"
          title="Shop the cooperative"
          subtitle="Products and categories will appear here once the catalog is enabled."
        />
        <EmptyState
          icon={<ShoppingBag className="h-7 w-7" />}
          title="Catalog coming soon"
          description="The product catalog will be wired up in the next build phase."
        />
      </div>
    </Container>
  );
}
