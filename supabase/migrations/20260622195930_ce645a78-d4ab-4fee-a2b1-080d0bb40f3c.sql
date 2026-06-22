
-- 1. Switch role helpers to SECURITY INVOKER (user_roles SELECT policy already lets users read own rows)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.get_primary_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'store_owner' THEN 2
    WHEN 'fleet_manager' THEN 3
    WHEN 'credit_officer' THEN 4
    WHEN 'rider' THEN 5
    WHEN 'cooperative_member' THEN 6
  END
  LIMIT 1;
$$;

-- 2. live_messages: drop public read, restrict to authenticated
DROP POLICY IF EXISTS "Anyone can read live messages" ON public.live_messages;
CREATE POLICY "Authenticated users read live messages"
  ON public.live_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. riders: add customer-scoped SELECT policy (only riders assigned to their own active orders)
CREATE POLICY "Customers view rider assigned to their order"
  ON public.riders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.assigned_rider_id = riders.id
        AND o.user_id = auth.uid()
        AND o.status IN ('assigned_rider','picked_up','out_for_delivery','delivered')
    )
  );

-- 4. user_roles: explicit super_admin-only INSERT / UPDATE / DELETE policies
CREATE POLICY "Super admins insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
