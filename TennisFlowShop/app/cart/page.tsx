import type { Metadata } from "next";

import CartPageClient from "@/app/cart/CartPageClient";

export const metadata: Metadata = {
  title: "장바구니",
};

export default function CartPage() {
  return <CartPageClient />;
}
