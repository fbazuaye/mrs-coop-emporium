import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionHeading } from "@/components/common/SectionHeading";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Cart — MRS Staff Coop Store" },
      {
        name: "description",
        content: "Review the items in your MRS Coop shopping cart.",
      },
      { property: "og:title", content: "Cart — MRS Staff Coop Store" },
      { property: "og:url", content: "/cart" },
    ],
    links: [{ rel: "canonical", href: "/cart" }],
  }),
  component: CartPage,
});

function CartPage() {
  return (
    <Container>
      <div className="space-y-8 py-6 sm:py-10">
        <SectionHeading
          eyebrow="Your bag"
          title="Shopping cart"
          subtitle="Items you add from the catalog will collect here."
        />
        <EmptyState
          icon={<ShoppingCart className="h-7 w-7" />}
          title="Your cart is empty"
          description="Cart functionality will be enabled with the catalog."
        />
      </div>
    </Container>
  );
}
