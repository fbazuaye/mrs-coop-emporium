import { Home, ShoppingBag, ShoppingCart, User } from "lucide-react";

export type NavItem = {
  to: "/" | "/shop" | "/cart" | "/account";
  label: string;
  icon: typeof Home;
};

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/shop", label: "Shop", icon: ShoppingBag },
  { to: "/cart", label: "Cart", icon: ShoppingCart },
  { to: "/account", label: "Account", icon: User },
];
