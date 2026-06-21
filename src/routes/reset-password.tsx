import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandButton } from "@/components/brand/BrandButton";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reset password — MRS Staff Coop Store" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated.");
    await supabase.auth.signOut();
    void navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-background via-background to-muted/40 px-4 py-10">
      <div className="mx-auto max-w-md rounded-3xl border border-border/60 bg-card p-8 shadow-premium">
        <div className="mb-6 flex justify-center"><Logo variant="stacked" /></div>
        <h1 className="mb-1 text-center font-display text-xl font-semibold">Set a new password</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">Choose a strong password you haven't used before.</p>
        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="password" required minLength={8} placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-ring/30" />
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="password" required minLength={8} placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-ring/30" />
          </div>
          <BrandButton type="submit" disabled={busy} className="w-full">
            {busy ? "Updating…" : "Update password"}
          </BrandButton>
        </form>
      </div>
    </div>
  );
}
