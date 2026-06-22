
-- Add destination coords to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS dest_lat double precision,
  ADD COLUMN IF NOT EXISTS dest_lng double precision;

-- Add current location to riders
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS current_lat double precision,
  ADD COLUMN IF NOT EXISTS current_lng double precision,
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;

-- Rider location history (optional ping log used for breadcrumbs)
CREATE TABLE IF NOT EXISTS public.rider_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  heading double precision,
  speed double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.rider_locations TO authenticated;
GRANT ALL ON public.rider_locations TO service_role;

ALTER TABLE public.rider_locations ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read pings for an order they can see (customer, rider, staff).
CREATE POLICY "Read rider pings for visible orders"
  ON public.rider_locations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = rider_locations.order_id
        AND (
          o.user_id = auth.uid()
          OR public.has_role(auth.uid(), 'store_owner')
          OR public.has_role(auth.uid(), 'super_admin')
          OR public.has_role(auth.uid(), 'fleet_manager')
          OR EXISTS (SELECT 1 FROM public.riders r WHERE r.id = o.assigned_rider_id AND r.user_id = auth.uid())
        )
    )
  );

-- Only the rider (or staff) can insert pings.
CREATE POLICY "Riders insert their own pings"
  ON public.rider_locations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.riders r WHERE r.id = rider_locations.rider_id AND r.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'fleet_manager')
    OR public.has_role(auth.uid(), 'store_owner')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE INDEX IF NOT EXISTS rider_locations_order_id_created_at_idx
  ON public.rider_locations (order_id, created_at DESC);

-- Allow riders (the rider's own user) to update their own riders row (so location can be patched from the rider's app)
DO $$ BEGIN
  CREATE POLICY "Riders update own row"
    ON public.riders FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.riders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
