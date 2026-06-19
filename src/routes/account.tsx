import { createFileRoute } from "@tanstack/react-router";
import { User } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionHeading } from "@/components/common/SectionHeading";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account — MRS Staff Coop Store" },
      {
        name: "description",
        content: "Manage your MRS Staff Cooperative Society membership and orders.",
      },
      { property: "og:title", content: "Account — MRS Staff Coop Store" },
      { property: "og:url", content: "/account" },
    ],
    links: [{ rel: "canonical", href: "/account" }],
  }),
  component: AccountPage,
});

function AccountPage() {
  return (
    <Container>
      <div className="space-y-8 py-6 sm:py-10">
        <SectionHeading
          eyebrow="Membership"
          title="My account"
          subtitle="Sign-in, profile, and order history will appear here once authentication is enabled."
        />
        <EmptyState
          icon={<User className="h-7 w-7" />}
          title="Member sign-in coming soon"
          description="Authentication for cooperative members will be added in the next phase."
        />
      </div>
    </Container>
  );
}
