
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_credit_outstanding() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_credit_repayment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_order_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_order_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_credit_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_credit_outstanding() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view live sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "Public can view live sessions" ON public.live_sessions;
DROP POLICY IF EXISTS "live_sessions_select_public" ON public.live_sessions;

CREATE POLICY "Authenticated users can view live sessions"
  ON public.live_sessions FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own activity" ON public.activity_logs
  FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());
CREATE POLICY "Admins can view all activity" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'store_owner'));

CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON public.activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_actor_id_idx ON public.activity_logs (actor_id);
CREATE INDEX IF NOT EXISTS activity_logs_entity_idx ON public.activity_logs (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS orders_user_id_created_at_idx ON public.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);
CREATE INDEX IF NOT EXISTS orders_assigned_rider_id_idx ON public.orders (assigned_rider_id);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS credit_requests_user_id_idx ON public.credit_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS credit_requests_status_idx ON public.credit_requests (status);
CREATE INDEX IF NOT EXISTS credit_repayments_request_id_idx ON public.credit_repayments (credit_request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS riders_user_id_idx ON public.riders (user_id);
CREATE INDEX IF NOT EXISTS rider_locations_rider_id_created_at_idx ON public.rider_locations (rider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products (category_id);
CREATE INDEX IF NOT EXISTS cart_items_user_id_idx ON public.cart_items (user_id);
