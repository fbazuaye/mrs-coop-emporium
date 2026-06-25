
-- 1) Orders: scope policies to authenticated role
DROP POLICY IF EXISTS "Members view own orders" ON public.orders;
CREATE POLICY "Members view own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id)
  OR app_private.has_role(auth.uid(), 'store_owner'::app_role)
  OR app_private.has_role(auth.uid(), 'super_admin'::app_role)
  OR app_private.has_role(auth.uid(), 'fleet_manager'::app_role)
);

DROP POLICY IF EXISTS "Staff update orders" ON public.orders;
CREATE POLICY "Staff update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  app_private.has_role(auth.uid(), 'store_owner'::app_role)
  OR app_private.has_role(auth.uid(), 'super_admin'::app_role)
  OR app_private.has_role(auth.uid(), 'fleet_manager'::app_role)
)
WITH CHECK (
  app_private.has_role(auth.uid(), 'store_owner'::app_role)
  OR app_private.has_role(auth.uid(), 'super_admin'::app_role)
  OR app_private.has_role(auth.uid(), 'fleet_manager'::app_role)
);

-- 2) Profiles: allow store_owner and fleet_manager to read profiles
--    (super_admin already covered by existing policy). Prevents future widening.
DROP POLICY IF EXISTS "Staff can read profiles" ON public.profiles;
CREATE POLICY "Staff can read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  app_private.has_role(auth.uid(), 'store_owner'::app_role)
  OR app_private.has_role(auth.uid(), 'fleet_manager'::app_role)
);

-- 3) rider_locations: restrict INSERT so order_id (when set) must reference
--    an order assigned to the inserting rider.
DROP POLICY IF EXISTS "Riders insert their own pings" ON public.rider_locations;
CREATE POLICY "Riders insert their own pings"
ON public.rider_locations
FOR INSERT
TO authenticated
WITH CHECK (
  (
    EXISTS (
      SELECT 1 FROM public.riders r
      WHERE r.id = rider_locations.rider_id
        AND r.user_id = auth.uid()
    )
    AND (
      rider_locations.order_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.orders o
        JOIN public.riders r2 ON r2.id = o.assigned_rider_id
        WHERE o.id = rider_locations.order_id
          AND r2.user_id = auth.uid()
          AND r2.id = rider_locations.rider_id
      )
    )
  )
  OR app_private.has_role(auth.uid(), 'fleet_manager'::app_role)
  OR app_private.has_role(auth.uid(), 'store_owner'::app_role)
  OR app_private.has_role(auth.uid(), 'super_admin'::app_role)
);
