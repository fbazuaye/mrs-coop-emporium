import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, Banknote, Calendar, ClipboardList, Wallet } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { useAuth } from "@/hooks/use-auth";
import {
  createCreditRequest,
  fetchMyCreditRequests,
  formatNaira,
  STATUS_LABELS,
  STATUS_TONE,
  suggestedMonthly,
  type CreditRequest,
} from "@/lib/credit";

export const Route = createFileRoute("/_authenticated/credit")({
  head: () => ({
    meta: [
      { title: "Buy on Credit — MRS Staff Coop" },
      { name: "description", content: "Apply for cooperative credit and track repayments." },
    ],
  }),
  component: CreditPage,
});

function CreditPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [memberName, setMemberName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [tenure, setTenure] = useState<number | "">(6);
  const [monthly, setMonthly] = useState<number | "">("");
  const [purpose, setPurpose] = useState("");

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    try {
      setRequests(await fetchMyCreditRequests(user.id));
    } catch (err) {
      console.error(err);
      toast.error("Could not load credit requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (typeof amount === "number" && typeof tenure === "number" && tenure > 0) {
      setMonthly(suggestedMonthly(amount, tenure));
    }
  }, [amount, tenure]);

  const totalOutstanding = useMemo(
    () => requests.reduce((s, r) => s + Number(r.outstanding_balance || 0), 0),
    [requests],
  );
  const active = requests.filter((r) => ["approved", "repaying"].includes(r.status));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!memberName || !employeeId || !amount || !tenure || !monthly) {
      toast.error("Please complete all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await createCreditRequest({
        user_id: user.id,
        member_name: memberName,
        employee_id: employeeId,
        amount: Number(amount),
        tenure_months: Number(tenure),
        monthly_repayment: Number(monthly),
        purpose: purpose || undefined,
      });
      toast.success("Credit request submitted");
      setAmount("");
      setMonthly("");
      setPurpose("");
      void refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <div className="space-y-8 py-6 sm:py-10">
        <header className="flex items-start justify-between gap-3">
          <div>
            <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
            </Link>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Credit</div>
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Buy on credit</h1>
            <p className="mt-1 text-sm text-muted-foreground">Cooperative-backed credit with payroll deduction.</p>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <StatCard icon={<Wallet className="h-5 w-5" />} label="Outstanding balance" value={formatNaira(totalOutstanding)} />
          <StatCard icon={<BadgeCheck className="h-5 w-5" />} label="Active credits" value={String(active.length)} />
          <StatCard icon={<ClipboardList className="h-5 w-5" />} label="Total requests" value={String(requests.length)} />
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Your credit history</h2>
            {loading ? (
              <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">Loading…</div>
            ) : requests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
                No credit requests yet. Submit your first one →
              </div>
            ) : (
              <ul className="space-y-3">
                {requests.map((r) => (
                  <li key={r.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display text-lg font-bold text-primary">{formatNaira(Number(r.amount))}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_TONE[r.status]}`}>
                            {STATUS_LABELS[r.status]}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {r.tenure_months} months · {formatNaira(Number(r.monthly_repayment))}/mo
                        </div>
                        {r.purpose && <div className="mt-2 text-sm text-foreground">{r.purpose}</div>}
                        {r.reviewer_notes && (
                          <div className="mt-2 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">Reviewer:</span> {r.reviewer_notes}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Outstanding</div>
                        <div className="font-display text-base font-bold text-foreground">
                          {formatNaira(Number(r.outstanding_balance))}
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-border/60 bg-card p-5 shadow-premium">
              <h2 className="font-display text-lg font-semibold">New credit request</h2>
              <Field label="Member name">
                <input
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  required
                  maxLength={120}
                  className={inputClass}
                />
              </Field>
              <Field label="Employee ID">
                <input
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                  maxLength={40}
                  className={inputClass}
                />
              </Field>
              <Field label="Requested amount (₦)">
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Tenure (months)">
                <select
                  value={tenure}
                  onChange={(e) => setTenure(Number(e.target.value))}
                  className={inputClass}
                >
                  {[3, 6, 9, 12, 18, 24, 36].map((m) => (
                    <option key={m} value={m}>{m} months</option>
                  ))}
                </select>
              </Field>
              <Field label="Monthly repayment (₦)">
                <input
                  type="number"
                  min={1}
                  value={monthly}
                  onChange={(e) => setMonthly(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Purpose (optional)">
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className={inputClass}
                />
              </Field>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-burgundy px-4 py-3 text-sm font-semibold text-primary-foreground shadow-burgundy transition hover:opacity-95 disabled:opacity-60"
              >
                <Banknote className="h-4 w-4" />
                {submitting ? "Submitting…" : "Submit request"}
              </button>
              <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <Calendar className="mt-0.5 h-3.5 w-3.5" />
                Repayments are deducted from payroll monthly until cleared.
              </p>
            </form>
          </aside>
        </div>
      </div>
    </Container>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-2 font-display text-xl font-bold text-foreground">{value}</div>
    </div>
  );
}
