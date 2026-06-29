import { redirect } from "next/navigation";

export default function OrdersAliasPage() {
  redirect("/mypage?tab=orders");
}
