import { supabase } from "@/integrations/supabase/client";

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  storage_path: string | null;
  is_primary: boolean;
  sort_order: number;
};

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  category_id: string | null;
  description: string | null;
  price: number;
  discount_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  credit_eligible: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductWithImages = ProductRow & {
  images: ProductImage[];
  category: Pick<Category, "id" | "name" | "slug"> | null;
};

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function fetchProducts(): Promise<ProductWithImages[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, images:product_images(*), category:categories(id,name,slug)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ProductWithImages[];
}

export async function fetchProduct(id: string): Promise<ProductWithImages | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*, images:product_images(*), category:categories(id,name,slug)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ProductWithImages) ?? null;
}

export type ProductInput = {
  name: string;
  sku: string;
  category_id: string | null;
  description: string | null;
  price: number;
  discount_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  credit_eligible: boolean;
  is_active: boolean;
};

export async function createProduct(input: ProductInput) {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("products")
    .insert({ ...input, created_by: u.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, input: ProductInput) {
  const { error } = await supabase.from("products").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadProductImage(productId: string, file: File) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${productId}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage
    .from("product-images")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (up.error) throw up.error;
  const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
  const { data, error } = await supabase
    .from("product_images")
    .insert({
      product_id: productId,
      url: pub.publicUrl,
      storage_path: path,
      is_primary: false,
      sort_order: 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ProductImage;
}

export async function deleteProductImage(image: ProductImage) {
  if (image.storage_path) {
    await supabase.storage.from("product-images").remove([image.storage_path]);
  }
  const { error } = await supabase.from("product_images").delete().eq("id", image.id);
  if (error) throw error;
}

export async function setPrimaryImage(productId: string, imageId: string) {
  await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);
  const { error } = await supabase
    .from("product_images")
    .update({ is_primary: true })
    .eq("id", imageId);
  if (error) throw error;
}

export type CategoryInput = {
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
};

export async function createCategory(input: CategoryInput) {
  const { error } = await supabase.from("categories").insert(input);
  if (error) throw error;
}

export async function updateCategory(id: string, input: Partial<CategoryInput>) {
  const { error } = await supabase.from("categories").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}
