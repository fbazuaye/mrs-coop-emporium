
-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are publicly viewable"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Store owners manage categories - insert"
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'store_owner') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Store owners manage categories - update"
  ON public.categories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'store_owner') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'store_owner') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Store owners manage categories - delete"
  ON public.categories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'store_owner') OR public.has_role(auth.uid(),'super_admin'));

-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text NOT NULL UNIQUE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  description text,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  discount_price numeric(12,2) CHECK (discount_price IS NULL OR discount_price >= 0),
  stock_quantity int NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold int NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
  credit_eligible boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON public.products(category_id);
CREATE INDEX products_active_idx ON public.products(is_active);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active products are publicly viewable"
  ON public.products FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(),'store_owner') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Store owners insert products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'store_owner') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Store owners update products"
  ON public.products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'store_owner') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'store_owner') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Store owners delete products"
  ON public.products FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'store_owner') OR public.has_role(auth.uid(),'super_admin'));

-- PRODUCT IMAGES
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url text NOT NULL,
  storage_path text,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_images_product_idx ON public.product_images(product_id);
GRANT SELECT ON public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product images are publicly viewable"
  ON public.product_images FOR SELECT USING (true);

CREATE POLICY "Store owners insert product images"
  ON public.product_images FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'store_owner') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Store owners update product images"
  ON public.product_images FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'store_owner') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'store_owner') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "Store owners delete product images"
  ON public.product_images FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'store_owner') OR public.has_role(auth.uid(),'super_admin'));

-- updated_at triggers
CREATE TRIGGER trg_categories_updated
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial categories (matches storefront)
INSERT INTO public.categories (slug, name, icon, sort_order) VALUES
  ('groceries','Groceries','Apple',1),
  ('beverages','Beverages','CupSoda',2),
  ('electronics','Electronics','Laptop',3),
  ('household','Household','Home',4),
  ('agro','Agro Products','Sprout',5),
  ('pharmacy','Pharmacy','Pill',6),
  ('personal-care','Personal Care','Sparkles',7)
ON CONFLICT (slug) DO NOTHING;
