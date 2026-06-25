
-- 1. Move role-check SECURITY DEFINER helpers out of the exposed public schema
CREATE SCHEMA IF NOT EXISTS app_private;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA app_private;
ALTER FUNCTION public.get_primary_role(uuid) SET SCHEMA app_private;

GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.get_primary_role(uuid) TO authenticated, service_role;

-- 2. Fix inconsistent rider identity checks in orders policies
DROP POLICY IF EXISTS "Members view own orders" ON public.orders;
CREATE POLICY "Members view own orders" ON public.orders FOR SELECT
USING (
  auth.uid() = user_id
  OR app_private.has_role(auth.uid(), 'store_owner'::public.app_role)
  OR app_private.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR app_private.has_role(auth.uid(), 'fleet_manager'::public.app_role)
);

DROP POLICY IF EXISTS "Staff update orders" ON public.orders;
CREATE POLICY "Staff update orders" ON public.orders FOR UPDATE
USING (
  app_private.has_role(auth.uid(), 'store_owner'::public.app_role)
  OR app_private.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR app_private.has_role(auth.uid(), 'fleet_manager'::public.app_role)
)
WITH CHECK (
  app_private.has_role(auth.uid(), 'store_owner'::public.app_role)
  OR app_private.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR app_private.has_role(auth.uid(), 'fleet_manager'::public.app_role)
);

-- 3. Stop broadcasting rider PII (phone/plate) via Realtime and via the
--    customer-facing SELECT policy. Provide a safe RPC for customers.
ALTER PUBLICATION supabase_realtime DROP TABLE public.riders;
DROP POLICY IF EXISTS "Customers view rider assigned to their order" ON public.riders;

CREATE OR REPLACE FUNCTION app_private.get_rider_for_my_order(_order_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  current_lat double precision,
  current_lng double precision,
  rating numeric,
  location_updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.full_name, r.current_lat, r.current_lng, r.rating, r.location_updated_at
  FROM public.riders r
  JOIN public.orders o ON o.assigned_rider_id = r.id
  WHERE o.id = _order_id
    AND o.user_id = auth.uid()
    AND o.status IN (
      'assigned_rider'::public.order_status,
      'picked_up'::public.order_status,
      'out_for_delivery'::public.order_status,
      'delivered'::public.order_status
    );
$$;
GRANT EXECUTE ON FUNCTION app_private.get_rider_for_my_order(uuid) TO authenticated;

-- SECURITY INVOKER wrapper in public so the client can call it through PostgREST
-- without exposing a new SECURITY DEFINER function in the API schema.
CREATE OR REPLACE FUNCTION public.get_rider_for_my_order(_order_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  current_lat double precision,
  current_lng double precision,
  rating numeric,
  location_updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM app_private.get_rider_for_my_order(_order_id);
$$;
REVOKE ALL ON FUNCTION public.get_rider_for_my_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rider_for_my_order(uuid) TO authenticated;

-- 4. Lock down activity_logs writes — only service_role / triggers may insert.
DROP POLICY IF EXISTS "Users can insert their own activity" ON public.activity_logs;
REVOKE INSERT ON public.activity_logs FROM authenticated, anon;
