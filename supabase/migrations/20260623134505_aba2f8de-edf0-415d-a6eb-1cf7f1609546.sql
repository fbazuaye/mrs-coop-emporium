ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_distance_m INTEGER,
  ADD COLUMN IF NOT EXISTS delivery_duration_s INTEGER;