
CREATE POLICY "Product images publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Store owners upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (public.has_role(auth.uid(),'store_owner') OR public.has_role(auth.uid(),'super_admin'))
  );

CREATE POLICY "Store owners update product images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (public.has_role(auth.uid(),'store_owner') OR public.has_role(auth.uid(),'super_admin'))
  );

CREATE POLICY "Store owners delete product images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (public.has_role(auth.uid(),'store_owner') OR public.has_role(auth.uid(),'super_admin'))
  );
