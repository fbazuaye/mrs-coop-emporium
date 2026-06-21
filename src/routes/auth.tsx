import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, Lock, User as UserIcon, Phone, IdCard, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { BrandButton } from "@/components/brand/BrandButton";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — MRS Staff Coop Store" },
      { name: "description", content: "Sign in or create your MRS Staff Cooperative account." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");

  useEffect(() => {
    if (!loading && user) {
      void navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-dvh bg-gradient-to-br from-background via-background to-muted/40 px-4 py-10">
      <div className="mx-auto max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to store
        </Link>

        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-premium sm:p-8">
          <div className="mb-6 flex justify-center"><Logo variant="stacked" /></div>

          {mode !== "forgot" && (
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
              <button
                onClick={() => setMode("signin")}
                className={`h-9 rounded-full text-sm font-medium transition ${mode === "signin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Sign in
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`h-9 rounded-full text-sm font-medium transition ${mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Create account
              </button>
            </div>
          )}

          {mode === "signin" && <SignInForm onForgot={() => setMode("forgot")} />}
          {mode === "signup" && <SignUpForm />}
          {mode === "forgot" && <ForgotForm onBack={() => setMode("signin")} />}

          {mode !== "forgot" && (
            <>
              <Divider />
              <GoogleButton />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function GoogleButton() {
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex h-11 w-full items-center justify-center gap-3 rounded-full border border-border bg-card text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
    >
      <GoogleIcon /> Continue with Google
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.2-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5 0 9.6-1.9 13-5l-6-5.1c-1.9 1.4-4.3 2.2-7 2.2-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39 16.2 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6 5.1c-.4.4 6.3-4.6 6.3-14.5 0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

function Field({ icon: Icon, ...props }: { icon: typeof Mail } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        {...props}
        className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-ring/30"
      />
    </div>
  );
}

function SignInForm({ onForgot }: { onForgot: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field icon={Mail} type="email" required placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field icon={Lock} type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <div className="flex justify-end">
        <button type="button" onClick={onForgot} className="text-xs font-medium text-primary hover:underline">
          Forgot password?
        </button>
      </div>
      <BrandButton type="submit" disabled={busy} className="w-full">
        {busy ? "Signing in…" : "Sign in"}
      </BrandButton>
    </form>
  );
}

function SignUpForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName, phone, staff_id: staffId },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — check your email to confirm.");
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field icon={UserIcon} required placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <Field icon={Mail} type="email" required placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field icon={Phone} type="tel" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Field icon={IdCard} placeholder="Staff / Member ID (optional)" value={staffId} onChange={(e) => setStaffId(e.target.value)} />
      <Field icon={Lock} type="password" required minLength={8} placeholder="Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
      <BrandButton type="submit" disabled={busy} className="w-full">
        {busy ? "Creating account…" : "Create account"}
      </BrandButton>
      <p className="text-center text-xs text-muted-foreground">
        New members start as <span className="font-medium text-foreground">Cooperative Members</span>. Other roles are assigned by Super Admin.
      </p>
    </form>
  );
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Reset link sent — check your email.");
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <h2 className="text-center font-display text-lg font-semibold">Reset your password</h2>
      <p className="text-center text-sm text-muted-foreground">We'll email you a secure link to set a new password.</p>
      <Field icon={Mail} type="email" required placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
      <BrandButton type="submit" disabled={busy} className="w-full">
        {busy ? "Sending…" : "Send reset link"}
      </BrandButton>
      <button type="button" onClick={onBack} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
        Back to sign in
      </button>
    </form>
  );
}
