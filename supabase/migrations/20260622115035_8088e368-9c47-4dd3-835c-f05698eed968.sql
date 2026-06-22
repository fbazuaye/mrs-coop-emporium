
-- Status enum
CREATE TYPE public.order_status AS ENUM (
  'order_received',
  'approved',
  'processing',
  'packed',
  'assigned_rider',
  'picked_up',
  'out_for_delivery',
  'delivered',
  'cancelled'
);

CREATE TYPE public.order_payment_method AS ENUM ('pay_now', 'credit');

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.order_status NOT NULL DEFAULT 'order_received',
  payment_method public.order_payment_method NOT NULL DEFAULT 'pay_now',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  notes TEXT,
  assigned_rider_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  packed_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  out_for_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user ON public.orders (user_id, created_at DESC);
CREATE INDEX idx_orders_status ON public.orders (status, created_at DESC);
CREATE INDEX idx_orders_rider ON public.orders (assigned_rider_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'store_owner')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'fleet_manager')
    OR (public.has_role(auth.uid(), 'rider') AND auth.uid() = assigned_rider_id)
  );

CREATE POLICY "Members create own orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff update orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'store_owner')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'fleet_manager')
    OR (public.has_role(auth.uid(), 'rider') AND auth.uid() = assigned_rider_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'store_owner')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'fleet_manager')
    OR (public.has_role(auth.uid(), 'rider') AND auth.uid() = assigned_rider_id)
  );

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  image TEXT,
  emoji TEXT,
  gradient TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON public.order_items (order_id);

GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View items for accessible orders"
  ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        o.user_id = auth.uid()
        OR public.has_role(auth.uid(), 'store_owner')
        OR public.has_role(auth.uid(), 'super_admin')
        OR public.has_role(auth.uid(), 'fleet_manager')
        OR (public.has_role(auth.uid(), 'rider') AND o.assigned_rider_id = auth.uid())
      )
  ));

CREATE POLICY "Insert items for own orders"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
  ));

-- updated_at trigger
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- order_number generator + status timestamps + history + notification
CREATE OR REPLACE FUNCTION public.handle_order_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'MRS-' || to_char(now(), 'YYMMDD') || '-' || upper(substring(replace(NEW.id::text, '-', ''), 1, 6));
  END IF;
  NEW.status_history := jsonb_build_array(jsonb_build_object(
    'status', NEW.status,
    'at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ));
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_order_insert() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_orders_before_insert
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_order_insert();

CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_body TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    CASE NEW.status
      WHEN 'approved' THEN NEW.approved_at := now();
      WHEN 'processing' THEN NEW.processed_at := now();
      WHEN 'packed' THEN NEW.packed_at := now();
      WHEN 'assigned_rider' THEN NEW.assigned_at := now();
      WHEN 'picked_up' THEN NEW.picked_up_at := now();
      WHEN 'out_for_delivery' THEN NEW.out_for_delivery_at := now();
      WHEN 'delivered' THEN NEW.delivered_at := now();
      WHEN 'cancelled' THEN NEW.cancelled_at := now();
      ELSE NULL;
    END CASE;

    NEW.status_history := COALESCE(NEW.status_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'status', NEW.status,
      'at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ));

    v_title := 'Order ' || NEW.order_number || ' updated';
    v_body := 'Status: ' || replace(initcap(replace(NEW.status::text, '_', ' ')), ' ', ' ');

    INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
    VALUES (NEW.user_id, 'order_status', v_title, v_body, '/orders',
      jsonb_build_object('order_id', NEW.id, 'status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_order_status_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_orders_status_change
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_order_status_change();
