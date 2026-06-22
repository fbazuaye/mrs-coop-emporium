import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProductForm } from "@/components/admin/ProductForm";
import { fetchProduct, type ProductWithImages } from "@/lib/products";

export const Route = createFileRoute("/_authenticated/admin/products/$id")({
  component: EditProductPage,
});

function EditProductPage() {
  const { id } = Route.useParams();
  const [product, setProduct] = useState<ProductWithImages | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    fetchProduct(id)
      .then((p) => { if (active) setProduct(p); })
      .catch((e) => { toast.error(e instanceof Error ? e.message : "Load failed"); setProduct(null); });
    return () => { active = false; };
  }, [id]);

  if (product === undefined) return <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>;
  if (product === null) return (
    <div className="py-20 text-center">
      <p className="text-sm text-muted-foreground">Product not found.</p>
      <Link to="/admin/products" className="mt-3 inline-block text-sm font-semibold text-primary">Back to products</Link>
    </div>
  );
  return <ProductForm product={product} />;
}
