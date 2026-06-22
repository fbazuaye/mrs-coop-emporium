
CREATE TYPE public.rider_status AS ENUM ('available', 'on_delivery', 'off_duty', 'suspended');
CREATE TYPE public.vehicle_type AS ENUM ('motorcycle', 'bicycle', 'car', 'van');

CREATE TABLE public.riders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_type public.vehicle_type NOT NULL DEFAULT 'motorcycle',
  plate_number TEXT,
  zone TEXT,
  status public.rider_status NOT NULL DEFAULT 'available',
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.00,
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.riders TO authenticated;
GRANT ALL ON public.riders TO service_role;

ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fleet staff can view all riders" ON public.riders FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'fleet_manager') OR
  public.has_role(auth.uid(), 'store_owner') OR
  public.has_role(auth.uid(), 'super_admin') OR
  auth.uid() = user_id
);

CREATE POLICY "Fleet managers can insert riders" ON public.riders FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'fleet_manager') OR
  public.has_role(auth.uid(), 'store_owner') OR
  public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Fleet managers can update riders" ON public.riders FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'fleet_manager') OR
  public.has_role(auth.uid(), 'store_owner') OR
  public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Fleet managers can delete riders" ON public.riders FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'fleet_manager') OR
  public.has_role(auth.uid(), 'super_admin')
);

CREATE TRIGGER update_riders_updated_at BEFORE UPDATE ON public.riders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_riders_status ON public.riders(status);
CREATE INDEX idx_riders_user_id ON public.riders(user_id);
