
-- live session status enum
DO $$ BEGIN
  CREATE TYPE public.live_status AS ENUM ('scheduled','live','ended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.live_message_kind AS ENUM ('chat','system','purchase');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- live_sessions
CREATE TABLE IF NOT EXISTS public.live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  host_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  host_name TEXT,
  stream_url TEXT,
  thumbnail_url TEXT,
  status public.live_status NOT NULL DEFAULT 'scheduled',
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  viewer_peak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.live_sessions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.live_sessions TO authenticated;
GRANT ALL ON public.live_sessions TO service_role;

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live sessions" ON public.live_sessions
  FOR SELECT USING (true);
CREATE POLICY "Admins can create live sessions" ON public.live_sessions
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(),'store_owner') OR public.has_role(auth.uid(),'super_admin')
  );
CREATE POLICY "Admins can update live sessions" ON public.live_sessions
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(),'store_owner') OR public.has_role(auth.uid(),'super_admin')
  );
CREATE POLICY "Admins can delete live sessions" ON public.live_sessions
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(),'store_owner') OR public.has_role(auth.uid(),'super_admin')
  );

CREATE TRIGGER update_live_sessions_updated_at
  BEFORE UPDATE ON public.live_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- live_session_products
CREATE TABLE IF NOT EXISTS public.live_session_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  live_price NUMERIC(12,2),
  is_spotlight BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, product_id)
);

GRANT SELECT ON public.live_session_products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.live_session_products TO authenticated;
GRANT ALL ON public.live_session_products TO service_role;

ALTER TABLE public.live_session_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live products" ON public.live_session_products
  FOR SELECT USING (true);
CREATE POLICY "Admins manage live products" ON public.live_session_products
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(),'store_owner') OR public.has_role(auth.uid(),'super_admin')
  ) WITH CHECK (
    public.has_role(auth.uid(),'store_owner') OR public.has_role(auth.uid(),'super_admin')
  );

-- live_messages
CREATE TABLE IF NOT EXISTS public.live_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  content TEXT NOT NULL,
  kind public.live_message_kind NOT NULL DEFAULT 'chat',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.live_messages TO anon, authenticated;
GRANT INSERT ON public.live_messages TO authenticated;
GRANT UPDATE, DELETE ON public.live_messages TO authenticated;
GRANT ALL ON public.live_messages TO service_role;

ALTER TABLE public.live_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read live messages" ON public.live_messages
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can post messages" ON public.live_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own messages" ON public.live_messages
  FOR DELETE TO authenticated USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(),'store_owner')
    OR public.has_role(auth.uid(),'super_admin')
  );

CREATE INDEX IF NOT EXISTS idx_live_messages_session ON public.live_messages(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_session_products_session ON public.live_session_products(session_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON public.live_sessions(status, created_at DESC);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_products;
