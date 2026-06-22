
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  metadata JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Trigger: notify member on credit_requests status change
CREATE OR REPLACE FUNCTION public.notify_credit_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_body TEXT;
  v_type TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_type := 'credit_submitted';
    v_title := 'Credit request submitted';
    v_body := 'Your request for ₦' || to_char(NEW.amount, 'FM999,999,999') || ' is awaiting review.';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    CASE NEW.status
      WHEN 'under_review' THEN
        v_type := 'credit_under_review';
        v_title := 'Credit request under review';
        v_body := 'A credit officer is reviewing your request for ₦' || to_char(NEW.amount, 'FM999,999,999') || '.';
      WHEN 'approved' THEN
        v_type := 'credit_approved';
        v_title := 'Credit request approved 🎉';
        v_body := 'Approved for ₦' || to_char(COALESCE(NEW.approved_amount, NEW.amount), 'FM999,999,999') || '. Repayment begins next cycle.';
      WHEN 'rejected' THEN
        v_type := 'credit_rejected';
        v_title := 'Credit request rejected';
        v_body := COALESCE(NEW.reviewer_notes, 'Your credit request was not approved at this time.');
      WHEN 'completed' THEN
        v_type := 'credit_completed';
        v_title := 'Credit fully repaid ✅';
        v_body := 'Your credit of ₦' || to_char(COALESCE(NEW.approved_amount, NEW.amount), 'FM999,999,999') || ' is now fully repaid.';
      ELSE
        RETURN NEW;
    END CASE;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
  VALUES (NEW.user_id, v_type, v_title, v_body, '/credit',
          jsonb_build_object('credit_request_id', NEW.id, 'status', NEW.status));

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_credit_insert
AFTER INSERT ON public.credit_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_credit_status_change();

CREATE TRIGGER trg_notify_credit_status
AFTER UPDATE OF status ON public.credit_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_credit_status_change();

-- Trigger: notify member on repayment recorded
CREATE OR REPLACE FUNCTION public.notify_credit_repayment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_remaining NUMERIC(12,2);
BEGIN
  SELECT user_id, outstanding_balance INTO v_user, v_remaining
  FROM public.credit_requests WHERE id = NEW.credit_request_id;

  IF v_user IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
  VALUES (
    v_user,
    'credit_repayment',
    'Repayment recorded',
    '₦' || to_char(NEW.amount, 'FM999,999,999') || ' applied. Outstanding: ₦' || to_char(v_remaining, 'FM999,999,999') || '.',
    '/credit',
    jsonb_build_object('credit_request_id', NEW.credit_request_id, 'amount', NEW.amount)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_repayment
AFTER INSERT ON public.credit_repayments
FOR EACH ROW EXECUTE FUNCTION public.notify_credit_repayment();
