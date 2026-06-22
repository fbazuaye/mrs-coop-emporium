import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import {
  createProduct,
  updateProduct,
  uploadProductImage,
  deleteProductImage,
  setPrimaryImage,
  fetchCategories,
  type Category,
  type ProductWithImages,
  type ProductInput,
} from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Upload, Trash2, Star, ArrowLeft } from "lucide-react";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(160),
  sku: z.string().trim().min(2, "SKU is required").max(64),
  category_id: z.string().uuid().nullable(),
  description: z.string().trim().max(2000).nullable(),
  price: z.number().nonnegative("Price must be ≥ 0"),
  discount_price: z.number().nonnegative().nullable(),
  stock_quantity: z.number().int().nonnegative(),
  low_stock_threshold: z.number().int().nonnegative(),
  credit_eligible: z.boolean(),
  is_active: z.boolean(),
});

export function ProductForm({ product }: { product?: ProductWithImages }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState(product?.images ?? []);

  const [form, setForm] = useState<ProductInput>({
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    category_id: product?.category_id ?? null,
    description: product?.description ?? "",
    price: product?.price ?? 0,
    discount_price: product?.discount_price ?? null,
    stock_quantity: product?.stock_quantity ?? 0,
    low_stock_threshold: product?.low_stock_threshold ?? 10,
    credit_eligible: product?.credit_eligible ?? false,
    is_active: product?.is_active ?? true,
  });

  useEffect(() => {
    void fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const update = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSaving(true);
    try {
      if (product) {
        await updateProduct(product.id, parsed.data);
        toast.success("Product updated");
      } else {
        const created = await createProduct(parsed.data);
        toast.success("Product created");
        void navigate({ to: "/admin/products/$id", params: { id: created.id } });
        return;
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || !product) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const img = await uploadProductImage(product.id, file);
        setImages((prev) => [...prev, img]);
      }
      toast.success("Image uploaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Link to="/admin/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All products
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">Basic details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Product name</Label>
                <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" value={form.sku} onChange={(e) => update("sku", e.target.value)} required className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={form.category_id ?? ""}
                  onChange={(e) => update("category_id", e.target.value || null)}
                  className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="">Uncategorised</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={5}
                  value={form.description ?? ""}
                  onChange={(e) => update("description", e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">Pricing & inventory</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="price">Price (₦)</Label>
                <Input id="price" type="number" min={0} step="0.01" value={form.price} onChange={(e) => update("price", Number(e.target.value))} required className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="discount">Discount price (₦)</Label>
                <Input
                  id="discount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.discount_price ?? ""}
                  onChange={(e) => update("discount_price", e.target.value === "" ? null : Number(e.target.value))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="stock">Stock quantity</Label>
                <Input id="stock" type="number" min={0} value={form.stock_quantity} onChange={(e) => update("stock_quantity", Number(e.target.value))} required className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="threshold">Low-stock threshold</Label>
                <Input id="threshold" type="number" min={0} value={form.low_stock_threshold} onChange={(e) => update("low_stock_threshold", Number(e.target.value))} required className="mt-1.5" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">Visibility</h2>
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium">Active</div>
                <div className="text-xs text-muted-foreground">Shown on storefront</div>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => update("is_active", v)} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium">Credit eligible</div>
                <div className="text-xs text-muted-foreground">Members can buy on credit</div>
              </div>
              <Switch checked={form.credit_eligible} onCheckedChange={(v) => update("credit_eligible", v)} />
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
            <h2 className="mb-3 font-display text-lg font-semibold">Images</h2>
            {!product ? (
              <p className="text-sm text-muted-foreground">Save the product first to upload images.</p>
            ) : (
              <>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground transition hover:bg-muted/50">
                  <Upload className="h-5 w-5" />
                  {uploading ? "Uploading…" : "Click to upload images"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files)}
                  />
                </label>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {images.map((img) => (
                    <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                      {img.is_primary && (
                        <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">Primary</span>
                      )}
                      <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          title="Set primary"
                          onClick={async () => {
                            await setPrimaryImage(product.id, img.id);
                            setImages((p) => p.map((i) => ({ ...i, is_primary: i.id === img.id })));
                          }}
                          className="grid h-7 w-7 place-items-center rounded bg-background/90 text-foreground shadow"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={async () => {
                            await deleteProductImage(img);
                            setImages((p) => p.filter((i) => i.id !== img.id));
                          }}
                          className="grid h-7 w-7 place-items-center rounded bg-destructive text-destructive-foreground shadow"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Link to="/admin/products">
          <Button type="button" variant="outline">Cancel</Button>
        </Link>
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : product ? "Save changes" : "Create product"}</Button>
      </div>
    </form>
  );
}
