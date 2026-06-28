
CREATE OR REPLACE FUNCTION app_private.can_manage_store_media(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_private.has_role(_user_id, 'store_owner'::public.app_role)
      OR app_private.has_role(_user_id, 'super_admin'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION app_private.can_manage_delivery_media(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_private.has_role(_user_id, 'store_owner'::public.app_role)
      OR app_private.has_role(_user_id, 'super_admin'::public.app_role)
      OR app_private.has_role(_user_id, 'fleet_manager'::public.app_role);
$$;
