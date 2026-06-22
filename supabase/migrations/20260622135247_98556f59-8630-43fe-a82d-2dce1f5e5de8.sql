
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pod_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS pod_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS pod_recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS pod_notes TEXT,
  ADD COLUMN IF NOT EXISTS pod_captured_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rider_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rider_payout NUMERIC(12,2);

-- Allow the assigned rider to update their own order (status, POD fields, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Assigned rider can update order'
  ) THEN
    CREATE POLICY "Assigned rider can update order"
      ON public.orders
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.riders r
          WHERE r.id = orders.assigned_rider_id AND r.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.riders r
          WHERE r.id = orders.assigned_rider_id AND r.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Allow the assigned rider to view the order and its items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'Assigned rider can view order'
  ) THEN
    CREATE POLICY "Assigned rider can view order"
      ON public.orders
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.riders r
          WHERE r.id = orders.assigned_rider_id AND r.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'Assigned rider can view order items'
  ) THEN
    CREATE POLICY "Assigned rider can view order items"
      ON public.order_items
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.orders o
          JOIN public.riders r ON r.id = o.assigned_rider_id
          WHERE o.id = order_items.order_id AND r.user_id = auth.uid()
        )
      );
  END IF;
END $$;
