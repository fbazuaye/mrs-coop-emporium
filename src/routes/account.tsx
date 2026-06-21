import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LogIn } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionHeading } from "@/components/common/SectionHeading";
import { BrandButton } from "@/components/brand/BrandButton";
import { useAuth, ROLE_LABELS } from "@/hooks/use-auth";

export const Route = createFileRoute("/account")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Account — MRS Staff Coop Store" },
      { name: "description", content: "Manage your MRS Staff Cooperative Society membership and orders." },
    ],
    links: [{ rel: "canonical", href: "/account" }],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (!user) {
    return (
      <Container>
        <div className="space-y-8 py-10">
          <SectionHeading eyebrow="Membership" title="My account" />
          <EmptyState
            icon={<LogIn className="h-7 w-7" />}
            title="Sign in to continue"
            description="Sign in or create an account to access member benefits."
            action={<Link to="/auth"><BrandButton>Sign in</BrandButton></Link>}
          />
        </div>
      </Container>
    );
  }

  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "";

  return (
    <Container>
      <div className="space-y-8 py-6 sm:py-10">
        <SectionHeading eyebrow="Membership" title="My account" subtitle="Your profile and cooperative details." />

        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-premium sm:p-8">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-burgundy text-2xl font-bold text-primary-foreground">
              {name[0]?.toUpperCase() ?? "M"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-xl font-semibold">{name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
              {role && (
                <div className="mt-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {ROLE_LABELS[role]}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/dashboard"><BrandButton>Open dashboard</BrandButton></Link>
            <BrandButton variant="outline" onClick={() => { void signOut(); void navigate({ to: "/" }); }}>
              Sign out
            </BrandButton>
          </div>
        </div>
      </div>
    </Container>
  );
}
