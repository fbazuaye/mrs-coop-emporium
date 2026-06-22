import { supabase } from "@/integrations/supabase/client";

export type CreditStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "repaying"
  | "completed";

export type CreditRequest = {
  id: string;
  user_id: string;
  member_name: string;
  employee_id: string;
  amount: number;
  tenure_months: number;
  monthly_repayment: number;
  purpose: string | null;
  status: CreditStatus;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_amount: number | null;
  outstanding_balance: number;
  created_at: string;
  updated_at: string;
};

export type CreditRepayment = {
  id: string;
  credit_request_id: string;
  amount: number;
  paid_on: string;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
};

// Untyped client until DB types regenerate.
const db = supabase as unknown as {
  from: (table: string) => any;
};

export const STATUS_LABELS: Record<CreditStatus, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  repaying: "Repaying",
  completed: "Completed",
};

export const STATUS_TONE: Record<CreditStatus, string> = {
  submitted: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  under_review: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  repaying: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  completed: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
};

export function suggestedMonthly(amount: number, tenure: number): number {
  if (!amount || !tenure) return 0;
  return Math.ceil(amount / tenure);
}

export async function fetchMyCreditRequests(userId: string): Promise<CreditRequest[]> {
  const { data, error } = await db
    .from("credit_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CreditRequest[];
}

export async function fetchAllCreditRequests(): Promise<CreditRequest[]> {
  const { data, error } = await db
    .from("credit_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CreditRequest[];
}

export async function fetchRepayments(requestId: string): Promise<CreditRepayment[]> {
  const { data, error } = await db
    .from("credit_repayments")
    .select("*")
    .eq("credit_request_id", requestId)
    .order("paid_on", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CreditRepayment[];
}

export async function fetchAllRepayments(): Promise<CreditRepayment[]> {
  const { data, error } = await db
    .from("credit_repayments")
    .select("*")
    .order("paid_on", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CreditRepayment[];
}

export async function createCreditRequest(input: {
  user_id: string;
  member_name: string;
  employee_id: string;
  amount: number;
  tenure_months: number;
  monthly_repayment: number;
  purpose?: string;
}): Promise<CreditRequest> {
  const { data, error } = await db
    .from("credit_requests")
    .insert({ ...input, status: "submitted" })
    .select("*")
    .single();
  if (error) throw error;
  return data as CreditRequest;
}

export async function updateRequestStatus(
  id: string,
  patch: {
    status: CreditStatus;
    reviewer_notes?: string | null;
    approved_amount?: number | null;
    reviewed_by?: string | null;
  },
): Promise<void> {
  const { error } = await db.from("credit_requests").update(patch).eq("id", id);
  if (error) throw error;
}

export async function recordRepayment(input: {
  credit_request_id: string;
  amount: number;
  paid_on?: string;
  recorded_by?: string | null;
  notes?: string;
}): Promise<void> {
  const { error } = await db.from("credit_repayments").insert(input);
  if (error) throw error;
}

export function formatNaira(n: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n || 0);
}
