import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exportCreditRequestsCsv,
  exportCreditRequestsPdf,
  exportRepaymentsCsv,
  exportRepaymentsPdf,
} from "@/lib/credit-export";
import { Container } from "@/components/layout/Container";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchAllCreditRequests,
  fetchAllRepayments,
  fetchRepayments,
  formatNaira,
  recordRepayment,
  STATUS_LABELS,
  STATUS_TONE,
  updateRequestStatus,
  type CreditRepayment,
  type CreditRequest,
  type CreditStatus,
} from "@/lib/credit";

export const Route = createFileRoute("/_authenticated/credit-admin")({
  head: () => ({
    meta: [
      { title: "Credit Administration — MRS Staff Coop" },
      { name: "description", content: "Review credit applications and track repayments." },
    ],
  }),
  component: CreditAdminPage,
});

type Tab = "pending" | "approved" | "rejected" | "analytics";

function CreditAdminPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("pending");
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [repayments, setRepayments] = useState<CreditRepayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<CreditRequest | null>(null);

  const canReview = role === "credit_officer" || role === "super_admin";
  const canView = canReview || role === "store_owner";

  const refresh = async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([fetchAllCreditRequests(), fetchAllRepayments()]);
      setRequests(r);
      setRepayments(p);
    } catch (err) {
      console.error(err);
      toast.error("Could not load credit data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) void refresh();
  }, [canView]);

  const stats = useMemo(() => {
    const outstanding = requests.reduce((s, r) => s + Number(r.outstanding_balance || 0), 0);
    const approvedTotal = requests
      .filter((r) => ["approved", "repaying", "completed"].includes(r.status))
      .reduce((s, r) => s + Number(r.approved_amount || r.amount), 0);
    const collected = repayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const pending = requests.filter((r) => r.status === "submitted" || r.status === "under_review").length;
    return { outstanding, approvedTotal, collected, pending };
  }, [requests, repayments]);

  const filtered = useMemo(() => {
    switch (tab) {
      case "pending":
        return requests.filter((r) => r.status === "submitted" || r.status === "under_review");
      case "approved":
        return requests.filter((r) => ["approved", "repaying", "completed"].includes(r.status));
      case "rejected":
        return requests.filter((r) => r.status === "rejected");
      default:
        return [];
    }
  }, [requests, tab]);

  const repaymentsByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of repayments) {
      const key = p.paid_on.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + Number(p.amount));
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
  }, [repayments]);

  const maxBar = Math.max(1, ...repaymentsByMonth.map(([, v]) => v));

  if (authLoading) {
    return (
      <Container>
        <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>
      </Container>
    );
  }

  if (!canView) {
    return (
      <Container>
        <div className="mx-auto max-w-md py-20 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-4 font-display text-xl font-semibold">Restricted area</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Credit Officer, Store Owner, or Super Admin access required.
          </p>
          <Link to="/dashboard" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6 py-6 sm:py-10">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
            </Link>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Credit administration</div>
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {role === "store_owner" ? "Credit analytics" : "Credit requests"}
            </h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={loading || (requests.length === 0 && repayments.length === 0)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-burgundy px-4 py-2 text-sm font-semibold text-primary-foreground shadow-burgundy transition hover:opacity-95 disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> Export
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>Credit requests ({requests.length})</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => exportCreditRequestsCsv(requests)}
                disabled={requests.length === 0}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Download CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => exportCreditRequestsPdf(requests)}
                disabled={requests.length === 0}
              >
                <FileText className="mr-2 h-4 w-4" /> Download PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Repayment history ({repayments.length})</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => exportRepaymentsCsv(repayments, requests)}
                disabled={repayments.length === 0}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Download CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => exportRepaymentsPdf(repayments, requests)}
                disabled={repayments.length === 0}
              >
                <FileText className="mr-2 h-4 w-4" /> Download PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<ClipboardList className="h-5 w-5" />} label="Pending" value={String(stats.pending)} />
          <Stat icon={<Wallet className="h-5 w-5" />} label="Outstanding credit" value={formatNaira(stats.outstanding)} />
          <Stat icon={<Banknote className="h-5 w-5" />} label="Total credit sales" value={formatNaira(stats.approvedTotal)} />
          <Stat icon={<TrendingUp className="h-5 w-5" />} label="Repayments collected" value={formatNaira(stats.collected)} />
        </section>

        <nav className="flex flex-wrap gap-2">
          {(["pending", "approved", "rejected", "analytics"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${
                tab === t
                  ? "bg-gradient-burgundy text-primary-foreground shadow-burgundy"
                  : "border border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        {tab === "analytics" ? (
          <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-semibold">Repayment trends (last 6 months)</h2>
            {repaymentsByMonth.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">No repayments recorded yet.</p>
            ) : (
              <div className="mt-6 grid grid-cols-6 gap-3">
                {repaymentsByMonth.map(([month, total]) => (
                  <div key={month} className="flex flex-col items-center gap-2">
                    <div className="flex h-40 w-full items-end">
                      <div
                        className="w-full rounded-t-lg bg-gradient-burgundy"
                        style={{ height: `${(total / maxBar) * 100}%` }}
                        title={formatNaira(total)}
                      />
                    </div>
                    <div className="text-[10px] font-semibold text-muted-foreground">{month}</div>
                    <div className="text-[10px] font-bold text-foreground">{formatNaira(total)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section>
            {loading ? (
              <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
                No {tab} requests.
              </div>
            ) : (
              <ul className="space-y-3">
                {filtered.map((r) => (
                  <li key={r.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-foreground">{r.member_name}</span>
                          <span className="text-xs text-muted-foreground">#{r.employee_id}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_TONE[r.status]}`}>
                            {STATUS_LABELS[r.status]}
                          </span>
                        </div>
                        <div className="mt-1 font-display text-lg font-bold text-primary">
                          {formatNaira(Number(r.amount))}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            · {r.tenure_months} mo · {formatNaira(Number(r.monthly_repayment))}/mo
                          </span>
                        </div>
                        {r.purpose && <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.purpose}</div>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Outstanding</div>
                        <div className="font-display text-base font-bold">{formatNaira(Number(r.outstanding_balance))}</div>
                        <button
                          type="button"
                          onClick={() => setActive(r)}
                          className="mt-1 inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold hover:bg-muted"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {active && (
        <ReviewDrawer
          request={active}
          canReview={canReview}
          userId={user?.id ?? null}
          onClose={() => setActive(null)}
          onChanged={() => {
            void refresh();
            setActive(null);
          }}
        />
      )}
    </Container>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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

function ReviewDrawer({
  request,
  canReview,
  userId,
  onClose,
  onChanged,
}: {
  request: CreditRequest;
  canReview: boolean;
  userId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [notes, setNotes] = useState(request.reviewer_notes ?? "");
  const [approvedAmount, setApprovedAmount] = useState<number>(
    Number(request.approved_amount ?? request.amount),
  );
  const [repayAmount, setRepayAmount] = useState<number>(Number(request.monthly_repayment));
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<CreditRepayment[]>([]);

  useEffect(() => {
    void fetchRepayments(request.id).then(setHistory).catch(console.error);
  }, [request.id]);

  const setStatus = async (status: CreditStatus) => {
    setBusy(true);
    try {
      await updateRequestStatus(request.id, {
        status,
        reviewer_notes: notes || null,
        approved_amount: status === "approved" ? approvedAmount : null,
        reviewed_by: userId,
      });
      toast.success(`Marked ${STATUS_LABELS[status]}`);
      onChanged();
    } catch (err: any) {
      toast.error(err?.message ?? "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const addRepayment = async () => {
    if (!repayAmount || repayAmount <= 0) return;
    setBusy(true);
    try {
      await recordRepayment({
        credit_request_id: request.id,
        amount: repayAmount,
        recorded_by: userId,
      });
      toast.success("Repayment recorded");
      onChanged();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not record repayment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg overflow-y-auto bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Credit request</div>
            <h2 className="mt-1 font-display text-xl font-semibold">{request.member_name}</h2>
            <div className="text-xs text-muted-foreground">Employee #{request.employee_id}</div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-muted">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <Info label="Amount" value={formatNaira(Number(request.amount))} />
          <Info label="Tenure" value={`${request.tenure_months} months`} />
          <Info label="Monthly" value={formatNaira(Number(request.monthly_repayment))} />
          <Info label="Status" value={STATUS_LABELS[request.status]} />
          <Info label="Outstanding" value={formatNaira(Number(request.outstanding_balance))} />
          <Info label="Submitted" value={new Date(request.created_at).toLocaleDateString()} />
        </dl>

        {request.purpose && (
          <div className="mt-4 rounded-xl bg-muted/60 p-3 text-sm">
            <div className="text-[10px] font-semibold uppercase text-muted-foreground">Purpose</div>
            <div className="mt-1">{request.purpose}</div>
          </div>
        )}

        {canReview && (
          <>
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold">Review</h3>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Approved amount (₦)</span>
                <input
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Reviewer notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  disabled={busy}
                  onClick={() => setStatus("under_review")}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                >
                  Under review
                </button>
                <button
                  disabled={busy}
                  onClick={() => setStatus("approved")}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </button>
                <button
                  disabled={busy}
                  onClick={() => setStatus("rejected")}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            </div>

            {["approved", "repaying"].includes(request.status) && (
              <div className="mt-6 space-y-2 rounded-xl border border-border/60 bg-card p-4">
                <h3 className="text-sm font-semibold">Record repayment</h3>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(Number(e.target.value))}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <button
                    onClick={addRepayment}
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-lg bg-gradient-burgundy px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    <BadgeCheck className="h-3.5 w-3.5" /> Record
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-6">
          <h3 className="text-sm font-semibold">Repayment history</h3>
          {history.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No repayments yet.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {history.map((h) => (
                <li key={h.id} className="flex justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{new Date(h.paid_on).toLocaleDateString()}</span>
                  <span className="font-semibold">{formatNaira(Number(h.amount))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-semibold text-foreground">{value}</div>
    </div>
  );
}
