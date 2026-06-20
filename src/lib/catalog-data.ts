import type { LucideIcon } from "lucide-react";
import {
  Apple,
  CupSoda,
  Laptop,
  Home,
  Sprout,
  Pill,
  Sparkles,
} from "lucide-react";

export type Category = {
  slug: string;
  name: string;
  icon: LucideIcon;
  tint: string;
  image?: string;
};

export const CATEGORIES: Category[] = [
  { slug: "groceries", name: "Groceries", icon: Apple, tint: "from-rose-500/15 to-rose-500/5" },
  { slug: "beverages", name: "Beverages", icon: CupSoda, tint: "from-amber-500/15 to-amber-500/5" },
  { slug: "electronics", name: "Electronics", icon: Laptop, tint: "from-sky-500/15 to-sky-500/5" },
  { slug: "household", name: "Household", icon: Home, tint: "from-emerald-500/15 to-emerald-500/5" },
  { slug: "agro", name: "Agro Products", icon: Sprout, tint: "from-lime-500/15 to-lime-500/5", image: "/__l5e/assets-v1/1ca8c622-a2cb-4329-b885-5754e97d89e3/agro-category.png" },
  { slug: "pharmacy", name: "Pharmacy", icon: Pill, tint: "from-violet-500/15 to-violet-500/5" },
  { slug: "personal-care", name: "Personal Care", icon: Sparkles, tint: "from-pink-500/15 to-pink-500/5" },
];

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  prevPrice?: number;
  rating: number;
  reviews: number;
  badge?: string;
  emoji: string;
  gradient: string;
};

const formatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export const formatPrice = (value: number) => formatter.format(value);

export const FLASH_DEALS: Product[] = [
  { id: "fd-1", name: "Golden Penny Spaghetti 500g", category: "Groceries", price: 1200, prevPrice: 1800, rating: 4.7, reviews: 312, badge: "-33%", emoji: "🍝", gradient: "from-amber-400/30 to-rose-400/20" },
  { id: "fd-2", name: "Indomie Chicken Pack of 40", category: "Groceries", price: 9500, prevPrice: 13500, rating: 4.8, reviews: 540, badge: "-30%", emoji: "🍜", gradient: "from-red-400/30 to-orange-300/20" },
  { id: "fd-3", name: "Peak Milk Powder 900g", category: "Groceries", price: 7200, prevPrice: 9800, rating: 4.9, reviews: 211, badge: "-27%", emoji: "🥛", gradient: "from-sky-400/30 to-indigo-300/20" },
  { id: "fd-4", name: "Power Oil 5 Litres", category: "Groceries", price: 14500, prevPrice: 19000, rating: 4.6, reviews: 178, badge: "-24%", emoji: "🫒", gradient: "from-lime-400/30 to-emerald-300/20" },
  { id: "fd-5", name: "Cowbell Choco 1kg", category: "Beverages", price: 4900, prevPrice: 6500, rating: 4.5, reviews: 96, badge: "-25%", emoji: "🍫", gradient: "from-amber-700/25 to-orange-400/20" },
];

export const FEATURED: Product[] = [
  { id: "ft-1", name: "Hisense 43\" Smart TV", category: "Electronics", price: 285000, rating: 4.8, reviews: 412, badge: "New", emoji: "📺", gradient: "from-slate-400/30 to-slate-700/20" },
  { id: "ft-2", name: "Hypo Bleach 1L (Pack of 6)", category: "Household", price: 6500, rating: 4.6, reviews: 88, emoji: "🧴", gradient: "from-cyan-400/30 to-blue-300/20" },
  { id: "ft-3", name: "Dano UHT Milk 1L x12", category: "Beverages", price: 13800, rating: 4.7, reviews: 156, emoji: "🥛", gradient: "from-blue-400/30 to-indigo-300/20" },
  { id: "ft-4", name: "NPK Fertilizer 50kg", category: "Agro", price: 42000, rating: 4.9, reviews: 64, badge: "Bulk", emoji: "🌾", gradient: "from-green-500/30 to-lime-300/20" },
];

export const TOP_SELLING: Product[] = [
  { id: "ts-1", name: "Royal Stallion Rice 50kg", category: "Groceries", price: 78000, prevPrice: 85000, rating: 4.9, reviews: 980, badge: "#1", emoji: "🍚", gradient: "from-yellow-300/30 to-amber-300/20" },
  { id: "ts-2", name: "Coca-Cola PET 50cl x12", category: "Beverages", price: 4500, rating: 4.8, reviews: 720, emoji: "🥤", gradient: "from-red-500/30 to-rose-400/20" },
  { id: "ts-3", name: "Dettol Antiseptic 750ml", category: "Pharmacy", price: 5200, rating: 4.7, reviews: 612, emoji: "🧪", gradient: "from-emerald-500/30 to-teal-300/20" },
  { id: "ts-4", name: "Always Ultra Pads x16", category: "Personal Care", price: 2800, rating: 4.8, reviews: 433, emoji: "🌸", gradient: "from-pink-400/30 to-rose-300/20" },
];

export const RECENTLY_ADDED: Product[] = [
  { id: "ra-1", name: "Oraimo Power Bank 20000mAh", category: "Electronics", price: 18500, rating: 4.6, reviews: 22, badge: "New", emoji: "🔋", gradient: "from-zinc-500/30 to-slate-400/20" },
  { id: "ra-2", name: "Mama Gold Rice 25kg", category: "Groceries", price: 42000, rating: 4.5, reviews: 14, badge: "New", emoji: "🌾", gradient: "from-amber-400/30 to-yellow-300/20" },
  { id: "ra-3", name: "Eva Bottled Water x12", category: "Beverages", price: 2400, rating: 4.4, reviews: 9, badge: "New", emoji: "💧", gradient: "from-sky-400/30 to-cyan-300/20" },
  { id: "ra-4", name: "Lipton Yellow Label 100s", category: "Beverages", price: 3800, rating: 4.6, reviews: 18, badge: "New", emoji: "🍵", gradient: "from-yellow-400/30 to-amber-300/20" },
];
