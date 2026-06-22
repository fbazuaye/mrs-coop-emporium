CREATE SCHEMA IF NOT EXISTS app_private;

REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.can_manage_store_media(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'store_owner') OR public.has_role(_user_id, 'super_admin');
$$;

CREATE OR REPLACE FUNCTION app_private.can_manage_delivery_media(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'store_owner')
      OR public.has_role(_user_id, 'super_admin')
      OR public.has_role(_user_id, 'fleet_manager');
$$;

CREATE OR REPLACE FUNCTION app_private.can_read_delivery_proof_object(_user_id uuid, _object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    LEFT JOIN public.riders r ON r.id = o.assigned_rider_id
    WHERE o.id::text = split_part(_object_name, '/', 1)
      AND (
        o.user_id = _user_id
        OR r.user_id = _user_id
        OR app_private.can_manage_delivery_media(_user_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION app_private.can_write_delivery_proof_object(_user_id uuid, _object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.riders r ON r.id = o.assigned_rider_id
    WHERE r.user_id = _user_id
      AND o.id::text = split_part(_object_name, '/', 1)
  );
$$;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA app_private FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.can_manage_store_media(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.can_manage_delivery_media(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.can_read_delivery_proof_object(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.can_write_delivery_proof_object(uuid, text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Store owners upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Store owners update product images" ON storage.objects;
DROP POLICY IF EXISTS "Store owners delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage live thumbnails insert" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage live thumbnails update" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage live thumbnails delete" ON storage.objects;
DROP POLICY IF EXISTS "Order parties read POD" ON storage.objects;
DROP POLICY IF EXISTS "Rider upload POD" ON storage.objects;
DROP POLICY IF EXISTS "Rider update POD" ON storage.objects;

CREATE POLICY "Store owners upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND app_private.can_manage_store_media(auth.uid())
  );

CREATE POLICY "Store owners update product images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND app_private.can_manage_store_media(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND app_private.can_manage_store_media(auth.uid())
  );

CREATE POLICY "Store owners delete product images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND app_private.can_manage_store_media(auth.uid())
  );

CREATE POLICY "Admins manage live thumbnails insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'live-thumbnails'
    AND app_private.can_manage_store_media(auth.uid())
  );

CREATE POLICY "Admins manage live thumbnails update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'live-thumbnails'
    AND app_private.can_manage_store_media(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'live-thumbnails'
    AND app_private.can_manage_store_media(auth.uid())
  );

CREATE POLICY "Admins manage live thumbnails delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'live-thumbnails'
    AND app_private.can_manage_store_media(auth.uid())
  );

CREATE POLICY "Order parties read POD"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'delivery-proof'
    AND app_private.can_read_delivery_proof_object(auth.uid(), name)
  );

CREATE POLICY "Rider upload POD"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'delivery-proof'
    AND app_private.can_write_delivery_proof_object(auth.uid(), name)
  );

CREATE POLICY "Rider update POD"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'delivery-proof'
    AND app_private.can_write_delivery_proof_object(auth.uid(), name)
  )
  WITH CHECK (
    bucket_id = 'delivery-proof'
    AND app_private.can_write_delivery_proof_object(auth.uid(), name)
  );

DROP FUNCTION IF EXISTS public.can_manage_store_media(uuid);
DROP FUNCTION IF EXISTS public.can_manage_delivery_media(uuid);
DROP FUNCTION IF EXISTS public.can_read_delivery_proof_object(uuid, text);
DROP FUNCTION IF EXISTS public.can_write_delivery_proof_object(uuid, text);