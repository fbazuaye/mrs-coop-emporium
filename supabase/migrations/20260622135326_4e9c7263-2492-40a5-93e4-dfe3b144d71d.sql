
-- Rider can upload to delivery-proof/{order_id}/... when they are the assigned rider on that order
CREATE POLICY "Rider upload POD"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'delivery-proof'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.riders r ON r.id = o.assigned_rider_id
    WHERE r.user_id = auth.uid()
      AND o.id::text = split_part(name, '/', 1)
  )
);

CREATE POLICY "Rider update POD"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'delivery-proof'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.riders r ON r.id = o.assigned_rider_id
    WHERE r.user_id = auth.uid()
      AND o.id::text = split_part(name, '/', 1)
  )
);

CREATE POLICY "Order parties read POD"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'delivery-proof'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id::text = split_part(name, '/', 1)
      AND (
        o.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.riders r WHERE r.id = o.assigned_rider_id AND r.user_id = auth.uid())
        OR public.has_role(auth.uid(), 'store_owner')
        OR public.has_role(auth.uid(), 'super_admin')
        OR public.has_role(auth.uid(), 'fleet_manager')
      )
  )
);
