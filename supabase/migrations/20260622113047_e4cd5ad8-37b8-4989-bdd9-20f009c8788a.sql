
-- Status enum
CREATE TYPE public.credit_status AS ENUM (
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'repaying',
  'completed'
);

-- Credit requests
CREATE TABLE public.credit_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  tenure_months INTEGER NOT NULL CHECK (tenure_months > 0 AND tenure_months <= 60),
  monthly_repayment NUMERIC(12,2) NOT NULL CHECK (monthly_repayment > 0),
  purpose TEXT,
  status public.credit_status NOT NULL DEFAULT 'submitted',
  reviewer_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  approved_amount NUMERIC(12,2),
  outstanding_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_requests TO authenticated;
GRANT ALL ON public.credit_requests TO service_role;

ALTER TABLE public.credit_requests ENABLE ROW LEVEL SECURITY;

-- Members: read own
CREATE POLICY "Members read own credit requests" ON public.credit_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Members: create for themselves while submitted
CREATE POLICY "Members create own credit requests" ON public.credit_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'submitted');

-- Credit officers + super admins: read all
CREATE POLICY "Officers read all credit requests" ON public.credit_requests
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'credit_officer')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'store_owner')
  );

-- Credit officers + super admins: update (status changes)
CREATE POLICY "Officers update credit requests" ON public.credit_requests
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'credit_officer')
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'credit_officer')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER update_credit_requests_updated_at
  BEFORE UPDATE ON public.credit_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX credit_requests_user_id_idx ON public.credit_requests(user_id);
CREATE INDEX credit_requests_status_idx ON public.credit_requests(status);

-- Credit repayments
CREATE TABLE public.credit_repayments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_request_id UUID NOT NULL REFERENCES public.credit_requests(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_repayments TO authenticated;
GRANT ALL ON public.credit_repayments TO service_role;

ALTER TABLE public.credit_repayments ENABLE ROW LEVEL SECURITY;

-- Members: read repayments on their own requests
CREATE POLICY "Members read own repayments" ON public.credit_repayments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.credit_requests r
      WHERE r.id = credit_request_id AND r.user_id = auth.uid()
    )
  );

-- Officers + super admins + store owners: read all
CREATE POLICY "Staff read all repayments" ON public.credit_repayments
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'credit_officer')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'store_owner')
  );

-- Officers + super admins: record repayments
CREATE POLICY "Officers record repayments" ON public.credit_repayments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'credit_officer')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Officers update repayments" ON public.credit_repayments
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'credit_officer')
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'credit_officer')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Officers delete repayments" ON public.credit_repayments
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'credit_officer')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE INDEX credit_repayments_request_idx ON public.credit_repayments(credit_request_id);

-- Auto-update outstanding balance & lifecycle status on repayment insert/update/delete
CREATE OR REPLACE FUNCTION public.recalculate_credit_outstanding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id UUID;
  v_paid NUMERIC(12,2);
  v_approved NUMERIC(12,2);
  v_remaining NUMERIC(12,2);
BEGIN
  v_request_id := COALESCE(NEW.credit_request_id, OLD.credit_request_id);

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM public.credit_repayments
  WHERE credit_request_id = v_request_id;

  SELECT COALESCE(approved_amount, amount) INTO v_approved
  FROM public.credit_requests
  WHERE id = v_request_id;

  v_remaining := GREATEST(v_approved - v_paid, 0);

  UPDATE public.credit_requests
  SET outstanding_balance = v_remaining,
      status = CASE
        WHEN status IN ('approved', 'repaying') AND v_remaining = 0 THEN 'completed'::public.credit_status
        WHEN status = 'approved' AND v_paid > 0 THEN 'repaying'::public.credit_status
        ELSE status
      END,
      updated_at = now()
  WHERE id = v_request_id;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recalculate_credit_outstanding() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_repayment_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.credit_repayments
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_credit_outstanding();

-- When a request is approved, seed outstanding_balance
CREATE OR REPLACE FUNCTION public.seed_credit_outstanding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    NEW.outstanding_balance := COALESCE(NEW.approved_amount, NEW.amount);
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.seed_credit_outstanding() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_seed_credit_outstanding
  BEFORE UPDATE ON public.credit_requests
  FOR EACH ROW EXECUTE FUNCTION public.seed_credit_outstanding();
