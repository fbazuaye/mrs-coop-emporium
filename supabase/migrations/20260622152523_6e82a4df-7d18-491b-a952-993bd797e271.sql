
CREATE POLICY "Public read live thumbnails" ON storage.objects FOR SELECT USING (bucket_id = 'live-thumbnails');
CREATE POLICY "Admins manage live thumbnails insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'live-thumbnails' AND (public.has_role(auth.uid(), 'store_owner') OR public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "Admins manage live thumbnails update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'live-thumbnails' AND (public.has_role(auth.uid(), 'store_owner') OR public.has_role(auth.uid(), 'super_admin')));
CREATE POLICY "Admins manage live thumbnails delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'live-thumbnails' AND (public.has_role(auth.uid(), 'store_owner') OR public.has_role(auth.uid(), 'super_admin')));
