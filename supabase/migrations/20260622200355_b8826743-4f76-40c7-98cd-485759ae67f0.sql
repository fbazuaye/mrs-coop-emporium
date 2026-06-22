
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
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
SECURITY DEFINER
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
